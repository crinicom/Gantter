import { useProject } from './useProject';

export function useDriveSync() {
  const {
    syncStatus,
    lastSyncAt,
    error,
    collabNotice,
    version,
    reload,
    persist,
  } = useProject();

  return {
    syncStatus,
    lastSyncAt,
    error,
    collabNotice,
    version,
    reload,
    persist,
  };
}

export default useDriveSync;