import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createProject,
  deleteProject,
  getVisibleProject,
  listVisibleProjectDocs,
  saveProject,
  updateProjectImage,
} from '../services/projectStore.js';
import { broadcastToProject } from '../services/realtimeHub.js';
import multer from 'multer';

const router = Router();

// POST /api/projects -> crea un proyecto nuevo para el usuario.
router.post('/projects', requireAuth, (req, res) => {
  const doc = createProject(req.user, req.body || {});
  res.status(201).json(doc);
});

// GET /api/projects -> proyectos visibles para el usuario.
router.get('/projects', requireAuth, (req, res) => {
  res.json(listVisibleProjectDocs(req.user));
});

// GET /api/projects/:id -> documento del proyecto (requiere miembro activo).
router.get('/projects/:id', requireAuth, (req, res) => {
  const doc = getVisibleProject(req.user, req.params.id);
  if (!doc) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(doc);
});

// PUT /api/projects/:id -> guarda con CAS por versión (If-Match).
router.put('/projects/:id', requireAuth, (req, res) => {
  const expected = Number(req.headers['if-match']);
  const result = saveProject(req.user, req.params.id, req.body, expected);
  if (result.error) return res.status(result.status).json({ error: result.error });
  if (result.conflict) {
    return res.status(409).json({ error: 'Conflicto de versión', remote: result.remote });
  }
  broadcastToProject(req.params.id, result.doc);
  res.json(result.doc);
});

// DELETE /api/projects/:id -> solo owner.
router.delete('/projects/:id', requireAuth, (req, res) => {
  const result = deleteProject(req.user, req.params.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ ok: true });
});

// POST /api/projects/:id/image -> sube/actualiza la portada (solo owner).
const upload = multer({ limits: { fileSize: 3 * 1024 * 1024 }, storage: multer.memoryStorage() });
router.post('/projects/:id/image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Falta el archivo' });
  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const result = updateProjectImage(req.user, req.params.id, dataUrl);
  if (result.error) return res.status(result.status).json({ error: result.error });
  broadcastToProject(req.params.id, result.doc);
  res.json(result.doc);
});

export default router;
