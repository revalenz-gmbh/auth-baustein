-- ============================================================================
-- Migration 006: WebAuthn Support (Biometrische Authentifizierung)
-- ============================================================================
-- Fügt Unterstützung für WebAuthn/FIDO2 hinzu:
-- - Fingerabdruck (Touch ID, Windows Hello)
-- - Gesichtserkennung (Face ID)
-- - Hardware-Sicherheitsschlüssel (YubiKey)
-- ============================================================================

-- Tabelle für WebAuthn Credentials
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Credential-Identifikation
  credential_id TEXT NOT NULL UNIQUE, -- Base64-encoded credential ID
  credential_public_key BYTEA NOT NULL, -- Public key für Signatur-Verifizierung
  
  -- Metadata
  counter BIGINT NOT NULL DEFAULT 0, -- Replay-Schutz Counter
  transports TEXT[], -- ['internal', 'usb', 'nfc', 'ble']
  
  -- Authenticator Info
  aaguid TEXT, -- Authenticator AAGUID
  credential_device_type TEXT, -- 'platform' oder 'cross-platform'
  credential_backed_up BOOLEAN DEFAULT false,
  
  -- User-Friendly Info
  nickname VARCHAR(255), -- z.B. "iPhone 15 Face ID", "MacBook Touch ID"
  last_used_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_credential_id_not_empty CHECK (length(credential_id) > 0),
  CONSTRAINT check_device_type CHECK (
    credential_device_type IN ('platform', 'cross-platform', NULL)
  )
);

-- Tabelle für WebAuthn Challenges (temporär)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255), -- Für Login-Flow ohne user_id
  
  challenge TEXT NOT NULL, -- Base64-encoded challenge
  type VARCHAR(50) NOT NULL, -- 'registration' oder 'authentication'
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- Challenge ist 5 Minuten gültig
  
  -- Constraints
  CONSTRAINT check_challenge_type CHECK (type IN ('registration', 'authentication')),
  CONSTRAINT check_user_or_email CHECK (
    (user_id IS NOT NULL) OR (email IS NOT NULL)
  )
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id 
  ON webauthn_credentials(user_id);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id 
  ON webauthn_credentials(credential_id);

CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_last_used 
  ON webauthn_credentials(last_used_at DESC);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id 
  ON webauthn_challenges(user_id) 
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_email 
  ON webauthn_challenges(email) 
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires 
  ON webauthn_challenges(expires_at);

-- Auto-Update Timestamp
CREATE OR REPLACE FUNCTION update_webauthn_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webauthn_credentials_updated_at
  BEFORE UPDATE ON webauthn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_webauthn_credentials_updated_at();

-- Cleanup alte Challenges (automatisch)
CREATE OR REPLACE FUNCTION cleanup_expired_webauthn_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges 
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Kommentare
COMMENT ON TABLE webauthn_credentials IS 
  'Speichert WebAuthn/FIDO2 Credentials für biometrische Authentifizierung';

COMMENT ON COLUMN webauthn_credentials.credential_id IS 
  'Base64-encoded Credential ID (eindeutig)';

COMMENT ON COLUMN webauthn_credentials.credential_public_key IS 
  'Public Key für Signatur-Verifizierung (CBOR-encoded)';

COMMENT ON COLUMN webauthn_credentials.counter IS 
  'Monotonic counter für Replay-Schutz';

COMMENT ON COLUMN webauthn_credentials.transports IS 
  'Unterstützte Transports: internal (platform), usb, nfc, ble';

COMMENT ON COLUMN webauthn_credentials.nickname IS 
  'User-sichtbarer Name (z.B. "iPhone Face ID", "MacBook Touch ID")';

COMMENT ON TABLE webauthn_challenges IS 
  'Temporäre WebAuthn Challenges (5 Minuten Gültigkeit)';

-- ============================================================================
-- BEISPIEL-QUERIES
-- ============================================================================

-- User-Credentials anzeigen:
-- SELECT 
--   wc.nickname,
--   wc.credential_device_type,
--   wc.last_used_at,
--   wc.created_at
-- FROM webauthn_credentials wc
-- WHERE wc.user_id = 1
-- ORDER BY wc.last_used_at DESC NULLS LAST;

-- Abgelaufene Challenges löschen:
-- SELECT cleanup_expired_webauthn_challenges();

-- ============================================================================
-- ERFOLG!
-- ============================================================================

