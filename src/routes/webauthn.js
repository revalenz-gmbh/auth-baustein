/**
 * WebAuthn/FIDO2 Biometrische Authentifizierung
 * 
 * Unterstützt:
 * - Fingerabdruck (Touch ID, Windows Hello Fingerprint)
 * - Gesichtserkennung (Face ID, Windows Hello Face)
 * - Hardware-Sicherheitsschlüssel (YubiKey, etc.)
 * 
 * Standard: W3C WebAuthn + FIDO2 (souverän, kein Vendor-Lock-in)
 */

import express from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// ============================================================================
// KONFIGURATION
// ============================================================================

const rpName = 'Revalenz GmbH';
const rpID = process.env.WEBAUTHN_RP_ID || 'revalenz.de';
const origin = process.env.WEBAUTHN_ORIGIN || 'https://www.revalenz.de';

console.log(`[WebAuthn] Configured: RP ID=${rpID}, Origin=${origin}`);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Speichert eine Challenge in der DB (5 Minuten gültig)
 */
async function saveChallenge(userId, email, challenge, type) {
  await query(
    `INSERT INTO webauthn_challenges (user_id, email, challenge, type, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '5 minutes')`,
    [userId || null, email || null, challenge, type]
  );
}

/**
 * Holt und löscht Challenge aus DB
 */
async function getAndDeleteChallenge(userId, email, type) {
  const result = await query(
    `DELETE FROM webauthn_challenges 
     WHERE (user_id = $1 OR email = $2)
       AND type = $3
       AND expires_at > NOW()
     RETURNING challenge`,
    [userId || null, email || null, type]
  );
  
  return result.rows[0]?.challenge || null;
}

/**
 * Speichert WebAuthn Credential
 */
