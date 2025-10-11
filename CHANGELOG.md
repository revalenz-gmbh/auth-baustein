# 📝 Auth-Baustein - Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

---

## [2.1.0] - 2025-10-11

### 🚀 Neue Features

- **Multi-Tenant Redirect-Validierung:** Robuste URL-Normalisierung mit automatischer Fehlerkorrektur
- **Umfassende Debug-Logs:** Detaillierte Logging-Emojis (📦 🔍 ✅ ⚠️) für einfaches Debugging
- **benefizshow.de Support:** Zweite Domain erfolgreich integriert

### 🐛 Bug Fixes

- **Redirect-Bug behoben:** Callbacks landen jetzt korrekt auf der aufrufenden Domain
  - Problem: URLs mit Kommas und fehlenden Doppelpunkten (`https//`)
  - Lösung: Neue `normalizeUrl()` Funktion in `src/utils/redirect.js`
- **Base64url-Dekodierung:** Manuelle Implementierung für bessere Kompatibilität
  - Ersetzt: `Buffer.from(stateRaw, 'base64url')` 
  - Mit: Manueller base64url-Dekodierung

### 📚 Dokumentation

- **INTEGRATION_GUIDE.md:** Umfassende Troubleshooting-Sektion hinzugefügt
  - Problem: "Callback landet auf falscher Domain"
  - 6 Unterkapitel mit Lösungen, Code-Beispielen und Testing-Workflow
- **REDIRECT_DEBUG_GUIDE.md:** Technische Deep-Dive Dokumentation
- **Beispieldateien:**
  - `examples/admin.html` - Benefizshow Admin (aktualisiert)
  - `examples/benefizshow-admin-example.html` - Vollständiges Login-Beispiel
  - `examples/benefizshow-callback-example.html` - Callback-Handler-Beispiel

### 🔧 Technische Änderungen

**`src/utils/redirect.js`:**
```javascript
// Neu: URL-Normalisierung
function normalizeUrl(url) {
  - Korrigiert https// → https://
  - Entfernt Komma-getrennte Teile
  - Validiert URL-Format mit new URL()
}

// TRUSTED_DOMAINS erweitert:
+ 'https://benefizshow.de'
+ 'https://www.benefizshow.de'
```

**`src/routes/auth.js`:**
```javascript
// Alle OAuth-Callbacks erweitert mit:
+ console.log('📦 Raw state parameter:', stateRaw);
+ console.log('📦 Decoded state:', decoded);
+ console.log('📦 Parsed state object:', JSON.stringify(state, null, 2));

// Manuelle Base64url-Dekodierung:
- Buffer.from(stateRaw, 'base64url')
+ const base64 = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
+ const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
+ Buffer.from(padded, 'base64').toString('utf8')
```

### ⚠️ Breaking Changes

Keine.

### 🔄 Migration

Wenn Sie eine **alte AUTH_BASE URL** verwenden:

```javascript
// ❌ ALT - Bitte aktualisieren!
const AUTH_BASE = 'https://auth-baustein.vercel.app/api';

// ✅ NEU - Production URL
const AUTH_BASE = 'https://accounts.revalenz.de/api';
```

### 📊 Status

- **Deployments:** ✅ Erfolgreich deployed
- **Getestete Domains:**
  - ✅ www.revalenz.de
  - ✅ revalenz.de
  - ✅ benefizshow.de
  - ✅ localhost (Dev)

---

## [2.0.0] - 2025-10-08

### 🚀 Umstellung auf OAuth-Only

- **Entfernt:** E-Mail/Passwort-Registrierung
- **Entfernt:** E-Mail-Verifizierung
- **Entfernt:** Passwort-Reset
- **Fokus:** Ausschließlich OAuth (Google, GitHub, Microsoft)

### Warum OAuth-Only?

- **Sicherheit:** Keine Passwort-Speicherung, keine Leaks
- **Einfachheit:** Weniger Code, keine E-Mail-Services
- **Bessere UX:** 1-Click-Login
- **Kosten:** Keine E-Mail-Service-Gebühren

### Datenbank-Schema

**Tabellen:**
- `users` - OAuth-Benutzer (provider, provider_id, email, role)
- `tenants` - Mandanten für Multi-Tenant
- `tenant_admins` - Zuordnung
- `user_sessions` - Session-Management
- `workshop_registrations` - Workshop-Anmeldungen

---

## [1.0.0] - 2025-09-25

### 🎉 Initial Release

- **OAuth-Provider:** Google, GitHub, Microsoft
- **JWT-Token-Generierung:** HS256, 1h Lebensdauer
- **Multi-Tenant-Support:** Mandanten-Verwaltung
- **PostgreSQL-Integration:** Neon.tech
- **Vercel-Deployment:** Automatisch via GitHub

### Architektur

```
Auth-Baustein (accounts.revalenz.de)
  ↓
OAuth-Provider (Google, GitHub, Microsoft)
  ↓
JWT-Token-Generierung
  ↓
Redirect zu Client-Website mit Token
```

### Endpoints

- `GET /api/auth/oauth/google`
- `GET /api/auth/oauth/google/callback`
- `GET /api/auth/oauth/github`
- `GET /api/auth/oauth/github/callback`
- `GET /api/auth/oauth/microsoft`
- `GET /api/auth/oauth/microsoft/callback`
- `GET /api/auth/me`
- `POST /api/auth/login` (API-Key)
- `GET /api/auth/user-status`

---

## Versionierung

Wir verwenden [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking Changes
- **MINOR**: Neue Features (abwärtskompatibel)
- **PATCH**: Bug Fixes

---

## Links

- **Repository:** https://github.com/revalenz-gmbh/auth-baustein
- **Production:** https://accounts.revalenz.de
- **Documentation:** [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Security:** [SECURITY.md](./SECURITY.md)

---

## Contributors

- Martin Stolz (@martinstolz) - Initial work & Maintenance

---

**Made with ❤️ for the Revalenz Platform**

