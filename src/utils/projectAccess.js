// Visibilidad de proyectos por usuario (owner o miembro activo).
// Usado por ProjectContext y la landing; espejo del modelo de invitaciones.

import { MEMBER_STATUS } from '../models/member';

export function isProjectVisible(project, user) {
  if (!user?.id || !project) return false;
  if (project.ownerId && project.ownerId === user.id) return true;
  const userEmail = (user?.email || '').trim().toLowerCase();
  return (project.members || []).some(
    (m) =>
      m.status === MEMBER_STATUS.ACTIVE &&
      (m.id === user.id ||
        (userEmail && (m.email || '').trim().toLowerCase() === userEmail)),
  );
}

export function visibleProjects(projects, user) {
  return (projects || []).filter((p) => isProjectVisible(p, user));
}