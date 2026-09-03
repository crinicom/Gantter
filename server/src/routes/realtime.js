import { Router } from 'express';
import { getVisibleProject } from '../services/projectStore.js';
import { subscribe } from '../services/realtimeHub.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/realtime?projectId=...   (SSE/EventSource, por canal de proyecto)
router.get('/realtime', requireAuth, (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) return res.status(400).json({ error: 'Falta projectId' });

  const doc = getVisibleProject(req.user, projectId);
  if (!doc) return res.status(404).json({ error: 'Proyecto no encontrado' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  subscribe(projectId, res);

  req.on('close', () => clearInterval(heartbeat));
});

export default router;
