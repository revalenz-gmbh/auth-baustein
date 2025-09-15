import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../utils/db.js';

const router = express.Router();

async function fetchTenantsForAdmin(adminId){
  try {
    const r = await query(
      'SELECT t.id, t.name FROM tenant_admins ta JOIN tenants t ON ta.tenant_id = t.id WHERE ta.admin_id = $1',
      [adminId]
    );
    return r.rows || [];
  } catch {
    return [];
  }
}

function signToken(admin, tenants){
  const tenantIds = (tenants || []).map(t => String(t.id));
  return jwt.sign(
    { sub: String(admin.id), email: admin.email, roles: ['admin'], tenants: tenantIds },
    process.env.AUTH_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const setup = req.headers['x-setup-token'];
    if (!setup || setup !== process.env.SETUP_TOKEN) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'email & password required' });
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO admins (name, email, password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING id, name, email, created_at',
      [name || '', email, hash]
    );
    if (result.rowCount === 0) return res.status(409).json({ success: false, message: 'email exists' });
    return res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'register failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password, api_key } = req.body || {};
    let admin;
    if (api_key) {
      const r = await query('SELECT * FROM admins WHERE api_key = $1', [api_key]);
      admin = r.rows[0];
    } else if (email && password) {
      const r = await query('SELECT * FROM admins WHERE email = $1', [email]);
      admin = r.rows[0];
      if (!admin) return res.status(401).json({ success: false, message: 'invalid credentials' });
      const ok = await bcrypt.compare(password, admin.password_hash || '');
      if (!ok) return res.status(401).json({ success: false, message: 'invalid credentials' });
    } else {
      return res.status(400).json({ success: false, message: 'email+password or api_key required' });
    }

    const tenants = await fetchTenantsForAdmin(admin.id);
    const token = signToken(admin, tenants);
    return res.json({ success: true, token, tenants });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'login failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    return res.json({ success: true, data: payload });
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// --- Google OAuth ---
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

function buildRedirectUri(){
  const base = process.env.OAUTH_REDIRECT_BASE || 'http://localhost:4000';
  return `${base}/auth/oauth/google/callback`;
}

router.get('/oauth/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('Missing GOOGLE_CLIENT_ID');
    return res.status(500).json({ success:false, message:'GOOGLE_CLIENT_ID missing (ENV)' });
  }
  const redirectUri = buildRedirectUri();
  // State mit Metadaten (Popup-Flow, erlaubte Origin)
  let stateObj = { nonce: Math.random().toString(36).slice(2) };
  const mode = (req.query.mode || '').toString();
  const origin = (req.query.origin || '').toString();
  const returnUrl = (req.query.return || '').toString();
  if (mode) stateObj.mode = mode;
  if (origin) stateObj.origin = origin;
  if (returnUrl) stateObj.returnUrl = returnUrl;
  let state;
  try { state = Buffer.from(JSON.stringify(stateObj)).toString('base64url'); }
  catch { state = stateObj.nonce; }
  const scope = encodeURIComponent('openid email profile');
  const url = `${GOOGLE_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  return res.redirect(url);
});

router.get('/oauth/google/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ success:false, message:'code missing' });
    // State parsen (Popup-Flow, erlaubte Origin)
    let stateRaw = (req.query.state || '').toString();
    let state = {};
    try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')); }
    catch { state = { nonce: stateRaw }; }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing GOOGLE_CLIENT_ID/SECRET');
      return res.status(500).json({ success:false, message:'GOOGLE_CLIENT_ID/SECRET missing (ENV)' });
    }
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', process.env.GOOGLE_CLIENT_ID);
    params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET);
    params.append('redirect_uri', buildRedirectUri());
    params.append('grant_type', 'authorization_code');

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token error', tokenJson);
      return res.status(400).json({ success:false, message:'token exchange failed', detail: tokenJson });
    }

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { 'Authorization': `Bearer ${tokenJson.access_token}` }
    });
    const user = await userRes.json();
    if (!user.email) {
      return sendOauthError(req, res, { code: 400, message: 'no email from provider' });
    }

    const allowedDomain = (process.env.ALLOWED_DOMAIN || '').trim();
    if (allowedDomain && !String(user.email).toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
      return sendOauthError(req, res, { code: 403, message: 'email domain not allowed', slug: 'domain_not_allowed' });
    }

    // 1) Existiert bereits ein Account mit diesem Provider?
    const byProvider = await query(
      'SELECT * FROM admins WHERE provider=$1 AND provider_id=$2', ['google', user.sub]
    );
    let admin;
    if (byProvider.rowCount > 0) {
      admin = byProvider.rows[0];
    } else {
      // 2) Sonst: Gibt es bereits einen Account mit der E-Mail? Dann Provider verknüpfen
      const byEmail = await query('SELECT * FROM admins WHERE email=$1', [user.email]);
      if (byEmail.rowCount > 0) {
        const upd = await query(
          'UPDATE admins SET provider=$1, provider_id=$2 WHERE id=$3 RETURNING id, email',
          ['google', user.sub, byEmail.rows[0].id]
        );
        admin = upd.rows[0];
      } else {
        // 3) Neu anlegen
        const ins = await query(
          `INSERT INTO admins (name, email, provider, provider_id)
           VALUES ($1,$2,'google',$3)
           ON CONFLICT (provider, provider_id)
           DO UPDATE SET name=EXCLUDED.name, email=EXCLUDED.email
           RETURNING id, email`,
          [user.name || user.email, user.email, user.sub]
        );
        admin = ins.rows[0];
      }
    }

    const tenants = await fetchTenantsForAdmin(admin.id);
    const token = signToken(admin, tenants);
    // Popup-Flow: Token via postMessage an opener zurückgeben
    if (state && state.mode === 'popup') {
      const safeOrigin = typeof state.origin === 'string' && state.origin.startsWith('http')
        ? state.origin
        : '*';
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Login erfolgreich</title></head>
<body>
<p>Login erfolgreich. Dieses Fenster wird automatisch geschlossen.</p>
<script>
  (function(){
    try {
      var token = ${JSON.stringify(token)};
      if (window.opener) {
        window.opener.postMessage({ type: 'auth_token', token: token }, ${JSON.stringify(safeOrigin)});
      }
      // Versuche den Token in die Zwischenablage zu kopieren (als Fallback)
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(String(token)).catch(function(){});
        }
      } catch(e) {}
    } catch (e) {}
    setTimeout(function(){ window.close(); }, 200);
  })();
</script>
</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }
    // Redirect-Flow: Wenn returnUrl vorhanden, per 302 zurück zur Admin-Seite inkl. Token
    if (state && typeof state.returnUrl === 'string' && state.returnUrl) {
      const returnUrl = state.returnUrl;
      return res.redirect(302, `${returnUrl}#token=${encodeURIComponent(token)}`);
    }
    // Standard: JSON-Antwort
    return res.json({ success:true, token, tenants });
  } catch (e) {
    console.error('OAuth callback error', e);
    return sendOauthError(req, res, { code: 500, message: 'oauth failed' });
  }
});

