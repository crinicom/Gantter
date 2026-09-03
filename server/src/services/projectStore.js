import { getDb } from '../db.js';
import crypto from 'node:crypto';

// La visibilidad en el servidor refleja la lógica del cliente
// (src/utils/projectAccess.js): el usuario ve un proyecto si es el owner o si
// existe un miembro activo cuyo member_id o email coincide con él.
function isMemberVisible(user, doc) {
  if (doc.ownerId && doc.ownerId === user.id) return true;
  const userEmail = (user.email || '').trim().toLowerCase();
  return (doc.members || []).some(
    (m) =>
      m.status === 'active' &&
      (m.id === user.id || (userEmail && (m.email || '').trim().toLowerCase() === userEmail)),
  );
}

export function normalizeProject(raw) {
  return raw && typeof raw === 'object' ? raw : {};
}

export function listVisibleProjectDocs(user) {
  const db = getDb();
  const rows = db.prepare('SELECT id, document FROM projects').all();
  return rows
    .map((row) => {
      let doc;
      try {
        doc = JSON.parse(row.document);
      } catch {
        return null;
      }
      return doc;
    })
    .filter((doc) => doc && isMemberVisible(user, doc));
}

export function getProjectRow(id) {
  const db = getDb();
  return db.prepare('SELECT id, document, version FROM projects WHERE id = ?').get(id);
}

export function getProjectDoc(id) {
  const row = getProjectRow(id);
  return row ? JSON.parse(row.document) : null;
}

// Devuelve el documento actual del proyecto para un usuario (o null).
export function getVisibleProject(user, id) {
  const doc = getProjectDoc(id);
  if (!doc) return null;
  return isMemberVisible(user, doc) ? doc : null;
}

export function createProject(user, { name, description }) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const doc = {
    id,
    name: name || 'Proyecto sin título',
    description: description || '',
    version: 0,
    ownerId: user.id,
    members: [
      {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        role: 'owner',
        status: 'active',
        invitedBy: null,
        invitedAt: now,
        updatedAt: now,
      },
    ],
    image: null,
    coverSeed: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    buckets: [],
    tasks: [],
  };
  db.transaction(() => {
    db.prepare(
      'INSERT INTO projects (id, document, version, owner_id, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, JSON.stringify(doc), 0, user.id, now);
    db.prepare(
      'INSERT OR REPLACE INTO project_members (project_id, user_id, member_id, status) VALUES (?, ?, ?, ?)',
    ).run(id, user.id, user.id, 'active');
  })();
  return doc;
}

// Guarda con control de concurrencia (CAS). Si la versión remota no coincide
// con la esperada devuelve { conflict: true, currentVersion, remote: doc }.
export function saveProject(user, id, doc, expectedVersion) {
  const db = getDb();
  const exists = db.prepare('SELECT version FROM projects WHERE id = ?').get(id);
  if (!exists) return { error: 'Proyecto no encontrado', status: 404 };

  if (typeof expectedVersion === 'number' && exists.version !== expectedVersion) {
    const current = db.prepare('SELECT document FROM projects WHERE id = ?').get(id);
    return {
      conflict: true,
      currentVersion: exists.version,
      remote: JSON.parse(current.document),
    };
  }

  const synced = { ...doc, version: exists.version + 1, updatedAt: new Date().toISOString() };
  db.transaction(() => {
    db.prepare(
      'UPDATE projects SET document = ?, version = ?, updated_at = ? WHERE id = ?',
    ).run(JSON.stringify(synced), synced.version, synced.updatedAt, id);
    if (doc.members) dbSyncMembers(db, id, doc);
  })();
  return { doc: synced };
}

function dbSyncMembers(db, projectId, doc) {
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
  const insert = db.prepare(
    'INSERT OR REPLACE INTO project_members (project_id, user_id, member_id, status) VALUES (?, ?, ?, ?)',
  );
  for (const m of doc.members || []) {
    const userId = m.id || m.email;
    insert.run(projectId, userId, m.id || m.email, m.status || 'active');
  }
}

export function deleteProject(user, id) {
  const db = getDb();
  const doc = getProjectDoc(id);
  if (!doc) return { error: 'Proyecto no encontrado', status: 404 };
  if (doc.ownerId !== user.id) return { error: 'Solo el propietario puede eliminar', status: 403 };
  db.transaction(() => {
    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  })();
  return { ok: true };
}

