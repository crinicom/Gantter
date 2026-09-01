// Gestión de invitaciones y miembros (capa de servicio pluggable).
//
// En modo offline la "entrega" de una invitación se simula: el miembro se
// añade al proyecto con estado `invited` y pasa a `active` cuando una pestaña
// "entra como" ese usuario. Con un backend real, estas funciones invocarían la
// API del servidor (email de invitación, aceptación, revocación) manteniendo
// el mismo contrato (ver docs/backend-plan.md).

import { createInvitedMember, normalizeMember } from '../models/member';

export const InviteService = {
  // Devuelve un nuevo proyecto con el miembro invitado agregado.
  sendInvite(project, { name, email, invitedBy }) {
    const member = createInvitedMember({ name, email, invitedBy });
    return {
      member,
      project: { ...project, members: [...(project.members || []), member] },
    };
  },

  // Pasa a activo un miembro (simula la aceptación de la invitación).
  acceptInvite(project, memberId) {
    const members = (project.members || []).map((m) => {
      if (m.id !== memberId) return m;
      return { ...m, status: 'active', updatedAt: new Date().toISOString() };
    });
    return {
      member: members.find((m) => m.id === memberId),
      project: { ...project, members },
    };
  },

  // Elimina un miembro del proyecto.
  revokeMember(project, memberId) {
    return {
      project: { ...project, members: (project.members || []).filter((m) => m.id !== memberId) },
    };
  },

  // Normaliza una lista de miembros para presentarla en la UI.
  normalize(members) {
    return (members || []).map(normalizeMember);
  },
};

export default InviteService;