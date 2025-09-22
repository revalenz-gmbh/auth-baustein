-- ============================================================================
-- EMAIL-VERIFIKATION SCHEMA FÜR NEON DATABASE
-- ============================================================================
-- 
-- Dieses SQL-Script erweitert die bestehende 'users' Tabelle um Email-Verifizierung
-- und erstellt die notwendigen Tabellen für das Verifizierungssystem.
-- Führen Sie dieses Script in Ihrem Neon SQL-Editor aus.
--
-- Voraussetzungen:
-- - PostgreSQL Database (Neon)
-- - Bestehende 'users' Tabelle
-- - Admin-Berechtigung für Schema-Änderungen
--
-- ============================================================================

-- 1. Users Tabelle um Email-Verifizierung erweitern
-- ============================================================================

-- Spalten für Email-Verifizierung hinzufügen
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMP;

-- 2. Email-Verifizierungs-Logs Tabelle erstellen
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('verification_sent', 'verification_clicked', 'verification_success', 'verification_failed', 'welcome_sent')),
    token VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes für bessere Performance
-- ============================================================================

-- Users Tabelle Indexes
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_privacy_consent ON users(privacy_consent);

-- Email-Verifizierungs-Logs Indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_user_id ON email_verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_email ON email_verification_logs(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_action ON email_verification_logs(action);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_created_at ON email_verification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_logs_token ON email_verification_logs(token);

-- 4. Trigger-Funktion für automatische updated_at Updates
-- ============================================================================

-- Diese Funktion sollte bereits existieren, aber zur Sicherheit:
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger für users Tabelle (falls noch nicht vorhanden)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Bereinigung abgelaufener Verifizierungs-Tokens (Cleanup-Funktion)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Lösche abgelaufene Verifizierungs-Tokens
    UPDATE users 
    SET verification_token = NULL, 
        verification_token_expires_at = NULL
    WHERE verification_token_expires_at < CURRENT_TIMESTAMP
    AND email_verified = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Lösche alte Log-Einträge (älter als 30 Tage)
    DELETE FROM email_verification_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Funktion zum Loggen von Email-Verifizierungs-Aktionen
-- ============================================================================

CREATE OR REPLACE FUNCTION log_email_verification_action(
    p_user_id INTEGER,
    p_email VARCHAR(255),
    p_action VARCHAR(50),
    p_token VARCHAR(255) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO email_verification_logs (
        user_id, email, action, token, ip_address, user_agent
    ) VALUES (
        p_user_id, p_email, p_action, p_token, p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Funktion zur Verifizierung einer Email-Adresse
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_user_email(
    p_token VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    user_id INTEGER,
    email VARCHAR(255),
    message TEXT
) AS $$
DECLARE
    v_user_id INTEGER;
    v_email VARCHAR(255);
    v_verified BOOLEAN;
BEGIN
    -- Prüfe Token und hole User-Daten
    SELECT id, email, email_verified
    INTO v_user_id, v_email, v_verified
    FROM users
    WHERE verification_token = p_token
    AND verification_token_expires_at > CURRENT_TIMESTAMP
    AND email_verified = FALSE;
    
    -- Token nicht gefunden oder abgelaufen
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::VARCHAR(255), 'Token ungültig oder abgelaufen'::TEXT;
        RETURN;
    END IF;
    
    -- Email bereits verifiziert
    IF v_verified THEN
        RETURN QUERY SELECT FALSE, v_user_id, v_email, 'Email bereits verifiziert'::TEXT;
        RETURN;
    END IF;
    
    -- Verifiziere Email
    UPDATE users 
    SET email_verified = TRUE,
        email_verified_at = CURRENT_TIMESTAMP,
        verification_token = NULL,
        verification_token_expires_at = NULL
    WHERE id = v_user_id;
    
    -- Logge erfolgreiche Verifizierung
    PERFORM log_email_verification_action(
        v_user_id, v_email, 'verification_success', p_token, p_ip_address, p_user_agent
    );
    
    RETURN QUERY SELECT TRUE, v_user_id, v_email, 'Email erfolgreich verifiziert'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 8. Bestehende User auf 'email_verified = true' setzen (falls gewünscht)
-- ============================================================================

-- WICHTIG: Nur ausführen, wenn alle bestehenden User bereits verifiziert sind!
-- UPDATE users SET email_verified = TRUE, email_verified_at = created_at WHERE email_verified IS NULL;

-- 9. Kommentare für Dokumentation
-- ============================================================================

COMMENT ON COLUMN users.email_verified IS 'Gibt an, ob die Email-Adresse verifiziert wurde';
COMMENT ON COLUMN users.email_verified_at IS 'Zeitstempel der Email-Verifizierung';
COMMENT ON COLUMN users.verification_token IS 'Token für Email-Verifizierung (temporär)';
COMMENT ON COLUMN users.verification_token_expires_at IS 'Ablaufzeit des Verifizierungs-Tokens';
COMMENT ON COLUMN users.privacy_consent IS 'Gibt an, ob der User der Datenschutzerklärung zugestimmt hat';
COMMENT ON COLUMN users.privacy_consent_at IS 'Zeitstempel der Datenschutz-Zustimmung';

COMMENT ON TABLE email_verification_logs IS 'Logs für Email-Verifizierungs-Aktionen';
COMMENT ON COLUMN email_verification_logs.action IS 'Art der Aktion: verification_sent, verification_clicked, verification_success, verification_failed, welcome_sent';

-- 10. Beispiel-Abfragen für Tests
-- ============================================================================

-- Alle unverifizierten User anzeigen:
-- SELECT id, email, name, created_at FROM users WHERE email_verified = FALSE;

-- Verifizierungs-Statistiken:
-- SELECT 
--     COUNT(*) as total_users,
--     COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
--     COUNT(CASE WHEN email_verified = FALSE THEN 1 END) as unverified_users
-- FROM users;

-- Abgelaufene Tokens bereinigen:
-- SELECT cleanup_expired_verification_tokens();

-- ============================================================================
-- SCRIPT ERFOLGREICH AUSGEFÜHRT
-- ============================================================================
