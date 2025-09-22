# Email-Verifizierung Guide

## Übersicht

Das Email-Verifizierungssystem ermöglicht es, neue Benutzer zu registrieren und ihre E-Mail-Adressen zu verifizieren, bevor sie vollständigen Zugang zu den Services erhalten.

## Funktionsweise

### 1. Registrierung
- Benutzer registrieren sich über `/auth/register-user` (Frontend) oder OAuth (Google)
- Neue Benutzer erhalten den Status `pending` und `email_verified: false`
- Ein Verifizierungs-Token wird generiert und per E-Mail gesendet

### 2. Email-Verifizierung
- Benutzer erhalten eine E-Mail mit einem Verifizierungs-Link
- Der Link führt zu `/verify-email?token=...`
- Nach erfolgreicher Verifizierung wird der Status auf `active` und `email_verified: true` gesetzt

### 3. Willkommens-E-Mail
- Nach erfolgreicher Verifizierung wird automatisch eine Willkommens-E-Mail gesendet

## Backend-Endpoints

### POST `/auth/register-user`
Registriert einen neuen Benutzer mit E-Mail-Verifizierung.

**Request Body:**
```json
{
  "name": "Max Mustermann",
  "email": "max@example.com",
  "password": "securepassword",
  "company": "Beispiel GmbH",
  "privacy_consent": true,
  "newsletter_consent": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registrierung erfolgreich. Bitte überprüfen Sie Ihre E-Mails.",
  "data": {
    "id": 123,
    "name": "Max Mustermann",
    "email": "max@example.com",
    "company": "Beispiel GmbH",
    "status": "pending"
  }
}
```

### GET `/auth/verify-email?token=...`
Verifiziert eine E-Mail-Adresse über den Token.

**Response:** HTML-Seite mit Erfolgsmeldung oder Fehler

### POST `/auth/resend-verification`
Sendet eine neue Verifizierungs-E-Mail.

**Request Body:**
```json
{
  "email": "max@example.com"
}
```

### GET `/auth/user-status`
Prüft den aktuellen Status eines Benutzers.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "max@example.com",
    "name": "Max Mustermann",
    "email_verified": true,
    "status": "active",
    "role": "CLIENT"
  }
}
```

## Datenbank-Schema

### Users-Tabelle Erweiterungen
```sql
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verified_at TIMESTAMP,
ADD COLUMN verification_token VARCHAR(255),
ADD COLUMN verification_token_expires_at TIMESTAMP,
ADD COLUMN privacy_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN privacy_consent_at TIMESTAMP;
```

### Email-Verifizierungs-Logs
```sql
CREATE TABLE email_verification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Frontend-Integration

### Email-Verifizierungs-Seite
- Route: `/verify-email`
- Komponente: `EmailVerification.tsx`
- Verarbeitet Verifizierungs-Token aus URL-Parametern

### Registrierungs-Seite
- Route: `/auth/register`
- Komponente: `RegistrationPage.tsx`
- Enthält Datenschutz-Checkbox und Newsletter-Option

### Verifizierungs-Banner
- Komponente: `EmailVerificationBanner.tsx`
- Wird auf allen Seiten für unverifizierte Benutzer angezeigt
- Ermöglicht erneutes Senden der Verifizierungs-E-Mail

## E-Mail-Konfiguration

### Umgebungsvariablen
```env
# SMTP-Konfiguration (Entwicklung)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SendGrid (Produktion)
SENDGRID_API_KEY=your_sendgrid_api_key

# Absender-E-Mail
FROM_EMAIL=noreply@revalenz.de

# Verifizierung
EMAIL_VERIFICATION_ENABLED=true
EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS=24
```

### E-Mail-Templates
- **Verifizierungs-E-Mail:** Professionelles HTML-Template mit Revalenz-Branding
- **Willkommens-E-Mail:** Übersicht der verfügbaren Services und nächsten Schritte

## Sicherheitsaspekte

### Token-Sicherheit
- Verifizierungs-Token sind 32 Zeichen lang (crypto.randomBytes)
- Token laufen nach 24 Stunden ab
- Token werden nach erfolgreicher Verifizierung gelöscht

### Datenschutz
- Datenschutz-Zustimmung ist Pflicht bei der Registrierung
- Newsletter-Anmeldung ist optional
- Alle E-Mail-Aktionen werden geloggt

### Rate Limiting
- Verifizierungs-E-Mails können nicht häufiger als alle 5 Minuten gesendet werden
- Abgelaufene Token werden automatisch bereinigt

## OAuth-Integration

### Google OAuth
- Neue OAuth-Benutzer erhalten automatisch den Status `pending`
- Verifizierungs-E-Mail wird automatisch gesendet
- Datenschutz-Zustimmung wird automatisch auf `true` gesetzt

### Workflow
1. Benutzer meldet sich mit Google an
2. Neuer Benutzer wird mit Status `pending` erstellt
3. Verifizierungs-E-Mail wird gesendet
4. Nach Verifizierung: Status wird auf `active` gesetzt
5. Willkommens-E-Mail wird gesendet

## Fehlerbehandlung

### Häufige Fehler
- **Token ungültig:** Token ist abgelaufen oder bereits verwendet
- **E-Mail bereits verifiziert:** Benutzer versucht bereits verifizierte E-Mail zu verifizieren
- **E-Mail bereits registriert:** E-Mail-Adresse ist bereits im System vorhanden

### Logging
- Alle Verifizierungs-Aktionen werden in `email_verification_logs` geloggt
- Fehler werden in der Konsole protokolliert
- E-Mail-Versand-Fehler blockieren nicht den Registrierungsprozess

## Testing

### Lokale Entwicklung
1. SMTP-Konfiguration für Gmail einrichten
2. App-Passwort für Gmail erstellen
3. Test-E-Mails an eigene Adresse senden

### Produktion
1. SendGrid-Account einrichten
2. API-Key in Umgebungsvariablen setzen
3. E-Mail-Templates testen

## Wartung

### Bereinigung
- Abgelaufene Token werden automatisch bereinigt
- Alte Log-Einträge (>30 Tage) werden gelöscht
- Funktion: `cleanup_expired_verification_tokens()`

### Monitoring
- Überwachung der E-Mail-Versand-Rate
- Prüfung der Verifizierungs-Erfolgsrate
- Monitoring der Token-Ablaufzeiten

## Troubleshooting

### E-Mails werden nicht gesendet
1. SMTP/SendGrid-Konfiguration prüfen
2. Firewall-Einstellungen überprüfen
3. Logs auf Fehler prüfen

### Verifizierung funktioniert nicht
1. Token-Gültigkeit prüfen
2. Datenbank-Verbindung testen
3. URL-Parameter validieren

### Frontend zeigt Banner nicht an
1. User-Status in AuthContext prüfen
2. E-Mail-Verifizierungs-Status überprüfen
3. Browser-Cache leeren
