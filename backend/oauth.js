const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET || 'deinGeheimerJWTKey';
const router = express.Router();

// Hilfsfunktion zum Suchen/Erstellen von Benutzern
async function findOrCreateUser(provider, oauthId, email, name) {
  // Zuerst nach OAuth-ID oder E-Mail suchen
  const findUserQuery = `
    SELECT * FROM "User" 
    WHERE (oauth_provider = $1 AND oauth_id = $2) OR email = $3
  `;
  let { rows } = await db.query(findUserQuery, [provider, oauthId, email]);
  let user = rows[0];

  if (user) {
    // User gefunden, prüfe ob Update nötig ist
    if (!user.oauth_id || user.oauth_provider !== provider) {
      const updateUserQuery = `
        UPDATE "User" 
        SET oauth_provider = $1, oauth_id = $2, name = $3 
        WHERE id = $4 
        RETURNING *
      `;
      const updatedResult = await db.query(updateUserQuery, [provider, oauthId, name || user.name, user.id]);
      user = updatedResult.rows[0];
    }
  } else {
    // User nicht gefunden, neu erstellen
    const insertUserQuery = `
      INSERT INTO "User" (email, name, oauth_provider, oauth_id, tenant_id, role, status, has_set_password) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;
    const newUserResult = await db.query(insertUserQuery, [
      email,
      name,
      provider,
      oauthId,
      1, // Default tenant_id
      'customer',
      'active',
      false
    ]);
    user = newUserResult.rows[0];
  }
  return user;
}

// OAuth-Status prüfen
router.get('/oauth-status', async (req, res) => {
  const { email, provider } = req.query;

  try {
    if (!email || !provider) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'E-Mail und Provider sind erforderlich'
      });
    }

    const user = await db.query(`
      SELECT * FROM "User" 
      WHERE email = $1 AND oauth_provider = $2
    `, [email, provider]);

    res.json({
      success: true,
      exists: !!user.rows[0],
      hasSetPassword: user.rows[0]?.has_set_password || false
    });

  } catch (err) {
    console.error('OAuth-Status-Fehler:', err);
    res.status(500).json({ 
      error: 'server_error',
      message: 'Serverfehler beim Prüfen des OAuth-Status' 
    });
  }
});

// Google OAuth-Initiierung
router.get('/google', (req, res) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!googleClientId || !redirectUri) {
    console.error('Google OAuth ist nicht korrekt konfiguriert!');
    return res.status(500).json({
      error: 'configuration_error',
      message: 'Google OAuth ist nicht korrekt konfiguriert (ClientID oder RedirectURI fehlt)'
    });
  }
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${googleClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=email profile&` +
    `access_type=offline&` +
    `prompt=consent`;
  res.redirect(googleAuthUrl);
});

// Google OAuth-Callback
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'https://revalenz.de';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    console.error('GOOGLE_REDIRECT_URI ist nicht gesetzt!');
    return res.status(500).json({ error: 'configuration_error', message: 'FRONTEND_URL oder GOOGLE_REDIRECT_URI fehlt' });
  }
  if (error) {
    console.error('Google OAuth-Fehler:', error);
    return res.redirect(`${frontendUrl}/support-portal?error=oauth_error`);
  }
  if (!code) {
    return res.redirect(`${frontendUrl}/support-portal?error=no_code`);
  }
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Kein Access Token erhalten');
    }

    // Get user info from Google
    const userResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`);
    const userData = await userResponse.json();

    if (!userData.email) {
      throw new Error('Keine E-Mail von Google erhalten');
    }

    // User suchen oder erstellen mit der Hilfsfunktion
    const user = await findOrCreateUser('google', userData.id, userData.email, userData.name);

    // JWT-Token erstellen
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        email: user.email,
        oauthProvider: user.oauth_provider,
        hasSetPassword: user.has_set_password
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Redirect zum Frontend mit Token (Pfad angepasst für Hash-Routing)
    res.redirect(`${frontendUrl}/support-portal/auth/status#?token=${token}&login=success`);

  } catch (err) {
    console.error('Google OAuth-Callback-Fehler:', err);
    res.redirect(`${frontendUrl}/support-portal?error=oauth_callback_error`);
  }
});

