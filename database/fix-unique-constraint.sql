-- ============================================================================
-- FIX: Unique Constraint für OAuth-Provider fehlt
-- ============================================================================
-- 
-- Der OAuth-Flow schlägt fehl, weil der UNIQUE-Constraint auf 
-- (provider, provider_id) fehlt.
-- 
-- Führe dieses Script in Neon aus, um den Constraint hinzuzufügen.
-- ============================================================================

-- 1. Prüfe, ob der Constraint bereits existiert
-- ============================================================================
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
  AND conname LIKE '%provider%';

-- 2. Erstelle UNIQUE Index auf (provider, provider_id)
-- ============================================================================
-- Zunächst alle Duplikate entfernen (falls vorhanden)
-- Dies sollte keine Probleme machen, da wir gerade erst migriert haben

-- Prüfe auf Duplikate
SELECT provider, provider_id, COUNT(*) as count
FROM users
WHERE provider IS NOT NULL AND provider_id IS NOT NULL
GROUP BY provider, provider_id
HAVING COUNT(*) > 1;

-- Falls Duplikate existieren, behalte nur den neuesten Eintrag
DELETE FROM users a USING users b
WHERE a.id < b.id 
  AND a.provider = b.provider 
  AND a.provider_id = b.provider_id
  AND a.provider IS NOT NULL 
  AND a.provider_id IS NOT NULL;

-- 3. Erstelle den UNIQUE Constraint
-- ============================================================================
ALTER TABLE users 
ADD CONSTRAINT users_provider_provider_id_unique 
UNIQUE (provider, provider_id);

-- 4. Erstelle auch einen Index für bessere Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_provider_provider_id 
ON users(provider, provider_id) 
WHERE provider IS NOT NULL AND provider_id IS NOT NULL;

-- 5. Verifizierung
-- ============================================================================
-- Zeige alle Constraints auf der users-Tabelle
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
-- Du solltest jetzt einen Constraint sehen:
-- - users_provider_provider_id_unique | u | UNIQUE (provider, provider_id)
-- 
-- NACH diesem Fix sollte der OAuth-Login funktionieren!
-- ============================================================================

