import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.js';

export function buildApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  const allowedOrigins = (process.env.CORS_ORIGINS || 'https://benefizshow.de,https://www.benefizshow.de').split(',').map(s => s.trim());
  app.use(cors({
    origin: function(origin, callback){
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET','POST','OPTIONS']
  }));
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
