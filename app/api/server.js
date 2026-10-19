import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './index.js';
import { bridge } from './mesh.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'index.html');

if (fs.existsSync(INDEX_FILE)) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(INDEX_FILE);
  });
}

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.url} not found` });
});

const PORT = Number(process.env.API_PORT || process.env.PORT || 3001);
const HOST = process.env.API_HOST || '127.0.0.1';

bridge.connect();

const server = app.listen(PORT, HOST, () => {
  console.log(`Bee2Bee local gateway: http://${HOST}:${PORT}`);
  console.log(`UI: ${fs.existsSync(INDEX_FILE) ? 'serving app/dist' : 'run "npm run dev" for the Vite UI'}`);
  console.log('Endpoints: /api/p2p/register, /api/p2p/generate, /api/p2p/status');
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
