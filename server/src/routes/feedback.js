import { Router } from 'express';
import crypto from 'node:crypto';
import { getDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/feedback -> registra un feedback del usuario con su estado de sistema.
router.post('/feedback', requireAuth, (req, res) => {
  const { type, message, screen, systemState } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Falta el mensaje' });
  }
  const db = getDb();
  const entry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type: ['error', 'sugerencia', 'comentario'].includes(type) ? type : 'comentario',
    message: String(message).slice(0, 4000),
    screen: String(screen || ''),
    systemState: systemState || null,
    author: { id: req.user.id, name: req.user.name, email: req.user.email },
  };
  db.prepare('INSERT INTO feedback (id, document, created_at) VALUES (?, ?, ?)').run(
    entry.id,
    JSON.stringify(entry),
    entry.at,
  );
  res.status(201).json(entry);
});

// GET /api/feedback -> backlog para revisar en cada plan de acción (nuevo primero).
router.get('/feedback', requireAuth, (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare('SELECT document FROM feedback ORDER BY created_at DESC')
    .all();
  const list = rows
    .map((row) => {
      try {
        return JSON.parse(row.document);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  res.json(list);
});

export default router;
