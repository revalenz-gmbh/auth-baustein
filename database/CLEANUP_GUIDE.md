# Datenbank-Cleanup Guide für Auth-Baustein

## Übersicht

Die aktuelle Neon-Datenbank für den Auth-Baustein enthält viele alte Tabellen aus früheren Entwicklungsphasen, die nicht mehr benötigt werden.

## Aktuelle Tabellen in Neon

### ✅ Benötigte Tabellen (BEHALTEN)

1. **users** - Haupttabelle für alle Benutzer (ADMIN, CLIENT, EXPERT, etc.)
2. **email_verification_logs** - Logs für E-Mail-Verifizierung
3. **user_sessions** - Session-Management für erweiterte Features
4. **workshop_registrations** - Workshop-Anmeldungen

### ❓ Optional (Multi-Tenant-Support)

5. **tenants** - Mandanten-Verwaltung (aktuell nur 1 Tenant: Revalenz GmbH)
6. **tenant_admins** - Zuordnung von Admins zu Mandanten

**Entscheidung:** Falls du Multi-Tenant in Zukunft nicht nutzen möchtest, können diese Tabellen gelöscht werden.

### ❌ Zu entfernende Tabellen (ALT/VERALTET)

7. **admins** - Alte Admin-Tabelle (wurde zu `users` migriert)
8. **allowed_admins** - Alte Zugriffsverwaltung (nicht mehr benötigt)
9. **entitlements** - Lizenz-System (gehört zum Console-Baustein)
10. **licenses** - Lizenz-System (gehört zum Console-Baustein)
11. **member_product_licenses** - Lizenz-System (gehört zum Console-Baustein)
12. **product_instances** - Lizenz-System (gehört zum Console-Baustein)
13. **products** - Lizenz-System (gehört zum Console-Baustein)

## Cleanup-Prozess

### Schritt 1: Backup erstellen

Bevor du Tabellen löschst, erstelle ein Backup in Neon:

1. Gehe zu deiner Neon-Datenbank
2. Wähle "Backups" im Menü
3. Erstelle einen manuellen Snapshot

### Schritt 2: Cleanup-Script ausführen

1. Öffne Neon SQL-Editor
2. Kopiere den Inhalt von `cleanup-old-tables.sql`
3. **WICHTIG:** Entscheide, ob du Multi-Tenant behalten willst:
   - **JA:** Kommentiere die Zeilen zu `tenants` und `tenant_admins` aus
   - **NEIN:** Lass sie aktiviert
4. Führe das Script aus

### Schritt 3: Verifizierung

Nach dem Cleanup sollten nur noch folgende Tabellen vorhanden sein:

#### Minimale Konfiguration (ohne Multi-Tenant):
- `users`
- `email_verification_logs`
- `user_sessions`
- `workshop_registrations`

#### Mit Multi-Tenant:
- `users`
- `email_verification_logs`
- `user_sessions`
- `workshop_registrations`
- `tenants`
- `tenant_admins`

### Schritt 4: Tests durchführen

Teste nach dem Cleanup:

1. ✅ Neue Registrierung (E-Mail/Passwort)
2. ✅ E-Mail-Verifizierung
3. ✅ Login (E-Mail/Passwort)
4. ✅ OAuth-Login (Google, GitHub, Microsoft)
5. ✅ Profile-Abruf
6. ✅ Workshop-Anmeldung

## Warum wurden diese Tabellen angelegt?

### Lizenz-System-Tabellen
- Ursprünglich war ein Lizenz-System im Auth-Baustein geplant
- Wurde später in den Console-Baustein ausgelagert
- Diese Tabellen sollten in der Console-Baustein-Datenbank sein

### Multi-Tenant-Tabellen
- Vorbereitung für Multi-Mandanten-System
- Aktuell nur 1 Mandant (Revalenz GmbH)
- Kann optional behalten werden für zukünftige Erweiterungen

### Alte Admin-Tabellen
- Aus früherem Entwicklungsstand
- Wurden zu `users`-Tabelle konsolidiert
- Nicht mehr benötigt

## Empfehlung

**Minimal-Setup (Empfohlen für Start):**
- Lösche alle veralteten Tabellen
- Behalte Multi-Tenant-Tabellen fürs Erste (schadet nicht)
- Falls später Multi-Tenant nicht gebraucht wird, kann es entfernt werden

**Begründung:**
- Saubere, übersichtliche Datenbank
- Weniger Verwirrung bei zukünftiger Entwicklung
- Bessere Performance (weniger Tabellen = schnellere Queries)
- Klare Trennung: Auth-Baustein = Authentifizierung, Console-Baustein = Lizenzen

## Weitere Cleanup-Schritte

Nach dem Tabellen-Cleanup solltest du auch prüfen:

### Code-Cleanup
- [ ] Entferne Referenzen zu gelöschten Tabellen aus `src/routes/auth.js`
- [ ] Prüfe, ob alte Endpoints noch vorhanden sind
- [ ] Update `schema.sql` auf die finale Struktur

### Dokumentation
- [ ] Update `README.md` mit finaler Datenbankstruktur
- [ ] Dokumentiere, welche Tabelle wofür zuständig ist
- [ ] API-Dokumentation aktualisieren

## Hilfe bei Problemen

Falls nach dem Cleanup Fehler auftreten:

1. **Prüfe Vercel-Logs:**
   ```bash
   vercel logs auth-baustein --follow
   ```

2. **Stelle Backup wieder her:**
   - Gehe zu Neon → Backups
   - Wähle deinen Snapshot
   - Restore durchführen

3. **Prüfe fehlende Tabellen:**
   - Führe `email-verification-schema.sql` erneut aus
   - Prüfe, ob alle benötigten Spalten vorhanden sind

## Support

Bei Fragen oder Problemen:
- Prüfe Vercel-Logs
- Prüfe Neon-Logs
- Checke `auth.js` auf fehlerhafte Tabellen-Referenzen

