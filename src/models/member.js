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

export function normalizeMember(member) {
  return {
    id: member?.id ?? null,
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || MEMBER_ROLES.MEMBER,
    status: member?.status || MEMBER_STATUS.ACTIVE,
    invitedBy: member?.invitedBy ?? null,
    invitedAt: member?.invitedAt || null,
    updatedAt: member?.updatedAt || member?.invitedAt || null,
  };
}