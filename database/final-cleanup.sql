-- ============================================================================
-- FINAL CLEANUP: Entferne ALLE alten Tabellen (die wieder aufgetaucht sind)
-- ============================================================================
-- 
-- Diese Tabellen wurden versehentlich wieder erstellt durch das alte schema.sql
-- Führe dieses Script aus, um sie endgültig zu entfernen.
-- 
-- ============================================================================

-- 1. Entferne alte Admin/Lizenz-Tabellen
-- ============================================================================
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS allowed_admins CASCADE;
DROP TABLE IF EXISTS member_product_licenses CASCADE;
DROP TABLE IF EXISTS product_instances CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- 2. Prüfe, ob Backup-Tabellen existieren und lösche sie (optional)
-- ============================================================================
DROP TABLE IF EXISTS users_backup_20241008 CASCADE;
DROP TABLE IF EXISTS tenants_backup_20241008 CASCADE;
DROP TABLE IF EXISTS workshop_registrations_backup_20241008 CASCADE;

-- 3. Stelle sicher, dass der UNIQUE Constraint existiert
-- ============================================================================
-- Entferne alte/falsche Constraints (falls vorhanden)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_provider_id_key;

-- Erstelle den korrekten UNIQUE Constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'users'::regclass 
        AND conname = 'users_provider_provider_id_unique'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_provider_provider_id_unique 
        UNIQUE (provider, provider_id);
    END IF;
END $$;

-- 4. Erstelle Index für Performance (falls nicht vorhanden)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_provider_provider_id 
ON users(provider, provider_id) 
WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

-- 5. Verifizierung: Zeige alle Tabellen
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

-- 6. Zeige alle Constraints auf users-Tabelle
-- ============================================================================
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass
ORDER BY conname;

-- ============================================================================
-- ERWARTETES ERGEBNIS:
-- ============================================================================
-- 
-- TABELLEN (nur 5):
-- 1. tenant_admins
-- 2. tenants
-- 3. user_sessions
-- 4. users
-- 5. workshop_registrations
-- 
-- CONSTRAINTS auf users (sollte enthalten):
-- - users_provider_provider_id_unique | u | UNIQUE (provider, provider_id)
-- 
-- ============================================================================
-- NACH diesem Script sollte OAuth funktionieren!
-- ============================================================================

