# Migration zu OAuth-Only Auth-System

## Übersicht

Das Auth-System wird auf ein reines OAuth-System umgestellt:

### ✅ Was bleibt:
- OAuth-Login (Google, GitHub, Microsoft)
- Multi-Tenant-Support (für Ticket-System)
- Workshop-Anmeldungen
- Session-Management

### ❌ Was entfernt wird:
- E-Mail/Passwort-Registrierung
- E-Mail-Verifizierung
- Passwort-Reset
- Alte Lizenz-System-Tabellen
- Alte Admin-Tabellen

## Vorteile von OAuth-Only

### Sicherheit
- ✅ Keine Passwort-Speicherung
- ✅ Keine Passwort-Leaks
- ✅ 2FA über OAuth-Provider
- ✅ E-Mail automatisch verifiziert

### Einfachheit
- ✅ Kein E-Mail-Versand
- ✅ Keine SMTP-Konfiguration
- ✅ Weniger Code zu warten
- ✅ Bessere UX (1-Click-Login)

### Kosten
- ✅ Kein E-Mail-Service (SendGrid, etc.)
- ✅ Weniger Serverkosten
- ✅ Weniger Datenbank-Komplexität

## Migration durchführen

### Schritt 1: Backup erstellen

**In Neon:**
1. Gehe zu deiner Datenbank
2. Wähle "Backups" → "Create Manual Backup"
3. Warte auf Bestätigung

### Schritt 2: Cleanup-Script ausführen

**In Neon SQL-Editor:**

```sql
-- Kopiere den Inhalt von cleanup-oauth-only.sql
-- und führe ihn Zeile für Zeile aus
```

**WICHTIG:** Prüfe vor dem Ausführen:
- Gibt es User ohne OAuth-Provider? (werden gelöscht!)
- Sind wichtige Daten betroffen?

### Schritt 3: Code anpassen

#### Backend: `auth.js` aufräumen

**Entferne folgende Endpoints:**
- ❌ `POST /auth/register-user` (E-Mail/Passwort-Registrierung)
- ❌ `POST /auth/verify-email` (E-Mail-Verifizierung)
- ❌ `GET /auth/verify-email` (E-Mail-Verifizierung)
- ❌ `POST /auth/resend-verification` (Neuen Verifizierungs-Link)
- ❌ `POST /auth/reset-password` (Passwort-Reset)
- ❌ `POST /auth/login` (E-Mail/Passwort-Login) - nur für `api_key` behalten

**Behalte folgende Endpoints:**
- ✅ `GET /auth/oauth/:provider` (OAuth-Start)
- ✅ `GET /auth/oauth/:provider/callback` (OAuth-Callback)
- ✅ `POST /auth/login` (nur für API-Key-Login)
- ✅ `POST /auth/refresh-token` (Token-Refresh)
- ✅ `POST /auth/logout` (Logout)
- ✅ `GET /auth/me` (User-Info)

#### Frontend: UI aufräumen

**Entferne aus `LoginDialog.tsx`:**
- ❌ E-Mail/Passwort-Felder
- ❌ "Registrieren"-Tab
- ❌ "Passwort vergessen"-Link
- ❌ Privacy-Checkbox (wird bei OAuth übergeben)

**Behalte:**
- ✅ OAuth-Buttons (Google, GitHub, Microsoft)
- ✅ "Mit Google anmelden", etc.

#### Entferne SMTP-Config

**Vercel Environment Variables (Auth-Baustein):**
- ❌ `SMTP_HOST`
- ❌ `SMTP_PORT`
- ❌ `SMTP_USER`
- ❌ `SMTP_PASS`
- ❌ `FROM_EMAIL`

**Behalte:**
- ✅ `FRONTEND_URL`
- ✅ `ALLOWED_ORIGINS`
- ✅ `AUTH_JWT_SECRET`
- ✅ `DATABASE_URL`
- ✅ OAuth-Secrets (Google, GitHub, Microsoft)

### Schritt 4: Tests durchführen

**Nach der Migration:**

1. ✅ OAuth-Login mit Google
2. ✅ OAuth-Login mit GitHub
3. ✅ OAuth-Login mit Microsoft
4. ✅ Profile-Abruf nach Login
5. ✅ Workshop-Anmeldung
6. ✅ Logout
7. ✅ Multi-Login (verschiedene Provider, gleiche E-Mail)

### Schritt 5: Dokumentation aktualisieren

- [ ] README.md (Auth-Baustein)
- [ ] API-Dokumentation
- [ ] Frontend-Dokumentation
- [ ] Deployment-Guides

## Code-Änderungen im Detail

### `auth.js` - Endpoints entfernen

