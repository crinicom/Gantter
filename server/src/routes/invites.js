import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  acceptInvite,
  createInvite,
  revokeMember,
} from '../services/projectStore.js';
import { broadcastToProject } from '../services/realtimeHub.js';

const router = Router();

// POST /api/projects/:id/invites   (owner)
router.post('/projects/:id/invites', requireAuth, (req, res) => {
  const result = createInvite(req.user, req.params.id, req.body || {});
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ memberId: result.memberId, token: result.token });
});

// POST /api/invites/:token/accept  (cualquier autenticado)
router.post('/invites/:token/accept', requireAuth, (req, res) => {
  const result = acceptInvite(req.user, req.params.token);
  if (result.error) return res.status(result.status).json({ error: result.error });
  broadcastToProject(result.doc.id, result.doc);
  res.json(result.doc);
});

// DELETE /api/projects/:id/members/:memberId   (owner)
router.delete('/projects/:id/members/:memberId', requireAuth, (req, res) => {
  const result = revokeMember(req.user, req.params.id, req.params.memberId);
  if (result.error) return res.status(result.status).json({ error: result.error });
  broadcastToProject(result.doc.id, result.doc);
  res.json(result.doc);
});

export default router;
