-- ============================================================================
-- QUICK FIX: Alle Probleme auf einmal beheben
-- ============================================================================
-- Kopiere diesen GESAMTEN Block und führe ihn in Neon aus!
-- ============================================================================

-- 1. Alle alten Tabellen löschen
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS allowed_admins CASCADE;
DROP TABLE IF EXISTS member_product_licenses CASCADE;
DROP TABLE IF EXISTS product_instances CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users_backup_20241008 CASCADE;
DROP TABLE IF EXISTS tenants_backup_20241008 CASCADE;
DROP TABLE IF EXISTS workshop_registrations_backup_20241008 CASCADE;

-- 2. Alle Duplikate in users entfernen
DELETE FROM users a USING users b
WHERE a.id < b.id 
  AND a.provider = b.provider 
  AND a.provider_id = b.provider_id
  AND a.provider IS NOT NULL 
  AND a.provider_id IS NOT NULL;

-- 3. Alte Constraints entfernen
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_provider_id_key;

-- 4. UNIQUE Constraint erstellen
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_provider_provider_id_unique;
ALTER TABLE users 
ADD CONSTRAINT users_provider_provider_id_unique 
UNIQUE (provider, provider_id);

-- 5. Index erstellen
DROP INDEX IF EXISTS idx_users_provider_provider_id;
CREATE INDEX idx_users_provider_provider_id 
ON users(provider, provider_id) 
WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

-- 6. PRÜFUNG: Zeige finale Tabellen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Du solltest NUR diese 5 Tabellen sehen:
-- tenant_admins, tenants, user_sessions, users, workshop_registrations

-- 7. PRÜFUNG: Zeige Constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'users'::regclass
AND conname LIKE '%provider%';

-- Du solltest sehen:
-- users_provider_provider_id_unique | UNIQUE (provider, provider_id)