```javascript
// ENTFERNEN:
router.post('/auth/register-user', async (req, res) => { ... });
router.post('/auth/verify-email', async (req, res) => { ... });
router.get('/auth/verify-email', async (req, res) => { ... });
router.post('/auth/resend-verification', async (req, res) => { ... });
router.post('/auth/reset-password', async (req, res) => { ... });

// BEHALTEN (aber vereinfachen):
router.post('/auth/login', async (req, res) => {
  // Nur für API-Key-Login
  const { api_key } = req.body;
  if (!api_key) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nur API-Key-Login verfügbar. Nutze OAuth für User-Login.' 
    });
  }
  // ... API-Key-Login-Logik
});
```

### `auth.js` - E-Mail-Service entfernen

```javascript
// ENTFERNEN:
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/email-service');

// Diese Funktionen werden nicht mehr benötigt
```

### `LoginDialog.tsx` - Vereinfachen

```tsx
// NEU: Nur OAuth-Buttons
export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  const handleOAuthLogin = (provider: 'google' | 'github' | 'microsoft') => {
    if (!acceptedTerms) {
      toast.error('Bitte akzeptiere die Datenschutzerklärung');
      return;
    }
    
    // Privacy Consent in OAuth-State einbetten
    const state = {
      returnUrl: window.location.origin,
      privacy_consent: { accepted: true, timestamp: new Date().toISOString() }
    };
    const stateB64 = btoa(JSON.stringify(state));
    
    window.location.href = `${API_URL}/api/auth/oauth/${provider}?state=${stateB64}`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anmelden</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Privacy Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms} 
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)} 
            />
            <Label htmlFor="terms">
              Ich akzeptiere die <a href="/datenschutz">Datenschutzerklärung</a>
            </Label>
          </div>
          
          {/* OAuth Buttons */}
          <Button 
            onClick={() => handleOAuthLogin('google')}
            disabled={!acceptedTerms}
            className="w-full"
          >
            <img src="/google-icon.svg" alt="Google" className="w-5 h-5 mr-2" />
            Mit Google anmelden
          </Button>
          
          <Button 
            onClick={() => handleOAuthLogin('github')}
            disabled={!acceptedTerms}
            className="w-full"
          >
            <Github className="w-5 h-5 mr-2" />
            Mit GitHub anmelden
          </Button>
          
          <Button 
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={!acceptedTerms}
            className="w-full"
          >
            <img src="/microsoft-icon.svg" alt="Microsoft" className="w-5 h-5 mr-2" />
            Mit Microsoft anmelden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Rollback-Plan

Falls Probleme auftreten:

### Sofort-Rollback (< 5 Minuten)
1. Gehe zu Neon → Backups
2. Wähle dein Backup vor der Migration
3. Restore durchführen
4. Redeploy Auth-Baustein mit altem Code

### Code-Rollback
1. Git: `git revert <commit-hash>`
2. Redeploy: `vercel --prod`

## Checkliste

### Vor der Migration
- [ ] Backup erstellt
- [ ] Alle User haben OAuth-Provider
- [ ] Keine wichtigen E-Mail/Passwort-User vorhanden
- [ ] OAuth-Credentials (Google, GitHub, Microsoft) konfiguriert

### Migration
- [ ] `cleanup-oauth-only.sql` ausgeführt
- [ ] Tabellen verifiziert (nur 5 Tabellen übrig)
- [ ] Users-Spalten verifiziert (keine password_hash, etc.)

### Nach der Migration
- [ ] OAuth-Login funktioniert (alle Provider)
- [ ] Profile-Abruf funktioniert
- [ ] Workshop-Anmeldung funktioniert
- [ ] Keine Fehler in Vercel-Logs
- [ ] Frontend deployed
- [ ] Backend deployed
- [ ] Dokumentation aktualisiert

## Support

Bei Problemen:
1. Prüfe Vercel-Logs: `vercel logs auth-baustein --follow`
2. Prüfe Neon-Logs
3. Teste mit `curl` oder Postman
4. Rollback falls nötig

## Zeitaufwand

- **Backup:** 1 Minute
- **SQL-Script:** 2 Minuten
- **Code-Cleanup:** 30 Minuten
- **Tests:** 15 Minuten
- **Dokumentation:** 15 Minuten

**Gesamt:** ~1 Stunde

## Ergebnis

Nach der Migration:
- ✅ Sauberes, einfaches Auth-System
- ✅ Nur OAuth (Google, GitHub, Microsoft)
- ✅ Multi-Tenant für Ticket-System
- ✅ Weniger Code, weniger Komplexität
- ✅ Bessere UX, höhere Sicherheit

