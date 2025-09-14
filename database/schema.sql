-- Auth-Baustein Schema
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  api_key TEXT UNIQUE,
  provider VARCHAR(64),
  provider_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Constraints
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_provider_provider_id_key'
  ) THEN
    ALTER TABLE admins ADD CONSTRAINT admins_provider_provider_id_key UNIQUE (provider, provider_id);
  END IF;
END $$;

-- Indizes
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_provider ON admins(provider, provider_id);
