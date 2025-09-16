import dotenv from 'dotenv';
import { buildApp } from './app.js';
import { initSchema } from './utils/db.js';

dotenv.config();

await initSchema();
const app = buildApp();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`auth-baustein listening on :${PORT}`));