export default router;

function sendOauthError(req, res, { code = 400, message = 'oauth failed', slug = '' } = {}){
  try {
    // Versuche State zu lesen, um Popup/Redirect unterscheiden zu können
    let stateRaw = (req.query.state || '').toString();
    let state = {};
    try { state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8')); }
    catch { state = { nonce: stateRaw }; }
    // Popup-Modus: eine kleine HTML-Seite liefern, die dem Opener den Fehler sendet und das Fenster schließt
    if (state && state.mode === 'popup') {
      const safeOrigin = typeof state.origin === 'string' && state.origin.startsWith('http')
        ? state.origin
        : '*';
      const returnUrl = typeof state.returnUrl === 'string' && state.returnUrl ? state.returnUrl : '';
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Login fehlgeschlagen</title></head>
<body>
<p>Login fehlgeschlagen. Dieses Fenster wird automatisch geschlossen.</p>
<script>
(function(){
  try {
    if (window.opener) {
      window.opener.postMessage({ type: 'auth_error', message: ${JSON.stringify(message)}, slug: ${JSON.stringify(slug)} }, ${JSON.stringify(safeOrigin)});
    }
    if (${JSON.stringify(!!returnUrl)}) {
      try { window.location.replace(${JSON.stringify(returnUrl)} + '#error=' + encodeURIComponent(${JSON.stringify(slug || 'oauth_failed')})); } catch(e) {}
    }
  } catch (e) {}
  setTimeout(function(){ window.close(); }, 300);
})();
</script>
</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(code).send(html);
    }
    // Redirect-Modus / ohne State: zur Admin-Seite mit Fehler im Hash zurückleiten, sofern "return" mitgegeben wurde
    const returnUrl = (req.query.return || req.query.returnUrl || '').toString();
    if (returnUrl) {
      return res.redirect(302, `${returnUrl}#error=${encodeURIComponent(slug || 'oauth_failed')}`);
    }
  } catch(_) {}
  return res.status(code).json({ success:false, message });
}

// Tenants des eingeloggten Admins
router.get('/tenants', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenants = await fetchTenantsForAdmin(payload.sub);
    return res.json({ success:true, data: tenants });
  } catch (e) {
    return res.status(401).json({ success:false, message:'Invalid token' });
  }
});

// Tenant anlegen und eingeloggten Admin zuordnen
router.post('/tenants', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const { name } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ success:false, message:'name required' });
    }
    const ins = await query('INSERT INTO tenants (name) VALUES ($1) RETURNING id, name', [name]);
    const tenant = ins.rows[0];
    await query('INSERT INTO tenant_admins (tenant_id, admin_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [tenant.id, payload.sub, 'owner']);
    return res.status(201).json({ success:true, data: tenant });
  } catch (e) {
    console.error('create tenant error', e);
    return res.status(500).json({ success:false, message:'create tenant failed' });
  }
});
