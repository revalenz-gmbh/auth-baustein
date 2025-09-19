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
    const superUser = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    const userEmail = String(user.email).toLowerCase();
    if (allowedDomain && !userEmail.endsWith(`@${allowedDomain.toLowerCase()}`) && userEmail !== superUser) {
      // Zusätzlich prüfen: steht E-Mail in allowed_admins?
      const allow = await query('SELECT 1 FROM allowed_admins WHERE LOWER(email)=LOWER($1) LIMIT 1', [user.email]);
      if (allow.rowCount === 0) {
        return sendOauthError(req, res, { code: 403, message: 'email domain not allowed', slug: 'domain_not_allowed' });
      }
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
    const roles = (userEmail === superUser) ? ['admin','super'] : ['admin'];
    const token = jwt.sign(
      { sub: String(admin.id), email: admin.email, roles, tenants: (tenants||[]).map(t=>String(t.id)) },
      process.env.AUTH_JWT_SECRET,
      { expiresIn: '1h' }
    );
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
    let tenants;
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (isSuper) {
      const r = await query('SELECT id, name FROM tenants ORDER BY id ASC');
      tenants = r.rows;
    } else {
      tenants = await fetchTenantsForAdmin(payload.sub);
    }
    return res.json({ success:true, data: tenants });
  } catch (e) {
    return res.status(401).json({ success:false, message:'Invalid token' });
  }
});

// Allowlist verwalten (nur Super‑Admin)
router.get('/allowed-admins', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) return res.status(403).json({ success:false, message:'forbidden' });
    const r = await query('SELECT id, email, tenant_id, role, created_at FROM allowed_admins ORDER BY email ASC');
    return res.json({ success:true, data: r.rows });
  } catch (e) {
    return res.status(500).json({ success:false, message:'list failed' });
  }
});

router.post('/allowed-admins', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) return res.status(403).json({ success:false, message:'forbidden' });
    const { email, tenant_id, role } = req.body || {};
    if (!email) return res.status(400).json({ success:false, message:'email required' });
    await query('INSERT INTO allowed_admins (email, tenant_id, role) VALUES ($1,$2,$3) ON CONFLICT (email) DO UPDATE SET tenant_id=EXCLUDED.tenant_id, role=EXCLUDED.role', [email, tenant_id || null, role || 'admin']);
    return res.json({ success:true });
  } catch (e) {
    return res.status(500).json({ success:false, message:'upsert failed' });
  }
});

router.delete('/allowed-admins', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) return res.status(403).json({ success:false, message:'forbidden' });
    const email = (req.query.email||'').toString().trim();
    if (!email) return res.status(400).json({ success:false, message:'email required' });
    const del = await query('DELETE FROM allowed_admins WHERE LOWER(email)=LOWER($1)', [email]);
    if (del.rowCount === 0) return res.status(404).json({ success:false, message:'not found' });
    return res.json({ success:true, message:'deleted' });
  } catch (e) {
    return res.status(500).json({ success:false, message:'delete failed' });
  }
});

// Tenant löschen (nur wenn keine weiteren Daten vorhanden sind)
router.delete('/tenants/:id', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success:false, message:'invalid id' });

    // Prüfen: Super-Admin darf alles, sonst nur zugeordnete Tenants
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT 1 FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [id, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }

    // Nutzungsprüfung: existieren Lizenzen? (später: Events/Orders)
    const lic = await query('SELECT 1 FROM licenses WHERE tenant_id=$1 LIMIT 1', [id]);
    if (lic.rowCount > 0) return res.status(409).json({ success:false, message:'tenant has dependent data (licenses)' });

    await query('DELETE FROM tenant_admins WHERE tenant_id=$1', [id]);
    const del = await query('DELETE FROM tenants WHERE id=$1', [id]);
    if (del.rowCount === 0) return res.status(404).json({ success:false, message:'not found' });
    return res.json({ success:true, message:'tenant deleted' });
  } catch (e) {
    console.error('delete tenant error', e);
    return res.status(500).json({ success:false, message:'delete tenant failed' });
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
    // Prüfen auf Duplikat (case-insensitive)
    const exists = await query('SELECT id FROM tenants WHERE LOWER(name)=LOWER($1)', [name]);
    if (exists.rowCount > 0) {
      return res.status(409).json({ success:false, message:'tenant name exists' });
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

// --- Memberships (Admin-Zuweisungen pro Tenant) ---
// Mitglieder eines Tenants auflisten (nur Super oder Tenant-Mitglied)
router.get('/tenants/:tenantId/members', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid tenantId' });
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT 1 FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    const r = await query(
      `SELECT a.id as admin_id, a.email, a.first_name, a.last_name, ta.role
       FROM tenant_admins ta
       JOIN admins a ON a.id = ta.admin_id
       WHERE ta.tenant_id=$1
       ORDER BY a.email ASC`,
      [tenantId]
    );
    return res.json({ success:true, data: r.rows });
  } catch (e) {
    return res.status(500).json({ success:false, message:'list members failed' });
  }
});

