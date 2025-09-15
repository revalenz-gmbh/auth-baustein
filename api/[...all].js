import { buildApp } from '../src/app.js';

const app = buildApp();

export default function handler(req, res) {
  // Vercel liefert Pfade inkl. "/api" – für Express entfernen
  try {
    if (req.url && req.url.startsWith('/api/')) {
      req.url = req.url.replace(/^\/api/, '');
    } else if (req.url === '/api') {
      req.url = '/';
    }
  } catch (_) {}
  return app(req, res);
}
