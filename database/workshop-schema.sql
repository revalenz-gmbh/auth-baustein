-- ============================================================================
-- WORKSHOP-MANAGEMENT SCHEMA FÜR NEON DATABASE
-- ============================================================================
-- 
-- Dieses SQL-Script erstellt die notwendigen Tabellen für das Workshop-Management
-- im Auth-Baustein. Führen Sie dieses Script in Ihrem Neon SQL-Editor aus.
--
-- Voraussetzungen:
-- - PostgreSQL Database (Neon)
-- - Bestehende 'users' Tabelle
-- - Admin-Berechtigung für Schema-Änderungen
--
-- ============================================================================

-- 1. Workshop-Anmeldungen Tabelle erstellen
-- ============================================================================

CREATE TABLE IF NOT EXISTS workshop_registrations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workshop_type VARCHAR(50) DEFAULT 'kickstart',
    workshop_date DATE NOT NULL,
    company VARCHAR(255),
    experience TEXT,
    goals TEXT NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, workshop_date) -- Ein Benutzer kann sich nur einmal pro Workshop anmelden
);

-- 2. Indexes für bessere Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_date ON workshop_registrations(workshop_date);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_status ON workshop_registrations(status);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_created_at ON workshop_registrations(created_at);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_type ON workshop_registrations(workshop_type);

-- 3. Trigger-Funktion für automatische updated_at Updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Trigger auf workshop_registrations anwenden
-- ============================================================================

DROP TRIGGER IF EXISTS update_workshop_registrations_updated_at ON workshop_registrations;
CREATE TRIGGER update_workshop_registrations_updated_at 
    BEFORE UPDATE ON workshop_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Test-Daten einfügen (optional)
-- ============================================================================

-- Nur ausführen, wenn Sie Test-Daten benötigen
-- INSERT INTO workshop_registrations (user_id, workshop_date, goals, company, experience) 
-- VALUES 
--     (1, '2024-02-15', 'Lernen, wie man Websites mit AI erstellt', 'Beispiel GmbH', 'Grundkenntnisse in Webentwicklung'),
--     (1, '2024-03-15', 'Vertiefung der AI-Webentwicklung', 'Beispiel GmbH', 'Erfahrung mit React');

-- 6. Nützliche Abfragen für das Admin-Dashboard
-- ============================================================================

-- Gesamt-Anmeldungen
-- SELECT COUNT(*) as total_registrations FROM workshop_registrations;

-- Anmeldungen nach Status
-- SELECT status, COUNT(*) as count 
-- FROM workshop_registrations 
-- GROUP BY status;

-- Anmeldungen nach Monat
-- SELECT 
--     DATE_TRUNC('month', created_at) as month,
--     COUNT(*) as registrations
-- FROM workshop_registrations 
-- GROUP BY month 
-- ORDER BY month DESC;

-- Benutzer mit den meisten Anmeldungen
-- SELECT 
--     u.name,
--     u.email,
--     COUNT(wr.id) as workshop_count
-- FROM users u
-- LEFT JOIN workshop_registrations wr ON u.id = wr.user_id
-- GROUP BY u.id, u.name, u.email
-- ORDER BY workshop_count DESC;

-- Kommende Workshops
-- SELECT 
--     wr.id,
--     u.name,
--     u.email,
--     wr.company,
--     wr.workshop_date,
--     wr.status
-- FROM workshop_registrations wr
-- JOIN users u ON wr.user_id = u.id
-- WHERE wr.workshop_date > CURRENT_DATE
-- ORDER BY wr.workshop_date;

-- ============================================================================
-- HINWEISE FÜR DIE VERWENDUNG
-- ============================================================================

-- 1. Führen Sie dieses Script Schritt für Schritt aus, nicht alles auf einmal
-- 2. Überprüfen Sie die Tabellen-Struktur nach der Ausführung
-- 3. Testen Sie die API-Endpunkte mit echten Daten
-- 4. Passen Sie die Indexes nach Bedarf an (je nach Abfrage-Mustern)
-- 5. Erwägen Sie Partitionierung für große Datenmengen

-- ============================================================================
-- ÜBERPRÜFUNG DER ERSTELLUNG
-- ============================================================================

-- Führen Sie diese Abfragen aus, um zu überprüfen, ob alles korrekt erstellt wurde:

-- Tabellen anzeigen
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workshop_registrations';

-- Tabellen-Struktur anzeigen
-- \d workshop_registrations

-- Indexes anzeigen
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'workshop_registrations';

-- Trigger anzeigen
-- SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'workshop_registrations';