// Mitglied hinzufügen (nur Super oder Owner). Optional: Produktlizenz zuweisen
router.post('/tenants/:tenantId/members', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid tenantId' });
    const { email, role, first_name, last_name, product_key } = req.body || {};
    const normEmail = (email||'').trim().toLowerCase();
    if (!normEmail) return res.status(400).json({ success:false, message:'email required' });
    if (!first_name || !last_name) return res.status(400).json({ success:false, message:'first_name and last_name required' });
    const desiredRole = (role||'admin').toLowerCase();
    if (!['user','admin','owner'].includes(desiredRole)) return res.status(400).json({ success:false, message:'invalid role' });

    // Berechtigung prüfen
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
      const callerRole = (rel.rows[0].role||'admin').toLowerCase();
      if (callerRole !== 'owner') return res.status(403).json({ success:false, message:'owner required' });
    }

    // Admin anlegen/finden (bestehende Namen NICHT überschreiben)
    let adminId;
    const existing = await query('SELECT id, first_name, last_name FROM admins WHERE LOWER(email)=LOWER($1)', [normEmail]);
    if (existing.rowCount > 0) {
      adminId = existing.rows[0].id;
      // Prüfen: Ist Nutzer bereits Mitglied dieser Organisation?
      const relExists = await query('SELECT 1 FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, adminId]);
      if (relExists.rowCount > 0) {
        return res.status(409).json({ success:false, message:'Mitglied ist bereits in dieser Organisation registriert' });
      }
      // Bestehenden Namen nicht überschreiben – nur Mitgliedschaft setzen
    } else {
      const ins = await query('INSERT INTO admins (email, name, first_name, last_name) VALUES ($1,$2,$3,$4) RETURNING id', [normEmail, `${first_name} ${last_name}`.trim(), first_name, last_name]);
      adminId = ins.rows[0].id;
      try { await query('INSERT INTO allowed_admins (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [normEmail]); } catch(_){ }
    }

    // Beziehung setzen
    await query(
      `INSERT INTO tenant_admins (tenant_id, admin_id, role)
       VALUES ($1,$2,$3)
       ON CONFLICT (tenant_id, admin_id) DO UPDATE SET role=EXCLUDED.role`,
      [tenantId, adminId, desiredRole]
    );
    if (product_key && ['tickets','impulse'].includes(String(product_key))) {
      await query(
        `INSERT INTO entitlements (tenant_id, admin_id, product_key, status)
         VALUES ($1,$2,$3,'active')
         ON CONFLICT (tenant_id, admin_id, product_key)
         DO UPDATE SET status='active'`,
        [tenantId, adminId, String(product_key)]
      );
    }
    return res.status(201).json({ success:true });
  } catch (e) {
    console.error('add member failed', e);
    return res.status(500).json({ success:false, message: e?.message || 'add member failed' });
  }
});

