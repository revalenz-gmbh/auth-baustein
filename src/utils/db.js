import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected db error', err);
});

export const query = (text, params) => pool.query(text, params);

// Schema-Initialisierung (idempotent). Für OSS-Nutzer praktisch: Tabellen werden
// beim ersten Start angelegt/ergänzt, falls sie fehlen.
export async function initSchema() {
  try {
    // Admins-Basistabelle (minimal, falls noch nicht vorhanden)
    await query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        api_key TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Zusätzliche Spalten/Indizes für OAuth
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS provider VARCHAR(64);`);
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admins_provider ON admins(provider, provider_id);`);
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'admins_provider_provider_id_key'
        ) THEN
          ALTER TABLE admins ADD CONSTRAINT admins_provider_provider_id_key UNIQUE (provider, provider_id);
        END IF;
      END $$;
    `);

    // Tenants & Zuordnung & Lizenzen
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS tenants_name_key ON tenants(LOWER(name));`);
    await query(`
      CREATE TABLE IF NOT EXISTS tenant_admins (
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        role VARCHAR(32) DEFAULT 'owner',
        PRIMARY KEY (tenant_id, admin_id)
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        plan VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {
    console.error('Schema init failed', e);
  }
}
