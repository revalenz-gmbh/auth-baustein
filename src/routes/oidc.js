import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Build a minimal JWKS from symmetric AUTH_JWT_SECRET (oct JWK)
function getOctJwk() {
  const secret = process.env.AUTH_JWT_SECRET || '';
  if (!secret) return null;
  const kid = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 16);
  const k = Buffer.from(secret, 'utf8').toString('base64');
  return { kty: 'oct', k, alg: 'HS256', use: 'sig', kid };
}

router.get('/.well-known/jwks.json', (req, res) => {
  try {
    const jwk = getOctJwk();
    if (!jwk) return res.status(500).json({ keys: [] });
    return res.json({ keys: [jwk] });
  } catch (e) {
    return res.status(500).json({ keys: [] });
  }
});

router.get('/.well-known/openid-configuration', (req, res) => {
  const issuer = process.env.BACKEND_URL || 'https://accounts.revalenz.de';
  const cfg = {
    issuer,
    authorization_endpoint: issuer + '/api/auth/oauth/google',
    token_endpoint: 'https://oauth2.googleapis.com/token',
    jwks_uri: issuer + '/.well-known/jwks.json',
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
  };
  return res.json(cfg);
});

export default router;