// Mitglied entfernen (nur Super oder Owner; letzten Owner schützen)
router.delete('/tenants/:tenantId/members', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    const email = (req.query.email||'').toString().trim().toLowerCase();
    if (!tenantId || !email) return res.status(400).json({ success:false, message:'invalid params' });

    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
      const callerRole = (rel.rows[0].role||'admin').toLowerCase();
      if (callerRole !== 'owner') return res.status(403).json({ success:false, message:'owner required' });
    }

    const target = await query('SELECT a.id, ta.role FROM admins a JOIN tenant_admins ta ON ta.admin_id=a.id AND ta.tenant_id=$1 WHERE LOWER(a.email)=LOWER($2)', [tenantId, email]);
    if (target.rowCount === 0) return res.status(404).json({ success:false, message:'member not found' });
    const targetRole = (target.rows[0].role||'admin').toLowerCase();
    if (targetRole === 'owner') {
      const owners = await query('SELECT COUNT(*)::int AS c FROM tenant_admins WHERE tenant_id=$1 AND LOWER(role)=\'owner\'', [tenantId]);
      if (owners.rows[0].c <= 1) return res.status(400).json({ success:false, message:'cannot remove last owner' });
    }
    await query('DELETE FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, target.rows[0].id]);
    return res.json({ success:true });
  } catch (e) {
    return res.status(500).json({ success:false, message:'remove member failed' });
  }
});

// --- Lizenzverwaltung (vereinfachtes Modell: Lizenz an tenants) ---
// Liste/Details: Tenant inkl. Lizenzfelder
router.get('/tenants/:tenantId/licenses', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid tenantId' });
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    const r = await query('SELECT id, name, license_plan, license_status, license_valid_until, license_meta FROM tenants WHERE id=$1', [tenantId]);
    if (r.rowCount === 0) return res.status(404).json({ success:false, message:'tenant not found' });
    return res.json({ success:true, data: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ success:false, message:'list licenses failed' });
  }
});

// Lizenz anlegen/aktualisieren (Super oder Owner) – schreibt direkt auf tenants
router.post('/tenants/:tenantId/licenses', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid tenantId' });
    const { plan, status, valid_until, meta } = req.body || {};
    if (!plan) return res.status(400).json({ success:false, message:'plan required' });

    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
      const role = rel.rows[0].role || 'admin';
      if (!['owner','admin'].includes(role)) return res.status(403).json({ success:false, message:'forbidden' });
    }

    // Künftig über entitlements (org-weite Lizenz: admin_id NULL, product=tickets)
    const upsert = await query(
      `INSERT INTO entitlements (tenant_id, admin_id, product_key, plan, status, valid_until, meta)
       VALUES ($1, NULL, 'tickets', $2, COALESCE($3,'active'), $4::timestamp, $5::jsonb)
       ON CONFLICT (tenant_id, product_key) WHERE admin_id IS NULL
       DO UPDATE SET plan=EXCLUDED.plan, status=EXCLUDED.status, valid_until=EXCLUDED.valid_until, meta=EXCLUDED.meta
       RETURNING id`,
      [tenantId, plan, status || 'active', valid_until || null, meta ? JSON.stringify(meta) : null]
    );
    return res.json({ success:true, data: { entitlement_id: upsert.rows[0].id } });
  } catch (e) {
    console.error('upsert license error', e);
    return res.status(500).json({ success:false, message:'upsert license failed' });
  }
});

// Lizenz deaktivieren (nur Super) – setzt Status auf inactive
router.delete('/tenants/:tenantId/licenses/:id', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) return res.status(403).json({ success:false, message:'forbidden' });
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid ids' });
    const upd = await query(
      `UPDATE entitlements SET status='inactive' WHERE tenant_id=$1 AND admin_id IS NULL AND product_key='tickets' RETURNING id`,
      [tenantId]
    );
    if (upd.rowCount === 0) return res.status(404).json({ success:false, message:'org entitlement not found' });
    return res.json({ success:true, message:'license set inactive' });
  } catch (e) {
    return res.status(500).json({ success:false, message:'delete license failed' });
  }
});

// --- Entitlements lesen ---
// Org-weiter Plan je Produkt (admin_id IS NULL)
router.get('/tenants/:tenantId/entitlements/org', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid tenantId' });
    const product = String(req.query.product || 'tickets');
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT 1 FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    const r = await query(
      `SELECT id, tenant_id, product_key, plan, status, valid_until, meta, created_at
       FROM entitlements
       WHERE tenant_id=$1 AND admin_id IS NULL AND product_key=$2`,
      [tenantId, product]
    );
    return res.json({ success:true, data: r.rows });
  } catch (e) {
    return res.status(500).json({ success:false, message:'read org entitlements failed' });
  }
});

