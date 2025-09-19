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
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);`);
    await query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);`);
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

    // Vereinfachtes Modell: Lizenzfelder direkt auf tenants ergänzen
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_plan VARCHAR(64);`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_status VARCHAR(32) DEFAULT 'active';`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_valid_until TIMESTAMP NULL;`);
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS license_meta JSONB;`);

    // Allowlist für Admin-E-Mails
    await query(`
      CREATE TABLE IF NOT EXISTS allowed_admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
        role VARCHAR(32) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Produkte-Registry (zentrale Liste verfügbarer Services)
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        key VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`
      INSERT INTO products (key, name)
      VALUES ('tickets','Ticketservice'), ('impulse','Impuls-Service')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Produkt-Instanzen (Benutzer-eigene Produkte)
    await query(`
      CREATE TABLE IF NOT EXISTS product_instances (
        id SERIAL PRIMARY KEY,
        product_key VARCHAR(64) NOT NULL REFERENCES products(key) ON DELETE RESTRICT,
        owner_admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_product_instances_owner ON product_instances(owner_admin_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_product_instances_tenant ON product_instances(tenant_id);`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS product_instances_tenant_unique ON product_instances(tenant_id, product_key, name);`);

    // Produktlizenzen pro Mitglied und Organisation
    await query(`
      CREATE TABLE IF NOT EXISTS member_product_licenses (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
        product_key VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        valid_until TIMESTAMP NULL,
        meta JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (tenant_id, admin_id, product_key)
      );
    `);

    // Vereinheitlichte Lizenztabelle (Org- und Member-Ebene)
    await query(`
      CREATE TABLE IF NOT EXISTS entitlements (
        id SERIAL PRIMARY KEY,
        tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        admin_id    INTEGER     NULL REFERENCES admins(id) ON DELETE CASCADE,
        product_key VARCHAR(64) NOT NULL,
        plan        VARCHAR(64),
        status      VARCHAR(32) NOT NULL DEFAULT 'active',
        valid_until TIMESTAMP NULL,
        meta        JSONB,
        product_instance_id INTEGER NULL REFERENCES product_instances(id) ON DELETE CASCADE,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_entitlements_admin   ON entitlements(admin_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_entitlements_tenant  ON entitlements(tenant_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_entitlements_product ON entitlements(product_key);`);

    // Für ON CONFLICT Targets: eindeutige (teil-)Indizes
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS entitlements_org_unique
      ON entitlements(tenant_id, product_key)
      WHERE admin_id IS NULL;
    `);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS entitlements_member_unique
      ON entitlements(tenant_id, admin_id, product_key)
      WHERE admin_id IS NOT NULL;
    `);

    // Zusätzlich echte UNIQUE-Constraint für (tenant_id, admin_id, product_key)
    // nötig, damit ON CONFLICT (tenant_id, admin_id, product_key) greift
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'entitlements'::regclass AND conname = 'entitlements_member_unique_constraint'
        ) THEN
          ALTER TABLE entitlements
          ADD CONSTRAINT entitlements_member_unique_constraint
          UNIQUE (tenant_id, admin_id, product_key);
        END IF;
      END $$;
    `);

    // Eindeutigkeit für Instanz-Lizenzen
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS entitlements_instance_unique
      ON entitlements(product_instance_id, admin_id)
      WHERE product_instance_id IS NOT NULL;
    `);

    // Scope: Entweder Org-Plan (tenant+product_key) ODER Instanz-Lizenz (instance+admin)
    await query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'entitlements_scope_check'
        ) THEN
          ALTER TABLE entitlements
          ADD CONSTRAINT entitlements_scope_check CHECK (
            (
              product_instance_id IS NULL AND product_key IS NOT NULL AND tenant_id IS NOT NULL
            ) OR (
              product_instance_id IS NOT NULL AND admin_id IS NOT NULL
            )
          );
        END IF;
      END $$;
    `);
  } catch (e) {
    console.error('Schema init failed', e);
  }
}
