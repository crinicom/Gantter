import { describe, it, expect } from 'vitest';
import { InviteService } from '../inviteService';
import { MEMBER_ROLES, MEMBER_STATUS, createInvitedMember } from '../../models/member';

const emptyProject = { id: 'p1', name: 'P', members: [] };

describe('createInvitedMember', () => {
  it('crea un miembro invitado con rol member', () => {
    const m = createInvitedMember({ name: 'Ana', email: 'ana@local', invitedBy: 'D' });
    expect(m).toMatchObject({
      name: 'Ana',
      email: 'ana@local',
      invitedBy: 'D',
      role: MEMBER_ROLES.MEMBER,
      status: MEMBER_STATUS.INVITED,
    });
    expect(m.id).toBeTruthy();
    expect(m.invitedAt).toBeTruthy();
  });
});

describe('InviteService', () => {
  it('sendInvite agrega el miembro al proyecto', () => {
    const { project, member } = InviteService.sendInvite(emptyProject, {
      name: 'Carla',
      email: 'carla@local',
      invitedBy: 'D',
    });
    expect(project.members).toHaveLength(1);
    expect(project.members[0]).toEqual(member);
    expect(member.status).toBe(MEMBER_STATUS.INVITED);
  });

  it('acceptInvite pasa al miembro a activo', () => {
    const seeded = InviteService.sendInvite(emptyProject, {
      name: 'Carla',
      email: 'carla@local',
      invitedBy: 'D',
    });
    const { project, member } = InviteService.acceptInvite(seeded.project, seeded.member.id);
    expect(member.status).toBe(MEMBER_STATUS.ACTIVE);
    expect(project.members[0].status).toBe(MEMBER_STATUS.ACTIVE);
  });

  it('revokeMember elimina al miembro', () => {
    const seeded = InviteService.sendInvite(emptyProject, {
      name: 'Carla',
      email: 'carla@local',
      invitedBy: 'D',
    });
    const { project } = InviteService.revokeMember(seeded.project, seeded.member.id);
    expect(project.members).toEqual([]);
  });

  it('normalize aplica defaults a miembros incompletos', () => {
    const [m] = InviteService.normalize([{ id: 'x' }]);
    expect(m).toMatchObject({ name: '', email: '' });
    expect(m.role).toBe(MEMBER_ROLES.MEMBER);
    expect(m.status).toBe(MEMBER_STATUS.ACTIVE);
  });
});