// Org-Plan schreiben (product, plan, status, valid_until)
router.post('/tenants/:tenantId/entitlements/org', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    if (!tenantId) return res.status(400).json({ success:false, message:'invalid tenantId' });
    const { product = 'tickets', plan, status = 'active', valid_until = null, meta = null } = req.body || {};
    if (!plan) return res.status(400).json({ success:false, message:'plan required' });
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    const upsert = await query(
      `INSERT INTO entitlements (tenant_id, admin_id, product_key, plan, status, valid_until, meta)
       VALUES ($1, NULL, $2, $3, $4, $5::timestamp, $6::jsonb)
       ON CONFLICT (tenant_id, product_key) WHERE admin_id IS NULL
       DO UPDATE SET plan=EXCLUDED.plan, status=EXCLUDED.status, valid_until=EXCLUDED.valid_until, meta=EXCLUDED.meta
       RETURNING id`,
      [tenantId, String(product), plan, status, valid_until, meta ? JSON.stringify(meta) : null]
    );
    return res.json({ success:true, data:{ entitlement_id: upsert.rows[0].id } });
  } catch (e) {
    console.error('upsert org entitlement failed', e);
    return res.status(500).json({ success:false, message:'upsert org entitlement failed' });
  }
});

// Member-Service zuweisen (product/status)
router.post('/tenants/:tenantId/entitlements/members/:adminId', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    const adminId = parseInt(req.params.adminId, 10);
    if (!tenantId || !adminId) return res.status(400).json({ success:false, message:'invalid params' });
    const { product = 'tickets', status = 'active' } = req.body || {};
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    await query(
      `INSERT INTO entitlements (tenant_id, admin_id, product_key, status)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (tenant_id, admin_id, product_key)
       DO UPDATE SET status=EXCLUDED.status`,
      [tenantId, adminId, String(product), status]
    );
    return res.status(201).json({ success:true });
  } catch (e) {
    console.error('assign member entitlement failed', e);
    return res.status(500).json({ success:false, message:'assign member entitlement failed' });
  }
});

// Member-Service entziehen (per product)
router.delete('/tenants/:tenantId/entitlements/members/:adminId', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    const adminId = parseInt(req.params.adminId, 10);
    const product = String(req.query.product || 'tickets');
    if (!tenantId || !adminId || !product) return res.status(400).json({ success:false, message:'invalid params' });
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT role FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    await query('DELETE FROM entitlements WHERE tenant_id=$1 AND admin_id=$2 AND product_key=$3', [tenantId, adminId, product]);
    return res.json({ success:true });
  } catch (e) {
    console.error('remove member entitlement failed', e);
    return res.status(500).json({ success:false, message:'remove member entitlement failed' });
  }
});

// Member-Services eines Admins in einer Org
router.get('/tenants/:tenantId/entitlements/members/:adminId', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Unauthorized' });
    const payload = jwt.verify(token, process.env.AUTH_JWT_SECRET);
    const tenantId = parseInt(req.params.tenantId, 10);
    const adminId = parseInt(req.params.adminId, 10);
    if (!tenantId || !adminId) return res.status(400).json({ success:false, message:'invalid params' });
    const isSuper = Array.isArray(payload.roles) && payload.roles.includes('super');
    if (!isSuper) {
      const rel = await query('SELECT 1 FROM tenant_admins WHERE tenant_id=$1 AND admin_id=$2', [tenantId, payload.sub]);
      if (rel.rowCount === 0) return res.status(403).json({ success:false, message:'forbidden' });
    }
    const product = req.query.product ? String(req.query.product) : null;
    const sql = product
      ? `SELECT id, tenant_id, admin_id, product_key, status, valid_until, meta, created_at
         FROM entitlements WHERE tenant_id=$1 AND admin_id=$2 AND product_key=$3`
      : `SELECT id, tenant_id, admin_id, product_key, status, valid_until, meta, created_at
         FROM entitlements WHERE tenant_id=$1 AND admin_id=$2`;
    const params = product ? [tenantId, adminId, product] : [tenantId, adminId];
    const r = await query(sql, params);
    return res.json({ success:true, data: r.rows });
  } catch (e) {
    return res.status(500).json({ success:false, message:'read member entitlements failed' });
  }
});
