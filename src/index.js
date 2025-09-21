import dotenv from 'dotenv';
import { buildApp } from './app.js';
import { initSchema } from './utils/db.js';

dotenv.config();

// Versuche Schema zu initialisieren, aber starte Server auch bei Fehlern
try {
  await initSchema();
  console.log('✅ Database schema initialized successfully');
} catch (error) {
  console.warn('⚠️  Database schema initialization failed:', error.message);
  console.log('🚀 Starting server anyway (database features may be limited)');
}

const app = buildApp();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 auth-baustein listening on :${PORT}`));
