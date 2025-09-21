import { buildApp } from '../../../src/app.js';
const app = buildApp();
export default function handler(req, res) {
  // Vercel übergibt Pfade inkl. /api – für Express entfernen
  if (req.url && req.url.startsWith('/api/')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  return app(req, res);
}
