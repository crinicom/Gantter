import { useProject } from './useProject';

export function useDriveSync() {
  const {
    syncStatus,
    lastSyncAt,
    error,
    reload,
    persist,
  } = useProject();

  return {
    syncStatus,
    lastSyncAt,
    error,
    reload,
    persist,
  };
}

export default useDriveSync;