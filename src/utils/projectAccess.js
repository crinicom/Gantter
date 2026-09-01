// Visibilidad de proyectos por usuario (owner o miembro activo).
// Usado por ProjectContext y la landing; espejo del modelo de invitaciones.

import { MEMBER_STATUS } from '../models/member';

export function isProjectVisible(project, user) {
  if (!user?.id || !project) return false;
  if (project.ownerId && project.ownerId === user.id) return true;
  return (project.members || []).some(
    (m) => m.id === user.id && m.status === MEMBER_STATUS.ACTIVE,
  );
}

export function visibleProjects(projects, user) {
  return (projects || []).filter((p) => isProjectVisible(p, user));
}