// GitHub OAuth-Initiierung
router.get('/github', (req, res) => {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';
  
  if (!githubClientId) {
    return res.status(500).json({
      error: 'configuration_error',
      message: 'GitHub OAuth ist nicht konfiguriert'
    });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${githubClientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=user:email`;

  res.redirect(githubAuthUrl);
});

// GitHub OAuth-Callback
router.get('/github/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'https://revalenz.de';

  console.log('GITHUB_CALLBACK: Gestartet.');

  if (error) {
    console.error('GITHUB_CALLBACK_ERROR: Fehler von GitHub erhalten:', error);
    return res.redirect(`${frontendUrl}/auth/status?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('GITHUB_CALLBACK_ERROR: Kein Code von GitHub erhalten.');
    return res.redirect(`${frontendUrl}/auth/status?error=no_code_from_github`);
  }

  console.log('GITHUB_CALLBACK: Code erhalten, tausche gegen Access Token...');

  try {
    // Schritt 1: Code gegen Access Token tauschen
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('GITHUB_CALLBACK: Antwort vom Token-Endpunkt erhalten.');

    if (tokenData.error || !tokenData.access_token) {
      console.error('GITHUB_CALLBACK_ERROR: Fehler beim Tausch des Tokens:', tokenData.error || 'Kein Access Token erhalten.');
      throw new Error(tokenData.error_description || 'Fehler beim Erhalt des Access Tokens von GitHub.');
    }

    const accessToken = tokenData.access_token;
    console.log('GITHUB_CALLBACK: Access Token erfolgreich erhalten.');

    // Schritt 2: Benutzerdaten von GitHub abrufen
    console.log('GITHUB_CALLBACK: Rufe Benutzerdaten von GitHub ab...');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });
    const userData = await userResponse.json();

    if (!userData.email) {
      // Fallback: Private E-Mails abrufen, wenn die primäre nicht öffentlich ist
      console.log('GITHUB_CALLBACK: Primäre E-Mail nicht öffentlich, versuche private E-Mails abzurufen...');
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
      const emailsData = await emailsResponse.json();
      const primaryEmail = emailsData.find(email => email.primary && email.verified);
      
      if (!primaryEmail) {
        console.error('GITHUB_CALLBACK_ERROR: Keine verifizierte primäre E-Mail bei GitHub gefunden.');
        throw new Error('Keine verifizierte primäre E-Mail bei GitHub gefunden.');
      }
      userData.email = primaryEmail.email;
    }
    
    console.log(`GITHUB_CALLBACK: Benutzerdaten erhalten für E-Mail: ${userData.email}`);

    // Schritt 3: Benutzer in der DB suchen oder erstellen
    console.log('GITHUB_CALLBACK: Suche oder erstelle Benutzer in der Datenbank...');
    const user = await findOrCreateUser('github', String(userData.id), userData.email, userData.name || userData.login);

    // Schritt 4: JWT-Token erstellen
    console.log('GITHUB_CALLBACK: Erstelle JWT...');
    const token = jwt.sign({ userId: user.id, tenantId: user.tenant_id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    // Schritt 5: Zum Frontend weiterleiten (Pfad angepasst für Hash-Routing)
    const redirectUrl = `${frontendUrl}/support-portal/auth/status#?token=${token}`;
    console.log(`GITHUB_CALLBACK: Erfolgreich! Leite weiter zu: ${redirectUrl}`);
    res.redirect(redirectUrl);

  } catch (err) {
    console.error('GITHUB_CALLBACK_FATAL_ERROR: Ein unerwarteter Fehler ist im try-catch-Block aufgetreten:', err);
    return res.redirect(`${frontendUrl}/auth/status?error=oauth_callback_error`);
  }
});

module.exports = router; 