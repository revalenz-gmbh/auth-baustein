# Integrationsleitfaden – Auth-Baustein

Dieser Leitfaden beschreibt die empfohlene, einheitliche Integration für Websites und KI‑Agent‑Frontends.

## 1) OAuth-Flow starten

- Endpoint (unverändert, rückwärtskompatibel):
  - `GET https://accounts.revalenz.de/api/auth/oauth/{provider}?state={state}`
- Provider: `google`, `github`, `microsoft`

### State-Objekt (einheitlich)
```json
{
  "returnUrl": "<SCHEME>://<DOMAIN>/auth/callback",
  "origin": "<SCHEME>://<DOMAIN>",
  "privacy_consent": { "accepted": true, "timestamp": "<ISO8601>" }
}
```

### State-Encoding (base64url ohne Padding)
```js
const stateObj = {
  returnUrl: `${window.location.origin}/auth/callback`,
  origin: window.location.origin,
  privacy_consent: { accepted: true, timestamp: new Date().toISOString() }
};
const json = JSON.stringify(stateObj);
const b64 = btoa(unescape(encodeURIComponent(json)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
window.location.href = `${ACCOUNTS_URL}/api/auth/oauth/google?state=${b64}`;
```

## 2) Callback verarbeiten

- Der Auth‑Baustein redirected nach erfolgreicher Authentifizierung zu `returnUrl` mit `?token=<JWT>`.
- Im Fehlerfall wird zu `returnUrl?error=oauth_failed&message=...` redirected.

```js
// /auth/callback
const params = new URLSearchParams(window.location.search);
const err = params.get('error');
if (err) {
  // Nutzerfreundliche Meldung anzeigen
} else {
  const token = params.get('token');
  localStorage.setItem('token', token);
  // Optional: Claims lesen
  const payload = JSON.parse(atob(token.split('.')[1]));
  // Weiterleiten
  window.location.assign('/member-area');
}
```

## 3) Token-Nutzung in API-Calls

```js
const token = localStorage.getItem('token');
await fetch('/api/secure', { headers: { Authorization: `Bearer ${token}` } });
```

## 4) Fehlerfälle

- `?error=oauth_failed&message=...` – Fehler beim Provider/Callback
- `429 Too many requests` – Rate-Limit erreicht (max. konfiguriert in ENV)

## 5) Security & Betrieb

- JWT: HS256, `sub`, `email`, `roles`, `tenants`
- JWKS: `GET /.well-known/jwks.json` (oct JWK aus `AUTH_JWT_SECRET`)
- (Optional) Discovery: `GET /.well-known/openid-configuration`
- Rate‑Limit (Default): 100 Req / 15 Min pro IP auf Auth‑Routen
- Logging: strukturierte Audit‑Logs in Server‑Logs

## 6) ENV‑Variablen (relevant)

- `BACKEND_URL=https://accounts.revalenz.de`
- `FRONTEND_URL=https://www.revalenz.de`
- `AUTH_JWT_SECRET=<secret>`
- `RATE_LIMIT_WINDOW_MS=900000` (optional)
- `RATE_LIMIT_MAX_REQUESTS=100` (optional)

## 7) Gute Praxis für Websites/Agenten

- Route `GET /auth/callback` bereitstellen
- `token` speichern, optional Claims lesen, anschließend zur App weiterleiten
- Fehlerfreundliches UX bei `?error=...`
- Kein eigener Redirect zurück zum Login nach erfolgreichem Empfang des Tokens

---

Diese Vorgabe ist rückwärtskompatibel und funktioniert mit bestehenden Websites (revalenz.de, benefizshow.de). Separate Multi‑Domain‑Flows können später über neue `/external`‑Routen ergänzt werden, ohne die bestehenden Flows zu beeinflussen.
