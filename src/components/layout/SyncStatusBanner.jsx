import React from 'react';
import { CloudOff, RefreshCw, Check, AlertTriangle, Users } from 'lucide-react';
import { useDriveSync } from '../../hooks/useDriveSync';
import { PROJECT_STATUS } from '../../constants/project';

const statusConfig = {
  [PROJECT_STATUS.IDLE]: { color: 'text-gray-500', icon: CloudOff },
  [PROJECT_STATUS.SYNCING]: { color: 'text-forest-600', icon: RefreshCw },
  [PROJECT_STATUS.SYNCED]: { color: 'text-green-600', icon: Check },
  [PROJECT_STATUS.ERROR]: { color: 'text-red-600', icon: AlertTriangle },
};

export default function SyncStatusBanner() {
  const { syncStatus, lastSyncAt, error, collabNotice, version } = useDriveSync();
  const config = statusConfig[syncStatus] || statusConfig[PROJECT_STATUS.IDLE];
  const Icon = config.icon;

  const labels = {
    [PROJECT_STATUS.IDLE]: 'Listo',
    [PROJECT_STATUS.SYNCING]: 'Guardando…',
    [PROJECT_STATUS.SYNCED]: lastSyncAt
      ? `Guardado ${lastSyncAt.toLocaleTimeString() || ''}`
      : 'Sincronizado',
    [PROJECT_STATUS.ERROR]: 'Error al guardar',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <Icon size={14} className={config.color} />
        <span className="text-gray-600">{labels[syncStatus]}</span>
        {syncStatus === PROJECT_STATUS.ERROR && error && (
          <span className="text-red-600">— {error}</span>
        )}
        <span className="text-gray-300">·</span>
        <span className="tabular-nums text-gray-400">v{version}</span>
      </div>
      {collabNotice && (
        <span className="flex items-center gap-1.5 rounded-full bg-forest-100 px-2 py-0.5 font-medium text-forest-700">
          <Users size={12} /> {collabNotice}
        </span>
      )}
    </div>
  );
}