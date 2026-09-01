import React, { useMemo, useState } from 'react';
import { UserPlus, Trash2, Crown, LogIn, Mail } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useProject } from '../../hooks/useProject';
import { useAuth } from '../../hooks/useAuth';
import { AuthService, DEFAULT_COLLAB_USERS } from '../../services/authService';
import { MEMBER_ROLES, MEMBER_STATUS } from '../../models/member';

const ROLE_LABELS = {
  [MEMBER_ROLES.OWNER]: 'Propietario',
  [MEMBER_ROLES.MEMBER]: 'Miembro',
};

const STATUS_LABELS = {
  [MEMBER_STATUS.INVITED]: 'Invitado',
  [MEMBER_STATUS.ACTIVE]: 'Activo',
};

export default function InviteMembersModal({ open, onClose }) {
  const { project, sendInvite, acceptInvite, revokeMember } = useProject();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState(null);

  const members = project?.members || [];

  const candidates = useMemo(() => {
    const seen = new Set();
    return [...members, ...DEFAULT_COLLAB_USERS].filter((m) => {
      const key = (m.email || m.id || '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [members]);

  const handleInvite = (e) => {
    e.preventDefault();
    const ok = sendInvite({ name, email, invitedBy: user?.name });
    setNotice(ok ? `Invitación enviada a ${email.trim()}.` : 'El email ya es miembro o es inválido.');
    setName('');
    setEmail('');
  };

  const handleEnterAs = async (identity) => {
    AuthService.switchTo(identity);
    const pendingMember = members.find(
      (m) => m.id === identity.id || m.email === identity.email,
    );
    if (pendingMember && pendingMember.status !== MEMBER_STATUS.ACTIVE) {
      await acceptInvite(pendingMember.id);
    }
    window.location.reload();
  };

  const isCurrentIdentity = (identity) =>
    user && (user.id === identity.id || user.email === identity.email);

  return (
    <Modal open={open} onClose={onClose} title="Miembros e invitaciones" width="max-w-2xl">
      {notice && (
        <div className="mb-3 rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-700">{notice}</div>
      )}

      <form onSubmit={handleInvite} className="mb-5 rounded-lg border border-gray-200 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <UserPlus size={15} /> Invitar por email
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            className="w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
          <Button type="submit" size="md">
            Invitar
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          En modo offline la invitación se simula: el miembro aparecerá y podrá "entrar como" tal
          desde esta ventana.
        </p>
      </form>

      <p className="mb-2 text-sm font-semibold text-gray-700">Miembros del proyecto ({members.length})</p>
      {members.length === 0 ? (
        <p className="mb-4 text-xs text-gray-400">Aún no hay miembros invitados.</p>
      ) : (
        <ul className="mb-5 space-y-1.5">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center gap-2.5 rounded-md border border-gray-100 px-3 py-2"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                {member.name?.[0]?.toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm text-gray-800">
                  <span className="truncate">{member.name || member.email}</span>
                  {member.role === MEMBER_ROLES.OWNER && <Crown size={13} className="text-amber-500" />}
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                  <span
                    className={
                      member.status === MEMBER_STATUS.ACTIVE
                        ? 'rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700'
                        : 'rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700'
                    }
                  >
                    {STATUS_LABELS[member.status] || member.status}
                  </span>
                </div>
                <div className="truncate text-xs text-gray-400">{member.email}</div>
              </div>
              {member.role !== MEMBER_ROLES.OWNER && (
                <button
                  type="button"
                  onClick={() => revokeMember(member.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Quitar a ${member.name || member.email}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-gray-300 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <LogIn size={15} /> Entrar como… <span className="font-normal text-gray-400">(simulación)</span>
        </p>
        <p className="mb-2 text-xs text-gray-400">
          Cada pestaña es un usuario distinto. Cambia de identidad para probar la edición
          simultánea: la pestaña activa pasa a ser este usuario y el resto sigue con la suya.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              disabled={isCurrentIdentity(candidate)}
              onClick={() => handleEnterAs(candidate)}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-default disabled:opacity-60 disabled:border-violet-400 disabled:bg-violet-50 disabled:text-violet-700 border-gray-200 text-gray-600 hover:border-violet-400"
            >
              <Mail size={12} />
              {candidate.name}
              {isCurrentIdentity(candidate) && '(actual)'}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}