export function updateProjectImage(user, id, image) {
  const doc = getProjectDoc(id);
  if (!doc) return { error: 'Proyecto no encontrado', status: 404 };
  if (doc.ownerId !== user.id) return { error: 'Solo el propietario', status: 403 };
  const updated = { ...doc, image, updatedAt: new Date().toISOString() };
  const db = getDb();
  db.prepare('UPDATE projects SET document = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(updated),
    updated.updatedAt,
    id,
  );
  return { doc: updated };
}

// ---- Invitaciones ----

// Crea un miembro invitado en el documento + registro en `invites` (token).
export function createInvite(user, projectId, { name, email }) {
  const db = getDb();
  const doc = getProjectDoc(projectId);
  if (!doc) return { error: 'Proyecto no encontrado', status: 404 };
  if (doc.ownerId !== user.id) return { error: 'Solo el propietario puede invitar', status: 403 };

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { error: 'Email inválido', status: 400 };
  const already = (doc.members || []).some(
    (m) => (m.email || '').trim().toLowerCase() === cleanEmail,
  );
  if (already) return { error: 'Ya es miembro', status: 409 };

  const now = new Date().toISOString();
  const memberId = crypto.randomUUID();
  const member = {
    id: memberId,
    name: name || cleanEmail.split('@')[0],
    email: cleanEmail,
    role: 'member',
    status: 'invited',
    invitedBy: user.name || '',
    invitedAt: now,
    updatedAt: now,
  };
  const token = crypto.randomBytes(24).toString('hex');
  const updated = {
    ...doc,
    members: [...(doc.members || []), member],
    updatedAt: now,
    version: (doc.version || 0) + 1,
  };

  db.transaction(() => {
    db.prepare('UPDATE projects SET document = ?, version = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(updated),
      updated.version,
      now,
      projectId,
    );
    db.prepare(
      'INSERT INTO invites (token, project_id, member_id, email, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(token, projectId, memberId, cleanEmail, now);
  })();

  return { doc: updated, memberId, token };
}

// Acepta una invitación: vincula el member_id al user_id autenticado y lo activa.
export function acceptInvite(user, token) {
  const db = getDb();
  const invite = db.prepare('SELECT * FROM invites WHERE token = ?').get(token);
  if (!invite) return { error: 'Invitación no encontrada', status: 404 };

  const doc = getProjectDoc(invite.project_id);
  if (!doc) return { error: 'Proyecto no encontrado', status: 404 };

  const now = new Date().toISOString();
  const members = (doc.members || []).map((m) => {
    if (m.id !== invite.member_id) return m;
    return {
      ...m,
      id: user.id,
      status: 'active',
      updatedAt: now,
    };
  });
  const updated = { ...doc, members, updatedAt: now, version: (doc.version || 0) + 1 };

  db.transaction(() => {
    db.prepare('UPDATE projects SET document = ?, version = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(updated),
      updated.version,
      now,
      invite.project_id,
    );
    db.prepare('DELETE FROM invites WHERE token = ?').run(token);
    db.prepare(
      'INSERT OR REPLACE INTO project_members (project_id, user_id, member_id, status) VALUES (?, ?, ?, ?)',
    ).run(invite.project_id, user.id, user.id, 'active');
  })();

  return { doc: updated };
}

// Revoca un miembro del proyecto (solo owner).
export function revokeMember(user, projectId, memberId) {
  const db = getDb();
  const doc = getProjectDoc(projectId);
  if (!doc) return { error: 'Proyecto no encontrado', status: 404 };
  if (doc.ownerId !== user.id) return { error: 'Solo el propietario', status: 403 };

  const updated = {
    ...doc,
    members: (doc.members || []).filter((m) => m.id !== memberId),
    updatedAt: new Date().toISOString(),
    version: (doc.version || 0) + 1,
  };
  db.transaction(() => {
    db.prepare('UPDATE projects SET document = ?, version = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(updated),
      updated.version,
      updated.updatedAt,
      projectId,
    );
    db.prepare('DELETE FROM project_members WHERE project_id = ? AND member_id = ?').run(
      projectId,
      memberId,
    );
    db.prepare('DELETE FROM invites WHERE project_id = ? AND member_id = ?').run(projectId, memberId);
  })();
  return { doc: updated };
}

