import { buildApp } from '../src/app.js';

const app = buildApp();

export default function handler(req, res) {
  return app(req, res);
}
