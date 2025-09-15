import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.js';

export function buildApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  const defaults = ['https://benefizshow.de','https://www.benefizshow.de'];
  const envList = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaults, ...envList]));
  const corsOptions = {
    origin: true, // permissiv; Absicherung erfolgt über Auth/Scopes
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET','POST','OPTIONS']
  };
  // Manuelles CORS-Header-Setzen (failsafe) + cors() Middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin === '' ? '*' : origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json());

  app.get('/', (req, res) => res.json({ name: 'auth-baustein', status: 'ok' }));
  app.use('/auth', authRoutes);

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
