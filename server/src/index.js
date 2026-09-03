import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import inviteRoutes from './routes/invites.js';
import realtimeRoutes from './routes/realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser());
app.use(express.json({ limit: '40mb' }));

app.use('/api', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', inviteRoutes);
app.use('/api', realtimeRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// En producción, servir el build de la SPA (dist/) con fallback de rutas.
const distDir = path.join(__dirname, '..', '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`Gantter server escuchando en :${PORT}`);
});
