-- Migration Script: Von admins zu users Schema
-- Führt die Migration von der alten admins-Tabelle zur neuen users-Tabelle durch

-- 1. Backup der bestehenden Daten (falls vorhanden)
CREATE TABLE IF NOT EXISTS admins_backup AS 
SELECT * FROM admins WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins');

-- 2. Neue Tabellen erstellen (falls nicht vorhanden)
-- (Das neue Schema wird bereits in schema.sql erstellt)

-- 3. Daten von admins zu users migrieren
DO $$ 
BEGIN
    -- Prüfen ob admins-Tabelle existiert
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
        -- Bestehende Admins zu users migrieren
        INSERT INTO users (id, email, name, password_hash, api_key, provider, provider_id, role, status, created_at)
        SELECT 
            id, 
            email, 
            name, 
            password_hash, 
            api_key, 
            provider, 
            provider_id, 
            'ADMIN' as role, 
            'active' as status, 
            created_at
        FROM admins
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            api_key = EXCLUDED.api_key,
            provider = EXCLUDED.provider,
            provider_id = EXCLUDED.provider_id,
            role = 'ADMIN',
            status = 'active',
            updated_at = CURRENT_TIMESTAMP;
        
        -- Erfolgreiche Migration loggen
        RAISE NOTICE 'Migration completed: % admins migrated to users table', (SELECT COUNT(*) FROM admins);
        
        -- Admins-Tabelle nach erfolgreicher Migration löschen
        DROP TABLE IF EXISTS admins CASCADE;
        RAISE NOTICE 'Old admins table dropped successfully';
    ELSE
        RAISE NOTICE 'No admins table found - migration not needed';
    END IF;
END $$;

-- 4. Standard-Tenant erstellen (falls nicht vorhanden)
INSERT INTO tenants (id, name, domain) 
VALUES (1, 'Revalenz GmbH', 'revalenz.de') 
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    domain = EXCLUDED.domain,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Alle bestehenden Admins als Tenant-Admins zuweisen
INSERT INTO tenant_admins (tenant_id, admin_id)
SELECT 1, id FROM users WHERE role = 'ADMIN'
ON CONFLICT (tenant_id, admin_id) DO NOTHING;

-- 6. Migration-Status prüfen
DO $$
DECLARE
    user_count INTEGER;
    tenant_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMIN';
    
    RAISE NOTICE 'Migration Status:';
    RAISE NOTICE '- Users: %', user_count;
    RAISE NOTICE '- Tenants: %', tenant_count;
    RAISE NOTICE '- Admins: %', admin_count;
    
    IF user_count > 0 AND tenant_count > 0 THEN
        RAISE NOTICE 'Migration completed successfully!';
    ELSE
        RAISE WARNING 'Migration may have issues - please check manually';
    END IF;
END $$;
