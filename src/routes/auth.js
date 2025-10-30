import express from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../utils/db.js';
import { getValidatedRedirectUrl } from '../utils/redirect.js';

const router = express.Router();
// Basic input validation (lightweight, no extra deps)
function isSafeStateParam(value) {
  if (typeof value !== 'string') return false;
  if (value.length === 0) return false;
  if (value.length > 4000) return false; // guard against abuse
  // allow base64url charset only
  return /^[A-Za-z0-9_\-]+=*$/.test(value);
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchTenantsForUser(userId) {
  try {
    const r = await query(
      'SELECT t.id, t.name FROM tenant_admins ta JOIN tenants t ON ta.tenant_id = t.id WHERE ta.admin_id = $1',
      [userId]
    );
    return r.rows || [];
  } catch {
    return [];
  }
}

function signToken(user, tenants) {
  const tenantIds = (tenants || []).map(t => String(t.id));
  return jwt.sign(
    { 
      sub: String(user.id), 
      email: user.email, 
      roles: [user.role.toLowerCase()], 
      tenants: tenantIds 
    },
    process.env.AUTH_JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } // Von 1h auf 24h erhöht für bessere UX
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    process.env.AUTH_REFRESH_SECRET || process.env.AUTH_JWT_SECRET,
    { expiresIn: process.env.AUTH_REFRESH_EXPIRES || '30d' }
  );
}

function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.AUTH_COOKIE_DOMAIN || '.revalenz.de';
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    path: '/auth',
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
}

function clearRefreshCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.AUTH_COOKIE_DOMAIN || '.revalenz.de';
  res.cookie('refresh_token', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    path: '/auth',
    maxAge: 0
  });
}

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    
    const result = await query('SELECT id, email, name, role, status FROM users WHERE id = $1', [payload.sub]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Refresh access token using httpOnly cookie
router.post('/refresh', async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));
    const refresh = cookies['refresh_token'];
    if (!refresh) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    let payload;
    try {
      payload = jwt.verify(refresh, process.env.AUTH_REFRESH_SECRET || process.env.AUTH_JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const r = await query('SELECT id, email, name, role FROM users WHERE id = $1', [payload.sub]);
    const user = r.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const tenants = await fetchTenantsForUser(user.id);
    const token = signToken(user, tenants);
    const newRefresh = signRefreshToken(user);
    setRefreshCookie(res, newRefresh);

    console.log('[AUDIT] refresh_success', { userId: String(user.id) });
    return res.json({ success: true, token });
  } catch (e) {
    console.error('[AUDIT] refresh_error', e?.message || e);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

// Login with API Key (for automated systems)
router.post('/login', async (req, res) => {
  try {
    const { api_key } = req.body || {};
    
    if (!api_key) {
      return res.status(400).json({ 
        success: false, 
        message: 'API-Key erforderlich. Für User-Login bitte OAuth verwenden (Google, GitHub, Microsoft).' 
      });
    }

    const r = await query('SELECT * FROM users WHERE api_key = $1', [api_key]);
    const user = r.rows[0];
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }

    const tenants = await fetchTenantsForUser(user.id);
    const token = signToken(user, tenants);
    const refresh = signRefreshToken(user);
    setRefreshCookie(res, refresh);
    
    console.log('[AUDIT] api_login_success', { userId: String(user.id) });
    return res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id,
        email: user.email,
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (e) {
    console.error('[AUDIT] api_login_error', e?.message || e);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ============================================================================
// OAUTH ENDPOINTS - GOOGLE
// ============================================================================

router.get('/oauth/google', (req, res) => {
  const { state } = req.query;
  if (state && !isSafeStateParam(state)) {
    return res.status(400).json({ success: false, message: 'Invalid state parameter' });
  }
  const backendUrl = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${backendUrl}/api/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',  // UX-Verbesserung: Account-Auswahl, kein Consent bei wiederholtem Login
    access_type: 'online',      // Kein Refresh Token = weniger Angriffsfläche
    ...(state && { state })
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code, state: stateRaw } = req.query;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'No authorization code' });
    }

    // Parse state for privacy consent
    let state = {};
    try {
      console.log('📦 Raw state parameter:', stateRaw);
      
      // Decode base64url manually (replace - with +, _ with /, add padding)
      const base64 = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString('utf8');
      
      console.log('📦 Decoded state:', decoded);
      
      state = JSON.parse(decoded);
      
      console.log('📦 Parsed state object:', JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('⚠️ State parsing error:', err.message);
      state = { nonce: stateRaw };
    }

    const privacyConsent = state.privacy_consent?.accepted === true || false;

    // Exchange code for tokens
    const backendUrl = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${backendUrl}/api/auth/oauth/google/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    if (!tokens.id_token) {
      return res.status(400).json({ success: false, message: 'No ID token received' });
    }

    // Decode ID token to get user info
    const user = jwt.decode(tokens.id_token);

    // Insert or update user
    const ins = await query(
      `INSERT INTO users (name, email, provider, provider_id, role, status, email_verified, privacy_consent, privacy_consent_at)
       VALUES ($1,$2,'google',$3,'CLIENT','active',true,$4,$5)
       ON CONFLICT (provider, provider_id)
       DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, privacy_consent=EXCLUDED.privacy_consent, privacy_consent_at=EXCLUDED.privacy_consent_at
       RETURNING id, email, name, role`,
      [user.name || user.email, user.email, user.sub, privacyConsent, privacyConsent ? new Date() : null]
    );

    const dbUser = ins.rows[0];
    const tenants = await fetchTenantsForUser(dbUser.id);
    const token = signToken(dbUser, tenants);
    const refresh = signRefreshToken(dbUser);
    setRefreshCookie(res, refresh);

    // Redirect to frontend with token (validated for multi-tenant security)
    const redirectUrl = getValidatedRedirectUrl(state);
    console.log('[AUDIT] oauth_success', { provider: 'google', userId: String(dbUser.id), redirectUrl });
    return res.redirect(`${redirectUrl}?token=${token}`);

  } catch (error) {
    console.error('[AUDIT] oauth_error', { provider: 'google', message: error?.message || 'oauth_failed' });
    try {
      // Try to derive redirect from state if present
      const fallback = `${process.env.FRONTEND_URL || 'https://www.revalenz.de'}/auth/callback`;
      const redirectUrl = typeof state !== 'undefined' ? getValidatedRedirectUrl({ returnUrl: fallback }) : fallback;
      const final = `${redirectUrl}?error=oauth_failed&message=${encodeURIComponent(error?.message || 'oauth_failed')}`;
      return res.redirect(final);
    } catch {
      return res.status(500).json({ success: false, message: 'oauth failed' });
    }
  }
});

// ============================================================================
// OAUTH ENDPOINTS - GITHUB
// ============================================================================

router.get('/oauth/github', (req, res) => {
  const { state } = req.query;
  if (state && !isSafeStateParam(state)) {
    return res.status(400).json({ success: false, message: 'Invalid state parameter' });
  }
  const backendUrl = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${backendUrl}/api/auth/oauth/github/callback`,
    scope: 'user:email',
    ...(state && { state })
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get('/oauth/github/callback', async (req, res) => {
  try {
    const { code, state: stateRaw } = req.query;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'No authorization code' });
    }

    // Parse state for privacy consent
    let state = {};
    try {
      console.log('📦 Raw state parameter:', stateRaw);
      
      // Decode base64url manually (replace - with +, _ with /, add padding)
      const base64 = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString('utf8');
      
      console.log('📦 Decoded state:', decoded);
      
      state = JSON.parse(decoded);
      
      console.log('📦 Parsed state object:', JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('⚠️ State parsing error:', err.message);
      state = { nonce: stateRaw };
    }

    const privacyConsent = state.privacy_consent?.accepted === true || false;

    // Exchange code for access token
    const backendUrl = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        redirect_uri: `${backendUrl}/api/auth/oauth/github/callback`
      })
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      return res.status(400).json({ success: false, message: 'No access token received' });
    }

    // Fetch user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { 
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    });

    const user = await userResponse.json();

    // Fetch primary email if not public
    let email = user.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { 
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });
      const emails = await emailResponse.json();
      const primaryEmail = emails.find(e => e.primary);
      email = primaryEmail ? primaryEmail.email : null;
    }
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'No email available from GitHub' });
    }

    // Insert or update user
    const ins = await query(
      `INSERT INTO users (name, email, provider, provider_id, role, status, email_verified, privacy_consent, privacy_consent_at)
       VALUES ($1,$2,'github',$3,'CLIENT','active',true,$4,$5)
       ON CONFLICT (provider, provider_id)
       DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, privacy_consent=EXCLUDED.privacy_consent, privacy_consent_at=EXCLUDED.privacy_consent_at
       RETURNING id, email, name, role`,
      [user.name || user.login, email, String(user.id), privacyConsent, privacyConsent ? new Date() : null]
    );

    const dbUser = ins.rows[0];
    const tenants = await fetchTenantsForUser(dbUser.id);
    const token = signToken(dbUser, tenants);
    const refresh = signRefreshToken(dbUser);
    setRefreshCookie(res, refresh);

    // Redirect to frontend with token (validated for multi-tenant security)
    const redirectUrl = getValidatedRedirectUrl(state);
    return res.redirect(`${redirectUrl}?token=${token}`);

  } catch (error) {
    console.error('[AUDIT] oauth_error', { provider: 'github', message: error?.message || 'oauth_failed' });
    try {
      const fallback = `${process.env.FRONTEND_URL || 'https://www.revalenz.de'}/auth/callback`;
      const final = `${fallback}?error=oauth_failed&message=${encodeURIComponent(error?.message || 'oauth_failed')}`;
      return res.redirect(final);
    } catch {
      return res.status(500).json({ success: false, message: 'oauth failed' });
    }
  }
});

// ============================================================================
// OAUTH ENDPOINTS - MICROSOFT
// ============================================================================

router.get('/oauth/microsoft', (req, res) => {
  const { state } = req.query;
  if (state && !isSafeStateParam(state)) {
    return res.status(400).json({ success: false, message: 'Invalid state parameter' });
  }
  const backendUrl = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: `${backendUrl}/api/auth/oauth/microsoft/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',  // UX-Verbesserung: Account-Auswahl, kein Consent bei wiederholtem Login
    ...(state && { state })
  });
  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
});

