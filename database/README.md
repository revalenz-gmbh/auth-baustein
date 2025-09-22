# Datenbank-Setup für Email-Verifizierung

## Übersicht
Dieses Verzeichnis enthält die SQL-Scripts für die Email-Verifizierung im Auth-Baustein.

## Scripts

### 1. `email-verification-schema.sql`
**Zweck:** Erweitert die bestehende `users` Tabelle um Email-Verifizierung und erstellt Logging-Tabellen.

**Was wird erstellt/erweitert:**
- `users` Tabelle um Email-Verifizierungs-Felder erweitert
- `email_verification_logs` Tabelle für Logging
- Funktionen für Token-Verwaltung und Bereinigung
- Indexes für bessere Performance

## Ausführung in Neon Database

### Schritt 1: Neon Console öffnen
1. Gehe zu [Neon Console](https://console.neon.tech/)
2. Wähle dein Projekt aus
3. Klicke auf "SQL Editor"

### Schritt 2: SQL-Script ausführen
1. Kopiere den Inhalt von `email-verification-schema.sql`
2. Füge ihn in den SQL Editor ein
3. Klicke auf "Run" oder drücke `Ctrl+Enter`

### Schritt 3: Überprüfung
Nach der Ausführung sollten folgende Spalten in der `users` Tabelle vorhanden sein:
- `email_verified`
- `email_verified_at`
- `verification_token`
- `verification_token_expires_at`
- `privacy_consent`
- `privacy_consent_at`

Und eine neue Tabelle `email_verification_logs` sollte erstellt worden sein.

## Wichtige Hinweise

⚠️ **Backup:** Erstelle vor der Ausführung ein Backup deiner Datenbank!

✅ **Kompatibilität:** Das Script ist idempotent - es kann mehrfach ausgeführt werden ohne Schäden.

🔄 **Bestehende User:** Bestehende User haben standardmäßig `email_verified = false`. Du kannst sie manuell auf `true` setzen, wenn sie bereits verifiziert sind.

## Troubleshooting

### Fehler: "Column already exists"
Das Script ist idempotent und kann mehrfach ausgeführt werden. Dieser Fehler ist normal.

### Fehler: "Permission denied"
Stelle sicher, dass dein Neon-User die Berechtigung hat, Tabellen zu erstellen und zu ändern.

### Fehler: "Function already exists"
Die Funktionen werden mit `CREATE OR REPLACE` erstellt, daher ist dieser Fehler normal.
