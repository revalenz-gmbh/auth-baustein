-- ============================================================================
-- CLEANUP SCRIPT: Alte/Ungenutzte Tabellen aus Neon Auth-Datenbank entfernen
-- ============================================================================
-- 
-- ACHTUNG: Dieses Script löscht Tabellen PERMANENT!
-- Erstelle vorher ein Backup, falls Daten erhalten bleiben sollen.
--
-- Führe dieses Script in deinem Neon SQL-Editor aus.
-- ============================================================================

-- 1. Alte Admin-Tabellen entfernen (wurden zu 'users' migriert)
-- ============================================================================

DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS allowed_admins CASCADE;

-- 2. Lizenz-System-Tabellen entfernen (gehören zum Console-Baustein)
-- ============================================================================
-- Diese Tabellen sollten in der Console-Baustein-Datenbank sein, nicht in Auth

DROP TABLE IF EXISTS member_product_licenses CASCADE;
DROP TABLE IF EXISTS product_instances CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 3. Multi-Tenant-Tabellen (OPTIONAL) entfernen
-- ============================================================================
-- Nur ausführen, wenn du KEIN Multi-Tenant-System verwenden möchtest
-- KOMMENTIERE DIE FOLGENDEN ZEILEN AUS, WENN DU MULTI-TENANT BEHALTEN WILLST:

-- DROP TABLE IF EXISTS tenant_admins CASCADE;
-- DROP TABLE IF EXISTS tenants CASCADE;

-- Wenn du Multi-Tenant behältst, solltest du auch die tenant_id-Spalte in users behalten
-- Wenn du Multi-Tenant entfernst, kannst du die Spalte optional entfernen:
-- ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;

-- 4. Überprüfung: Welche Tabellen sind jetzt noch vorhanden?
-- ============================================================================

SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- ERWARTETE TABELLEN NACH CLEANUP:
-- ============================================================================
-- 1. users (Haupttabelle für alle Benutzer)
-- 2. email_verification_logs (E-Mail-Verifizierung)
-- 3. user_sessions (Session-Management)
-- 4. workshop_registrations (Workshop-Anmeldungen)
-- Optional:
-- 5. tenants (falls Multi-Tenant gewünscht)
-- 6. tenant_admins (falls Multi-Tenant gewünscht)
-- ============================================================================

-- ============================================================================
-- NÄCHSTE SCHRITTE:
-- ============================================================================
-- 
-- 1. Führe dieses Script in Neon SQL-Editor aus
-- 2. Prüfe, ob alle Tabellen korrekt entfernt wurden
-- 3. Teste die Anwendung (Registrierung, Login, E-Mail-Verifizierung)
-- 4. Falls Fehler auftreten, prüfe die Logs in Vercel
-- 
-- Bei Problemen: Backup wiederherstellen und Script anpassen
-- ============================================================================

