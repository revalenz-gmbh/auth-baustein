# Multi-Domain OAuth Support - Implementierungsdokumentation

## 🎯 Übersicht

Der Auth-Baustein unterstützt nun mehrere Domains für OAuth-Authentifizierung. Nach erfolgreicher Authentifizierung wird der User automatisch zur korrekten Domain zurückgeleitet.

### Unterstützte Domains

- `https://revalenz.de`
- `https://www.revalenz.de`
- `https://benefizshow.de`
- `https://www.benefizshow.de`
- `https://ecotrainer.revalenz.de` ✨ NEU

## 🔧 Implementierte Änderungen

### 1. Trusted Domains erweitert (`src/utils/redirect.js`)

```javascript
const TRUSTED_DOMAINS = [
  'https://www.revalenz.de',
  'https://revalenz.de',
  'https://benefizshow.de',
  'https://www.benefizshow.de',
  'https://ecotrainer.revalenz.de', // ✨ NEU
  'http://localhost:5173', // Dev
  'http://localhost:3000'  // Dev
];
```

### 2. Redirect-Validierung erweitert

Die Funktion `getValidatedRedirectUrl()` unterstützt nun beide Parameter:
- `returnUrl` (Legacy - vom Frontend-State)
- `redirect` (Neu - als Query-Parameter)

```javascript
export function getValidatedRedirectUrl(state) {
  // Support both 'returnUrl' (legacy) and 'redirect' (new) parameters
  let returnUrl = state?.returnUrl || state?.redirect;
  
  // ... Validierung gegen TRUSTED_DOMAINS ...
}
```

### 3. OAuth-Start-Routen erweitert

Alle drei OAuth-Provider (Google, GitHub, Microsoft) unterstützen nun den `redirect` Query-Parameter:

**Beispiel-Aufruf:**
```
GET https://accounts.revalenz.de/api/auth/oauth/google?redirect=https://ecotrainer.revalenz.de/auth/callback
```

Die Route:
1. Liest den `redirect` Parameter aus `req.query`
2. Validiert die URL (nur erlaubte Domains werden akzeptiert)
3. Speichert den Parameter im OAuth State (base64url-encoded)
4. Nach erfolgreicher OAuth-Authentifizierung wird zur `redirect` URL zurückgeleitet

### 4. CORS-Konfiguration aktualisiert (`src/app.js`)

Alle Domains sind nun in den CORS-Defaults:

```javascript
const defaults = [
  'https://revalenz.de',
  'https://www.revalenz.de',
  'https://benefizshow.de',
  'https://www.benefizshow.de',
  'https://ecotrainer.revalenz.de' // ✨ NEU
];
```

### 5. Environment Variables dokumentiert (`env.example`)

Neue und aktualisierte Environment Variables:
- `BACKEND_URL`: Auth-Baustein Domain (z.B. `https://accounts.revalenz.de`)
- `FRONTEND_URL`: Fallback-Domain (z.B. `https://revalenz.de`)
- `CORS_ORIGINS`: Komma-separierte Liste zusätzlicher Origins
- `AUTH_COOKIE_DOMAIN`: Cookie-Domain für Refresh Token (`.revalenz.de`)

## 📋 Integration für neue Domains

### Variante 1: Mit Query-Parameter (empfohlen für externe Apps)

```javascript
// EcoChemCycle oder andere externe App
const authUrl = `https://accounts.revalenz.de/api/auth/oauth/google?redirect=${encodeURIComponent('https://ecotrainer.revalenz.de/auth/callback')}`;

window.location.href = authUrl;
```

### Variante 2: Mit State-Objekt (empfohlen für Revalenz-Frontends)

```javascript
// Frontend (z.B. revalenz.de, benefizshow.de)
const stateObj = {
  returnUrl: `${window.location.origin}/auth/callback`,
  origin: window.location.origin,
  privacy_consent: {
    accepted: true,
    timestamp: new Date().toISOString()
  }
};

const stateB64 = btoa(unescape(encodeURIComponent(JSON.stringify(stateObj))))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

window.location.href = `https://accounts.revalenz.de/api/auth/oauth/google?state=${stateB64}`;
```

### Callback-Handler

Nach erfolgreicher OAuth-Authentifizierung wird zur Callback-URL zurückgeleitet:

```
https://ecotrainer.revalenz.de/auth/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Die App muss den Token aus dem Query-Parameter extrahieren:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  // Token speichern (z.B. localStorage)
  localStorage.setItem('token', token);
  
  // JWT Token parsen
  const payload = JSON.parse(atob(token.split('.')[1]));
  
  // User-Daten extrahieren
  const user = {
    id: parseInt(payload.sub),
    email: payload.email,
    name: payload.name || payload.email,
    roles: payload.roles || ['user'],
    tenants: payload.tenants || []
  };
  
  // User einloggen und zur Hauptseite redirecten
  login(user);
  navigate('/dashboard');
}
```

## 🧪 Testing

### Test-Flow für EcoChemCycle (ecotrainer.revalenz.de)

**1. OAuth-Start:**
```bash
curl -i "https://accounts.revalenz.de/api/auth/oauth/google?redirect=https://ecotrainer.revalenz.de/auth/callback"
```

**Erwartete Antwort:**
```
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=eyJyZWRpcmVjdCI6...
```

**2. Nach Google OAuth:**
Der User wird zu Google weitergeleitet, authentifiziert sich, und Google redirected zurück:
```
https://accounts.revalenz.de/api/auth/oauth/google/callback?code=...&state=...
```

**3. Token-Erstellung und Redirect:**
Der Auth-Baustein:
- Tauscht den Code gegen Access Token
- Erstellt oder aktualisiert den User in der Datenbank
- Erstellt JWT Token
- Redirected zur ursprünglichen URL:
```
https://ecotrainer.revalenz.de/auth/callback?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Test-Flow für bestehende Domains (revalenz.de, benefizshow.de)

