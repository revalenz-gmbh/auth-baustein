-- ============================================================================
-- CLEANUP SCRIPT: Auth-Baustein auf reines OAuth-System umstellen
-- ============================================================================
-- 
-- Änderungen:
-- 1. Alte Tabellen entfernen (admins, licenses, etc.)
-- 2. Multi-Tenant-System BEHALTEN (für Ticket-System)
-- 3. E-Mail-Verifizierung ENTFERNEN (nur OAuth-Login)
-- 4. Passwort-Login ENTFERNEN (nur OAuth)
-- 
-- ACHTUNG: Erstelle vorher ein Backup in Neon!
-- ============================================================================

-- 1. Alte Admin-Tabellen entfernen
-- ============================================================================
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS allowed_admins CASCADE;

-- 2. Lizenz-System-Tabellen entfernen (gehören zum Console-Baustein)
-- ============================================================================
DROP TABLE IF EXISTS member_product_licenses CASCADE;
DROP TABLE IF EXISTS product_instances CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 3. E-Mail-Verifizierung entfernen (nicht benötigt bei reinem OAuth)
-- ============================================================================
DROP TABLE IF EXISTS email_verification_logs CASCADE;

-- 4. Users-Tabelle: Spalten für E-Mail/Passwort-Auth entfernen
-- ============================================================================
-- Passwort-bezogene Spalten entfernen
ALTER TABLE users DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expiry CASCADE;

-- E-Mail-Verifizierung entfernen (bei OAuth automatisch verifiziert)
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS verification_token_expires_at CASCADE;

-- Privacy Consent bleibt (wird bei OAuth-Login gesetzt)
-- ALTER TABLE users DROP COLUMN IF EXISTS privacy_consent; -- BEHALTEN
-- ALTER TABLE users DROP COLUMN IF EXISTS privacy_consent_at; -- BEHALTEN

-- 5. Sicherstellen, dass OAuth-relevante Spalten vorhanden sind
-- ============================================================================
-- Provider und Provider-ID sind Pflicht für OAuth
ALTER TABLE users ALTER COLUMN provider SET NOT NULL;
ALTER TABLE users ALTER COLUMN provider_id SET NOT NULL;

-- E-Mail bleibt als Identifikator, aber email_verified wird Boolean (einfacher)
ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT TRUE;
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

-- Status standardmäßig 'active' bei OAuth
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';

-- 6. Company-Spalte hinzufügen (falls noch nicht vorhanden)
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- 7. Constraints aktualisieren
-- ============================================================================
-- Provider + Provider ID müssen eindeutig sein (wichtig für OAuth)
DROP INDEX IF EXISTS users_provider_provider_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_provider_id_key 
ON users(provider, provider_id);

-- E-Mail bleibt eindeutig (ein Google-Account = ein User)
-- Die tenant_id + email Kombination wurde bereits in schema.sql definiert

-- 8. Indizes aufräumen
-- ============================================================================
-- Entferne Indizes für nicht mehr vorhandene Spalten
DROP INDEX IF EXISTS idx_users_verification_token;
DROP INDEX IF EXISTS idx_users_reset_token;

-- 9. Workshop-Registrierungen BEHALTEN
-- ============================================================================
-- Diese Tabelle wird weiterhin benötigt
-- (keine Änderungen)

-- 10. Multi-Tenant BEHALTEN
-- ============================================================================
-- tenants und tenant_admins bleiben für Ticket-System
-- (keine Änderungen)

-- 11. User-Sessions BEHALTEN
-- ============================================================================
-- Für erweiterte Session-Verwaltung
-- (keine Änderungen)

-- 12. Bestehende User aktualisieren
-- ============================================================================
-- Setze alle existierenden OAuth-User auf email_verified = TRUE
UPDATE users 
SET email_verified = TRUE, 
    status = 'active'
WHERE provider IN ('google', 'github', 'microsoft');

-- Lösche alle User OHNE OAuth-Provider (alte E-Mail/Passwort-Registrierungen)
-- ACHTUNG: Nur ausführen, wenn keine wichtigen User betroffen sind!
DELETE FROM users WHERE provider IS NULL OR provider = '';

-- 13. Überprüfung: Finale Tabellenstruktur
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

-- Zeige alle Spalten der users-Tabelle
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================================
-- ERWARTETE TABELLEN NACH CLEANUP:
-- ============================================================================
-- 1. users (nur OAuth-User)
-- 2. tenants (Multi-Tenant für Ticket-System)
-- 3. tenant_admins (Multi-Tenant-Zuordnung)
-- 4. user_sessions (Session-Management)
-- 5. workshop_registrations (Workshop-Anmeldungen)
-- ============================================================================

-- ============================================================================
-- ERWARTETE SPALTEN IN users-Tabelle:
-- ============================================================================
-- id, tenant_id, email, name, role, status, provider, provider_id,
-- api_key, email_verified, privacy_consent, privacy_consent_at,
-- company, created_at, updated_at
-- ============================================================================

-- ============================================================================
-- NÄCHSTE SCHRITTE:
-- ============================================================================
-- 1. Führe dieses Script in Neon aus
-- 2. Update auth.js: Entferne E-Mail/Passwort-Endpoints
-- 3. Update Frontend: Entferne E-Mail/Passwort-Login-UI
-- 4. Teste OAuth-Login (Google, GitHub, Microsoft)
-- ============================================================================

