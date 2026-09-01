import React from 'react';
import { KanbanSquare, LogOut, HardDrive } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';
import { APP_CONFIG } from '../../config/appConfig';
import Button from '../common/Button';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { syncStatus } = useProject();

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="rounded-md bg-violet-600 p-1.5 text-white">
          <KanbanSquare size={20} />
        </div>
        <span className="text-lg font-bold text-gray-800">Gantter</span>
        <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 sm:inline">
          {APP_CONFIG.mode === 'drive' ? 'Google Drive' : 'Local'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 text-xs text-gray-400 md:flex">
          <HardDrive size={14} />
          {syncStatus === 'synced' ? 'Guardado' : syncStatus}
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </span>
            <span className="hidden text-sm text-gray-700 sm:inline">{user.name}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => logout()}>
          <LogOut size={16} /> Salir
        </Button>
      </div>
    </header>
  );
}