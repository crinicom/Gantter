export function collectSystemState({
  user,
  project,
  syncStatus,
  lastSyncAt,
  applyMode,
  staleDays,
  openInquiries,
  backendName,
}) {
  return {
    appMode: import.meta.env.MODE,
    backend: backendName,
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
    project: project
      ? { id: project.id, name: project.name, version: project.version }
      : null,
    counts: {
      buckets: project?.buckets?.length ?? 0,
      tasks: project?.tasks?.length ?? 0,
      members: project?.members?.length ?? 0,
      openInquiries: openInquiries ?? 0,
      actionLog: project?.actionLog?.length ?? 0,
    },
    sync: {
      status: syncStatus,
      lastSyncAt: lastSyncAt ?? null,
    },
    applyMode,
    staleDays,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    userAgent: navigator.userAgent,
    hash: window.location.hash,
  };
}

export function describeScreen({ project, view, isLogin }) {
  if (isLogin) return 'Login';
  if (!project) return 'Proyectos';
  return `${view} · ${project.name}`;
}