router.get('/oauth/microsoft/callback', async (req, res) => {
  try {
    const { code, state: stateRaw } = req.query;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'No authorization code' });
    }

    // Parse state for privacy consent
    let state = {};
    try {
      console.log('📦 Raw state parameter:', stateRaw);
      
      // Decode base64url manually (replace - with +, _ with /, add padding)
      const base64 = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const decoded = Buffer.from(padded, 'base64').toString('utf8');
      
      console.log('📦 Decoded state:', decoded);
      
      state = JSON.parse(decoded);
      
      console.log('📦 Parsed state object:', JSON.stringify(state, null, 2));
    } catch (err) {
      console.error('⚠️ State parsing error:', err.message);
      state = { nonce: stateRaw };
    }

    const privacyConsent = state.privacy_consent?.accepted === true || false;

    // Exchange code for tokens
    const backendUrl = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        redirect_uri: `${backendUrl}/api/auth/oauth/microsoft/callback`,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    if (!tokens.id_token) {
      return res.status(400).json({ success: false, message: 'No ID token received' });
    }

    // Decode ID token to get user info
    const user = jwt.decode(tokens.id_token);

    // Insert or update user
    const ins = await query(
      `INSERT INTO users (name, email, provider, provider_id, role, status, email_verified, privacy_consent, privacy_consent_at)
       VALUES ($1,$2,'microsoft',$3,'CLIENT','active',true,$4,$5)
       ON CONFLICT (provider, provider_id)
       DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email, privacy_consent=EXCLUDED.privacy_consent, privacy_consent_at=EXCLUDED.privacy_consent_at
       RETURNING id, email, name, role`,
      [user.name || user.email, user.email, user.oid || user.sub, privacyConsent, privacyConsent ? new Date() : null]
    );

    const dbUser = ins.rows[0];
    const tenants = await fetchTenantsForUser(dbUser.id);
    const token = signToken(dbUser, tenants);
    const refresh = signRefreshToken(dbUser);
    setRefreshCookie(res, refresh);

    // Redirect to frontend with token (validated for multi-tenant security)
    const redirectUrl = getValidatedRedirectUrl(state);
    return res.redirect(`${redirectUrl}?token=${token}`);
    
  } catch (error) {
    console.error('[AUDIT] oauth_error', { provider: 'microsoft', message: error?.message || 'oauth_failed' });
    try {
      const fallback = `${process.env.FRONTEND_URL || 'https://www.revalenz.de'}/auth/callback`;
      const final = `${fallback}?error=oauth_failed&message=${encodeURIComponent(error?.message || 'oauth_failed')}`;
      return res.redirect(final);
    } catch {
      return res.status(500).json({ success: false, message: 'oauth failed' });
    }
  }
});

// ============================================================================
// USER STATUS (for checking email verification, etc.)
// ============================================================================

router.get('/user-status', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse erforderlich'
      });
    }
    
    const result = await query(
      'SELECT id, email, status, email_verified, provider FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    const user = result.rows[0];
    return res.json({
      success: true,
      data: {
        email: user.email,
        status: user.status,
        emailVerified: user.email_verified,
        provider: user.provider
      }
    });
    
  } catch (error) {
    console.error('User status error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Fehler beim Abrufen des Benutzerstatus' 
    });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

export default router;