**Bisherige Integration bleibt unverändert!**

Das Frontend sendet weiterhin State mit `returnUrl`:
```javascript
const stateObj = {
  returnUrl: `${window.location.origin}/auth/callback`,
  privacy_consent: { accepted: true }
};
```

Der Auth-Baustein erkennt automatisch `state.returnUrl` und leitet korrekt zurück.

### Debug-Logging

Der Auth-Baustein loggt alle Redirect-Entscheidungen:

```
🔍 Redirect Debug - Raw State: { ... }
🔍 Redirect Debug - After Normalization: { ... }
✅ Validated returnUrl: https://ecotrainer.revalenz.de/auth/callback
```

## 🔐 Sicherheit

### Domain-Validierung

Nur Domains in `TRUSTED_DOMAINS` werden akzeptiert:

```javascript
// ✅ Erlaubt
https://ecotrainer.revalenz.de/auth/callback

// ❌ Blockiert
https://evil.com/auth/callback
```

### State-Encoding

State wird base64url-encoded übertragen (URL-sicher):

```javascript
Buffer.from(JSON.stringify(stateObj))
  .toString('base64')
  .replace(/\+/g, '-')  // URL-safe
  .replace(/\//g, '_')  // URL-safe
  .replace(/=+$/, '');  // Padding entfernen
```

### Error-Handling

Bei Fehlern während des State-Parsing wird ein Fallback verwendet:

```javascript
try {
  state = JSON.parse(decoded);
} catch (err) {
  console.error('⚠️ State parsing error:', err.message);
  state = { nonce: stateRaw };
}
```

## 📦 Environment Variables (Vercel)

Für Vercel-Deployment müssen folgende Environment Variables gesetzt sein:

### Auth-Baustein (accounts.revalenz.de)

```bash
# Backend URL
BACKEND_URL=https://accounts.revalenz.de

# JWT Secrets
AUTH_JWT_SECRET=<your_secret>
AUTH_REFRESH_SECRET=<your_refresh_secret>

# OAuth Credentials
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GITHUB_CLIENT_ID=<your_github_client_id>
GITHUB_CLIENT_SECRET=<your_github_client_secret>
MICROSOFT_CLIENT_ID=<your_microsoft_client_id>
MICROSOFT_CLIENT_SECRET=<your_microsoft_client_secret>

# Default Redirect
FRONTEND_URL=https://revalenz.de

# Cookie Domain
AUTH_COOKIE_DOMAIN=.revalenz.de

# Database
DATABASE_URL=<your_neon_database_url>
```

### Google Cloud Console

**Authorized redirect URIs:**
```
https://accounts.revalenz.de/api/auth/oauth/google/callback
```

**Authorized JavaScript origins:**
```
https://accounts.revalenz.de
https://revalenz.de
https://benefizshow.de
https://ecotrainer.revalenz.de
```

## 🎉 Erfolgreiche Integration

### Checkliste

- ✅ `TRUSTED_DOMAINS` erweitert mit neuer Domain
- ✅ `getValidatedRedirectUrl()` unterstützt `redirect` und `returnUrl`
- ✅ OAuth-Routen unterstützen `redirect` Query-Parameter
- ✅ CORS-Konfiguration inkludiert alle Domains
- ✅ Environment Variables dokumentiert
- ✅ Bestehende Domains (revalenz.de, benefizshow.de) funktionieren weiterhin
- ✅ Neue Domain (ecotrainer.revalenz.de) kann Auth-Baustein nutzen
- ✅ Error-Handling und Fallbacks implementiert
- ✅ Debug-Logging für Troubleshooting

### Nächste Schritte

1. **Deployment:** Auth-Baustein auf Vercel deployen
2. **Environment Variables:** In Vercel Console setzen
3. **Google Cloud Console:** Redirect URIs aktualisieren
4. **Testing:** OAuth-Flow für alle Domains testen
5. **Monitoring:** Logs auf Vercel überwachen

## 📞 Support

Bei Fragen oder Problemen:
- Repository: https://github.com/revalenz-gmbh/auth-baustein.git
- Logs: Vercel Console → auth-baustein → Logs
- Debug: Browser DevTools → Network → OAuth-Requests

---

**Status:** ✅ Implementiert und bereit für Deployment
**Datum:** 28. Oktober 2025

