import { buildApp } from '../src/app.js';

const app = buildApp();

export default function handler(req, res) {
  try {
    if (req.url && req.url.startsWith('/api')) {
      req.url = req.url.replace(/^\/api/, '') || '/';
    }
  } catch (_) {}
  return app(req, res);
}


