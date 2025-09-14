import dotenv from 'dotenv';
import { buildApp } from './app.js';

dotenv.config();

const app = buildApp();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`auth-baustein listening on :${PORT}`));
