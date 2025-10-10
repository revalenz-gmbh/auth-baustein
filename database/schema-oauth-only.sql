-- ============================================================================
-- AUTH-BAUSTEIN SCHEMA - OAuth-Only (Google, GitHub, Microsoft)
-- ============================================================================
-- 
-- Simplified Auth-System:
-- - Nur OAuth-Login (keine E-Mail/Passwort-Registrierung)
-- - Multi-Tenant-Support (für Ticket-System)
-- - Automatische E-Mail-Verifizierung durch OAuth-Provider
-- 
-- ============================================================================

-- 1. Tenants-Tabelle (Multi-Tenant-Support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Standard-Tenant erstellen
INSERT INTO tenants (id, name, domain) 
VALUES (1, 'Revalenz GmbH', 'revalenz.de') 
ON CONFLICT (id) DO NOTHING;

-- 2. Users-Tabelle (OAuth-Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- OAuth-Provider (Pflichtfelder)
  provider VARCHAR(64) NOT NULL CHECK (provider IN ('google', 'github', 'microsoft')),
  provider_id VARCHAR(255) NOT NULL,
  
  -- User-Daten
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  company VARCHAR(255),
  
  -- Rolle und Status
  role VARCHAR(50) DEFAULT 'CLIENT' CHECK (role IN ('ADMIN', 'MANAGER', 'EXPERT', 'CLIENT')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  
  -- OAuth: E-Mail ist automatisch verifiziert
  email_verified BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Datenschutz-Zustimmung
  privacy_consent BOOLEAN DEFAULT FALSE,
  privacy_consent_at TIMESTAMP,
  
  -- API-Key (optional, für externe Integrationen)
  api_key TEXT UNIQUE,
  
  -- Zeitstempel
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(provider, provider_id),
  UNIQUE(tenant_id, email)
);

-- 3. Tenant-Admin-Zuordnung
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_admins (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, admin_id)
);

-- 4. User-Sessions (erweiterte Session-Verwaltung)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Workshop-Anmeldungen
-- ============================================================================
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workshop_type VARCHAR(100) DEFAULT 'kickstart',
  workshop_date DATE NOT NULL,
  company VARCHAR(255),
  experience TEXT,
  goals TEXT,
  message TEXT,
  status VARCHAR(50) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, workshop_date)
);

-- 6. Indizes für Performance
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- Tenant-Admins
CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant_id ON tenant_admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_admin_id ON tenant_admins(admin_id);

-- User-Sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Workshop-Registrierungen
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_date ON workshop_registrations(workshop_date);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_type ON workshop_registrations(workshop_type);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_status ON workshop_registrations(status);

-- 7. Trigger für updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at 
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_registrations_updated_at 
BEFORE UPDATE ON workshop_registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Kommentare für Dokumentation
-- ============================================================================
COMMENT ON TABLE users IS 'OAuth-only users (Google, GitHub, Microsoft)';
COMMENT ON COLUMN users.provider IS 'OAuth provider: google, github, microsoft';
COMMENT ON COLUMN users.provider_id IS 'Unique ID vom OAuth-Provider (z.B. Google sub)';
COMMENT ON COLUMN users.email_verified IS 'Immer TRUE bei OAuth (Provider verifiziert E-Mail)';
COMMENT ON COLUMN users.privacy_consent IS 'DSGVO-Zustimmung bei OAuth-Login';
COMMENT ON COLUMN users.role IS 'ADMIN, MANAGER, EXPERT, CLIENT';
COMMENT ON COLUMN users.status IS 'active, inactive, blocked';

COMMENT ON TABLE tenants IS 'Multi-Tenant-Support für Ticket-System';
COMMENT ON TABLE tenant_admins IS 'Zuordnung von Admins zu Tenants';
COMMENT ON TABLE user_sessions IS 'Session-Management für erweiterte Features';
COMMENT ON TABLE workshop_registrations IS 'Workshop-Anmeldungen (KIckstart, etc.)';

-- ============================================================================
-- BEISPIEL-QUERIES
-- ============================================================================

-- Alle OAuth-User anzeigen:
-- SELECT id, email, name, provider, role, status, created_at FROM users;

-- OAuth-Provider-Statistik:
-- SELECT 
--     provider,
--     COUNT(*) as user_count,
--     COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
-- FROM users
-- GROUP BY provider;

-- User mit Tenant-Info:
-- SELECT 
--     u.id, u.email, u.name, u.provider, u.role,
--     t.name as tenant_name
-- FROM users u
-- LEFT JOIN tenants t ON u.tenant_id = t.id;

-- ============================================================================
-- FERTIG! Schema für OAuth-Only Auth-System
-- ============================================================================

