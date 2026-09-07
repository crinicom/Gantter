import { v4 as uuidv4 } from 'uuid';

export const MEMBER_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
};

export const MEMBER_STATUS = {
  INVITED: 'invited',
  ACTIVE: 'active',
};

export function createInvitedMember({ name, email, invitedBy }) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: name || (email ? email.split('@')[0] : 'Invitado'),
    email,
    role: MEMBER_ROLES.MEMBER,
    status: MEMBER_STATUS.INVITED,
    invitedBy: invitedBy || null,
    invitedAt: now,
    updatedAt: now,
  };
}

// Iniciales humanas (v1): primera letra de las primeras dos palabras.
export function initialsOf(name) {
  const clean = (name || '').trim();
  if (!clean) return '';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function normalizeMember(member) {
  const name = member?.name || '';
  return {
    id: member?.id ?? null,
    name,
    email: member?.email || '',
    initials: member?.initials || initialsOf(name),
    role: member?.role || MEMBER_ROLES.MEMBER,
    status: member?.status || MEMBER_STATUS.ACTIVE,
    invitedBy: member?.invitedBy ?? null,
    invitedAt: member?.invitedAt || null,
    updatedAt: member?.updatedAt || member?.invitedAt || null,
  };
}