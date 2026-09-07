import React, { useRef, useState } from 'react';
import { FolderOpen, KanbanSquare, LogOut, HardDrive, Pencil, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';
import { APP_CONFIG } from '../../config/appConfig';
import Button from '../common/Button';
import InviteMembersModal from '../collab/InviteMembersModal';
import { projectProgress } from '../../utils/progress';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { project, syncStatus, renameProject, closeProject } = useProject();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const inputRef = useRef(null);

  const projectName = project?.name || 'Proyecto sin título';
  const progress = projectProgress(project?.tasks || []);

  const startEdit = () => {
    setDraftName(projectName);
    setEditingName(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commitName = () => {
    if (draftName.trim()) renameProject(draftName);
    setEditingName(false);
  };

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Button variant="ghost" size="sm" onClick={closeProject} title="Volver a mis proyectos">
          <FolderOpen size={16} /> Mis proyectos
        </Button>
        <div className="rounded-md bg-forest-600 p-1.5 text-white">
          <KanbanSquare size={20} />
        </div>

        <div className="min-w-0">
          <div className="flex max-w-md items-center gap-1.5">
            {editingName ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="w-64 rounded-md border border-forest-400 px-2 py-0.5 text-lg font-bold text-gray-800 focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500"
                aria-label="Nombre del proyecto"
              />
            ) : (
              <>
                <span className="truncate font-display text-lg font-bold text-gray-800">{projectName}</span>
                <button
                  type="button"
                  onClick={startEdit}
                  className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-forest-50 hover:text-forest-600"
                  aria-label="Editar nombre del proyecto"
                  title="Editar nombre"
                >
                  <Pencil size={14} />
                </button>
              </>
            )}
            <span className="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 sm:inline">
              {APP_CONFIG.mode === 'drive' ? 'Google Drive' : 'Local'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-1 w-28 overflow-hidden rounded bg-gray-200">
              <div className="h-full rounded bg-forest-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs tabular-nums text-gray-500">{progress}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 text-xs text-gray-400 md:flex">
          <HardDrive size={14} />
          {syncStatus === 'synced' ? 'Guardado' : syncStatus}
        </div>

        <Button variant="ghost" size="sm" onClick={() => setShowMembers(true)}>
          <Users size={16} /> Miembros
        </Button>

        {user && (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forest-100 text-sm font-semibold text-forest-700">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </span>
            <span className="hidden text-sm text-gray-700 sm:inline">{user.name}</span>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => { closeProject(); logout(); }}>
          <LogOut size={16} /> Salir
        </Button>
      </div>

      <InviteMembersModal open={showMembers} onClose={() => setShowMembers(false)} />
    </header>
  );
}