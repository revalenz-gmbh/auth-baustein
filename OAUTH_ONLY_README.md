# Auth-Baustein - OAuth-Only System

## Übersicht

Der Auth-Baustein wurde auf ein **reines OAuth-System** umgestellt. Es unterstützt ausschließlich:
- ✅ Google OAuth
- ✅ GitHub OAuth  
- ✅ Microsoft OAuth

❌ **Nicht mehr unterstützt:**
- E-Mail/Passwort-Registrierung
- E-Mail-Verifizierung
- Passwort-Reset
- SMTP-Konfiguration

## Warum OAuth-Only?

### Vorteile
- **Sicherheit:** Keine Passwort-Speicherung, keine Passwort-Leaks
- **Einfachheit:** Weniger Code, keine E-Mail-Service-Konfiguration
- **Bessere UX:** 1-Click-Login, automatische E-Mail-Verifizierung
- **Kosten:** Keine E-Mail-Service-Gebühren

### Multi-Tenant-Support
Das System behält den Multi-Tenant-Support für das Ticket-System bei:
- `tenants` - Mandanten-Verwaltung
- `tenant_admins` - Zuordnung von Admins zu Mandanten

## Datenbank-Schema

### Tabellen (5 gesamt)

1. **users** - OAuth-Benutzer
   - provider (google, github, microsoft)
   - provider_id (eindeutig pro Provider)
   - email, name, company
   - role (CLIENT, ADMIN, MANAGER, EXPERT)
   - status (active, inactive, blocked)
   - email_verified (automatisch TRUE bei OAuth)
   - privacy_consent, privacy_consent_at

2. **tenants** - Mandanten für Multi-Tenant
   - name, domain, settings

3. **tenant_admins** - Zuordnung
   - tenant_id, admin_id

4. **user_sessions** - Session-Management
   - user_id, session_token, expires_at

5. **workshop_registrations** - Workshop-Anmeldungen
   - user_id, workshop_type, workshop_date, status

## API-Endpoints

### OAuth-Authentifizierung

#### Google
```
GET /api/auth/oauth/google?state={base64_state}
GET /api/auth/oauth/google/callback?code={code}&state={state}
```

#### GitHub
```
GET /api/auth/oauth/github?state={base64_state}
GET /api/auth/oauth/github/callback?code={code}&state={state}
```

#### Microsoft
```
GET /api/auth/oauth/microsoft?state={base64_state}
GET /api/auth/oauth/microsoft/callback?code={code}&state={state}
```

#### State-Parameter
Der `state`-Parameter ist ein Base64-enkodiertes JSON-Objekt:
```json
{
  "returnUrl": "https://revalenz.de/member-area",
  "privacy_consent": {
    "accepted": true,
    "timestamp": "2024-10-08T12:00:00Z"
  }
}
```

### Weitere Endpoints

#### User-Info abrufen
```http
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "CLIENT",
    "status": "active"
  }
}
```

#### API-Key-Login (für automatisierte Systeme)
```http
POST /api/auth/login
Content-Type: application/json

{
  "api_key": "your-api-key"
}

Response:
{
  "success": true,
  "token": "jwt-token",
  "user": { ... }
}
```

#### User-Status prüfen
```http
GET /api/auth/user-status?email=user@example.com

Response:
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "status": "active",
    "emailVerified": true,
    "provider": "google"
  }
}
```

## Environment-Variablen

### Erforderlich

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
AUTH_JWT_SECRET=your-secret-key-here

# Frontend
FRONTEND_URL=https://revalenz.de
ALLOWED_ORIGINS=https://revalenz.de,https://revalenz-takeaction.vercel.app

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### NICHT MEHR BENÖTIGT (entfernen!)

```env
# ❌ SMTP-Konfiguration (nicht mehr benötigt)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=
```

## OAuth-Provider-Konfiguration

### Google
1. Gehe zu [Google Cloud Console](https://console.cloud.google.com/)
2. Erstelle ein neues Projekt oder wähle ein bestehendes
3. Aktiviere "Google+ API"
4. Erstelle OAuth 2.0 Credentials
5. Autorisierte Redirect-URIs:
   - `https://revalenz.de/api/auth/oauth/google/callback`
   - `http://localhost:4000/api/auth/oauth/google/callback` (dev)

### GitHub
1. Gehe zu [GitHub Developer Settings](https://github.com/settings/developers)
2. Erstelle eine neue OAuth App
3. Authorization callback URL:
   - `https://revalenz.de/api/auth/oauth/github/callback`
   - `http://localhost:4000/api/auth/oauth/github/callback` (dev)

### Microsoft
1. Gehe zu [Azure Portal](https://portal.azure.com/)
2. Registriere eine neue App unter "App registrations"
3. Redirect URIs:
   - `https://revalenz.de/api/auth/oauth/microsoft/callback`
   - `http://localhost:4000/api/auth/oauth/microsoft/callback` (dev)

## Deployment

### Vercel
```bash
cd bausteine/auth-baustein
vercel --prod
```

### Environment-Variablen setzen
```bash
vercel env add DATABASE_URL production
vercel env add AUTH_JWT_SECRET production
vercel env add GOOGLE_CLIENT_ID production
# ... etc.
```

## Migration von E-Mail/Passwort zu OAuth

### Bestehende User migrieren

Wenn du bestehende E-Mail/Passwort-User hast:

1. **Benachrichtige User** über Umstellung auf OAuth
2. **Lösche alte User** ohne OAuth-Provider:
   ```sql
   DELETE FROM users WHERE provider IS NULL;
   ```
3. **Oder: Manuelle Migration** - Bitte User, sich mit OAuth neu zu registrieren

### Datenbank-Cleanup

Siehe `database/cleanup-oauth-only.sql` für das komplette Cleanup-Script.

## Tests

### OAuth-Flow testen

1. **Google Login:**
   ```
   https://revalenz.de → "Mit Google anmelden" klicken
   ```

2. **GitHub Login:**
   ```
   https://revalenz.de → "Mit GitHub anmelden" klicken
   ```

3. **Microsoft Login:**
   ```
   https://revalenz.de → "Mit Microsoft anmelden" klicken
   ```

4. **Nach Login:** Prüfe, dass Token korrekt zurückgegeben wird und User eingeloggt ist

## Troubleshooting

### "oauth failed" Error
- Prüfe OAuth-Credentials (Client ID, Secret)
- Prüfe Redirect URIs in Provider-Konfiguration
- Prüfe Vercel-Logs: `vercel logs auth-baustein --follow`

### "No email available" (GitHub)
- GitHub-User muss eine öffentliche E-Mail haben
- Oder: GitHub-App braucht `user:email` Scope

### "Invalid token"
- Prüfe `AUTH_JWT_SECRET` (muss identisch in allen Bausteinen sein)
- Prüfe Token-Ablaufzeit (1 Stunde)

## Support

- **Vercel-Logs:** `vercel logs auth-baustein --follow`
- **Neon-Logs:** Neon Dashboard → SQL Editor → Logs
- **GitHub:** [Revalenz Platform Repo](https://github.com/your-repo)

## Changelog

### 2024-10-08 - OAuth-Only Migration
- ✅ E-Mail/Passwort-Registrierung entfernt
- ✅ E-Mail-Verifizierung entfernt
- ✅ SMTP-Konfiguration entfernt
- ✅ Nur OAuth (Google, GitHub, Microsoft)
- ✅ Multi-Tenant-Support beibehalten
- ✅ Datenbank-Cleanup durchgeführt
- ✅ Dokumentation aktualisiert

## Lizenz

Proprietary - Revalenz GmbH

