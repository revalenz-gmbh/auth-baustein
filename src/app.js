import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import oidcRoutes from './routes/oidc.js';
import workshopRoutes from './routes/workshops.js';

export function buildApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  const defaults = ['https://benefizshow.de','https://www.benefizshow.de'];
  const envList = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaults, ...envList]));
  const corsOptions = {
    origin: true, // permissiv; Absicherung erfolgt über Auth/Scopes
    credentials: true, // wichtig für httpOnly Refresh-Cookies
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
  };
  // Manuelles CORS-Header-Setzen (failsafe) + cors() Middleware
  // Gibt Origin dynamisch zurück → funktioniert mit www.revalenz.de nach 301-Redirect
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin === '' ? '*' : origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json());

  // Simple in-memory rate limiter (per IP) for auth routes
  const buckets = new Map();
  const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15m
  const MAX_REQ = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
  app.use((req, res, next) => {
    const path = req.path || '';
    if (!path.startsWith('/auth') && !path.startsWith('/api/auth')) return next();
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
    const now = Date.now();
    const b = buckets.get(ip) || [];
    const recent = b.filter(ts => now - ts < WINDOW_MS);
    recent.push(now);
    buckets.set(ip, recent);
    if (recent.length > MAX_REQ) {
      return res.status(429).json({ success: false, message: 'Too many requests' });
    }
    next();
  });

  app.get('/', (req, res) => res.json({ name: 'auth-baustein', status: 'ok' }));
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-baustein' }));
  // OIDC/JWKS well-known endpoints at root
  app.use('/', oidcRoutes);
  app.use('/auth', authRoutes);
  app.use('/workshops', workshopRoutes);

  // 404
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Not found', path: req.originalUrl });
  });

  // Error
  app.use((err, req, res, next) => {
    console.error('Server error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  });

  return app;
}