async function saveCredential(userId, credentialData) {
  await query(
    `INSERT INTO webauthn_credentials (
      user_id,
      credential_id,
      credential_public_key,
      counter,
      transports,
      aaguid,
      credential_device_type,
      credential_backed_up,
      nickname
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      userId,
      credentialData.credentialID,
      credentialData.credentialPublicKey,
      credentialData.counter,
      credentialData.transports || [],
      credentialData.aaguid || null,
      credentialData.credentialDeviceType || null,
      credentialData.credentialBackedUp || false,
      credentialData.nickname || null,
    ]
  );
}

/**
 * Holt User-Credentials
 */
async function getUserCredentials(userId) {
  const result = await query(
    `SELECT 
      credential_id,
      credential_public_key,
      counter,
      transports,
      nickname
     FROM webauthn_credentials
     WHERE user_id = $1`,
    [userId]
  );
  
  return result.rows;
}

/**
 * Aktualisiert Counter (Replay-Schutz)
 */
async function updateCredentialCounter(credentialId, newCounter) {
  await query(
    `UPDATE webauthn_credentials 
     SET counter = $1, last_used_at = NOW()
     WHERE credential_id = $2`,
    [newCounter, credentialId]
  );
}

// ============================================================================
// POST /api/auth/webauthn/register/options
// Generiert WebAuthn Registration Options
// ============================================================================
router.post('/register/options', authenticate, async (req, res) => {
  try {
    const userId = req.user.sub;
    
    // User-Info aus DB holen
    const userResult = await query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    const user = userResult.rows[0];
    
    // Bestehende Credentials holen (für excludeCredentials)
    const existingCredentials = await getUserCredentials(userId);
    
    // Registration Options generieren
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: String(userId),
      userName: user.email,
      userDisplayName: user.name || user.email,
      
      // Verhindere Doppel-Registrierung desselben Authenticators
      excludeCredentials: existingCredentials.map(cred => ({
        id: Buffer.from(cred.credential_id, 'base64'),
        type: 'public-key',
        transports: cred.transports || ['internal'],
      })),
      
      // Authenticator-Auswahl
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // 'platform' = eingebaut (Touch ID, Face ID)
        residentKey: 'preferred', // Resident Key für passwortlosen Login
        userVerification: 'preferred', // Biometrie bevorzugt
      },
      
      attestationType: 'none', // Keine Attestierung nötig (Privacy!)
    });
    
    // Challenge speichern
    await saveChallenge(userId, null, options.challenge, 'registration');
    
    console.log(`[WebAuthn] Registration options generated for user ${userId}`);
    
    res.json(options);
  } catch (error) {
    console.error('[WebAuthn] Error generating registration options:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate registration options' }
    });
  }
});

// ============================================================================
// POST /api/auth/webauthn/register/verify
// Verifiziert WebAuthn Registration Response
// ============================================================================
router.post('/register/verify', authenticate, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { credential, nickname } = req.body;
    
    if (!credential) {
      return res.status(400).json({
        error: { code: 'MISSING_CREDENTIAL', message: 'Credential is required' }
      });
    }
    
    // Challenge aus DB holen
    const expectedChallenge = await getAndDeleteChallenge(userId, null, 'registration');
    
    if (!expectedChallenge) {
      return res.status(400).json({
        error: { code: 'INVALID_CHALLENGE', message: 'Challenge expired or not found' }
      });
    }
    
    // Credential verifizieren
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({
        error: { code: 'VERIFICATION_FAILED', message: 'Credential verification failed' }
      });
    }
    
    const { registrationInfo } = verification;
    
    // Credential in DB speichern
    await saveCredential(userId, {
      credentialID: Buffer.from(registrationInfo.credentialID).toString('base64'),
      credentialPublicKey: registrationInfo.credentialPublicKey,
      counter: registrationInfo.counter,
      transports: credential.response.transports,
      aaguid: registrationInfo.aaguid,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
      nickname: nickname || null,
    });
    
    console.log(`[WebAuthn] Credential registered for user ${userId}`);
    
    res.json({
      success: true,
      message: 'Biometric authentication enabled successfully',
    });
  } catch (error) {
    console.error('[WebAuthn] Error verifying registration:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify registration' }
    });
  }
});

// ============================================================================
// POST /api/auth/webauthn/login/options
// Generiert WebAuthn Authentication Options
// ============================================================================
router.post('/login/options', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: { code: 'MISSING_EMAIL', message: 'Email is required' }
      });
    }
    
    // User suchen
    const userResult = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    const user = userResult.rows[0];
    
    // Credentials holen
    const credentials = await getUserCredentials(user.id);
    
    if (credentials.length === 0) {
      return res.status(400).json({
        error: { 
          code: 'NO_CREDENTIALS', 
          message: 'No biometric credentials registered. Please register first.' 
        }
      });
    }
    
    // Authentication Options generieren
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map(cred => ({
        id: Buffer.from(cred.credential_id, 'base64'),
        type: 'public-key',
        transports: cred.transports || ['internal'],
      })),
      userVerification: 'preferred',
    });
    
    // Challenge speichern
    await saveChallenge(user.id, email, options.challenge, 'authentication');
    
    console.log(`[WebAuthn] Authentication options generated for user ${user.id}`);
    
    res.json(options);
  } catch (error) {
    console.error('[WebAuthn] Error generating authentication options:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate authentication options' }
    });
  }
});

// ============================================================================
// POST /api/auth/webauthn/login/verify
// Verifiziert WebAuthn Authentication Response
// ============================================================================
router.post('/login/verify', async (req, res) => {
  try {
    const { email, credential } = req.body;
    
    if (!email || !credential) {
      return res.status(400).json({
        error: { code: 'MISSING_DATA', message: 'Email and credential are required' }
      });
    }
    
    // User suchen
    const userResult = await query(
      'SELECT id, email, name, role, status FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    const user = userResult.rows[0];
    
    // Challenge aus DB holen
    const expectedChallenge = await getAndDeleteChallenge(user.id, email, 'authentication');
    
    if (!expectedChallenge) {
      return res.status(400).json({
        error: { code: 'INVALID_CHALLENGE', message: 'Challenge expired or not found' }
      });
    }
    
    // Credential aus DB holen
    const credentialId = Buffer.from(credential.rawId, 'base64').toString('base64');
    const credentialResult = await query(
      `SELECT credential_id, credential_public_key, counter
       FROM webauthn_credentials
       WHERE user_id = $1 AND credential_id = $2`,
      [user.id, credentialId]
    );
    
    if (credentialResult.rows.length === 0) {
      return res.status(400).json({
        error: { code: 'CREDENTIAL_NOT_FOUND', message: 'Credential not found' }
      });
    }
    
    const storedCredential = credentialResult.rows[0];
    
    // Credential verifizieren
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(storedCredential.credential_id, 'base64'),
        credentialPublicKey: storedCredential.credential_public_key,
        counter: parseInt(storedCredential.counter),
      },
      requireUserVerification: true,
    });
    
    if (!verification.verified) {
      return res.status(401).json({
        error: { code: 'AUTHENTICATION_FAILED', message: 'Authentication failed' }
      });
    }
    
    // Counter aktualisieren (Replay-Schutz)
    await updateCredentialCounter(credentialId, verification.authenticationInfo.newCounter);
    
    // JWT Token erstellen
    const token = jwt.sign(
      {
        sub: String(user.id),
        email: user.email,
        name: user.name,
        roles: [user.role.toLowerCase()],
        tenants: [], // TODO: Load tenants if needed
      },
      process.env.AUTH_JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    console.log(`[WebAuthn] User ${user.id} logged in successfully`);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('[WebAuthn] Error verifying authentication:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify authentication' }
    });
  }
});

// ============================================================================
// GET /api/auth/webauthn/credentials
// Listet registrierte Credentials des eingeloggten Users
// ============================================================================
router.get('/credentials', authenticate, async (req, res) => {
  try {
    const userId = req.user.sub;
    
    const result = await query(
      `SELECT 
        credential_id,
        nickname,
        credential_device_type,
        transports,
        last_used_at,
        created_at
       FROM webauthn_credentials
       WHERE user_id = $1
       ORDER BY last_used_at DESC NULLS LAST, created_at DESC`,
      [userId]
    );
    
    res.json({
      credentials: result.rows.map(cred => ({
        id: cred.credential_id,
        nickname: cred.nickname || 'Unbenanntes Gerät',
        deviceType: cred.credential_device_type,
        transports: cred.transports,
        lastUsed: cred.last_used_at,
        createdAt: cred.created_at,
      })),
    });
  } catch (error) {
    console.error('[WebAuthn] Error fetching credentials:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch credentials' }
    });
  }
});

// ============================================================================
// DELETE /api/auth/webauthn/credentials/:credentialId
// Löscht ein registriertes Credential
// ============================================================================
router.delete('/credentials/:credentialId', authenticate, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { credentialId } = req.params;
    
    const result = await query(
      'DELETE FROM webauthn_credentials WHERE user_id = $1 AND credential_id = $2 RETURNING id',
      [userId, credentialId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Credential not found' }
      });
    }
    
    console.log(`[WebAuthn] Credential deleted for user ${userId}`);
    
    res.json({ success: true, message: 'Credential deleted successfully' });
  } catch (error) {
    console.error('[WebAuthn] Error deleting credential:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete credential' }
    });
  }
});

export default router;

