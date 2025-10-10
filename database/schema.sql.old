-- Auth-Baustein Schema - Erweitert für Bausteine-System
-- Kompatibel mit Shared Types und Multi-Tenant-Support

-- Haupt-Tabelle für Benutzer (erweitert von admins)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER DEFAULT 1, -- Multi-Tenant-Support
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'CLIENT', -- ADMIN, MANAGER, EXPERT, CLIENT
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, pending, blocked
  password_hash TEXT,
  api_key TEXT UNIQUE,
  provider VARCHAR(64), -- google, github, microsoft, local
  provider_id VARCHAR(255),
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-Tabelle für Multi-Tenant-Support
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-Admin-Zuordnung
CREATE TABLE IF NOT EXISTS tenant_admins (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, admin_id)
);

-- Sessions-Tabelle für erweiterte Session-Verwaltung
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workshop-Anmeldungen Tabelle
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workshop_type VARCHAR(100) DEFAULT 'kickstart', -- kickstart, custom, etc.
  workshop_date DATE NOT NULL,
  company VARCHAR(255), -- Organisation (optional)
  experience TEXT, -- Vorkenntnisse (optional)
  goals TEXT, -- Ziele des Teilnehmers
  message TEXT, -- Nachricht (optional)
  status VARCHAR(50) DEFAULT 'registered', -- registered, confirmed, cancelled, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, workshop_date) -- Ein Benutzer kann sich nur einmal pro Termin anmelden
);

-- Constraints
DO $$ BEGIN
  -- Provider + Provider ID müssen eindeutig sein
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_provider_provider_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_provider_provider_id_key 
    UNIQUE (provider, provider_id) WHERE provider IS NOT NULL AND provider_id IS NOT NULL;
  END IF;
  
  -- E-Mail muss eindeutig pro Tenant sein
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_tenant_email_key 
    UNIQUE (tenant_id, email);
  END IF;
END $$;

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant_id ON tenant_admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admins_admin_id ON tenant_admins(admin_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_date ON workshop_registrations(workshop_date);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop_type ON workshop_registrations(workshop_type);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_status ON workshop_registrations(status);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_registrations_updated_at BEFORE UPDATE ON workshop_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Standard-Tenant erstellen (falls nicht vorhanden)
INSERT INTO tenants (id, name, domain) 
VALUES (1, 'Revalenz GmbH', 'revalenz.de') 
ON CONFLICT (id) DO NOTHING;

-- Migration: Bestehende admins zu users migrieren (falls vorhanden)
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
        ON CONFLICT (email) DO NOTHING;
        
        -- Admins-Tabelle nach Migration löschen
        DROP TABLE IF EXISTS admins CASCADE;
    END IF;
END $$;