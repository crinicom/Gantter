import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEmptyTask } from '../models/task';
import { canCompleteTask } from '../models/task';
import { createEmptyBucket } from '../models/bucket';
import { linkTasks, unlinkTasks } from '../utils/taskHelpers';
import { clampProgress } from '../utils/progress';
import { mergeProjects, sameProjectAs } from '../utils/collab';
import { TASK_STATUS, PROJECT_STATUS } from '../constants/project';
import { LocalBackend } from '../services/localStorageBackend';
import { RealtimeService } from '../services/realtimeService';
import { InviteService } from '../services/inviteService';
import { serializeProject, deserializeProject } from '../services/projectStorage';

export const ProjectContext = createContext(null);

const SYNC_DEBOUNCE_MS = 2000;

const bumpVersion = (project) =>
  project ? { ...project, version: (project.version || 0) + 1 } : project;

export const ProjectProvider = ({ children }) => {
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(PROJECT_STATUS.IDLE);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [error, setError] = useState(null);
  const [collabNotice, setCollabNotice] = useState(null);
  const [backend, setBackendState] = useState(LocalBackend);

  const saveTimer = useRef(null);
  const backendRef = useRef(backend);
  backendRef.current = backend;
  const projectRef = useRef(project);
  projectRef.current = project;

  // ---- Carga inicial ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await backendRef.current.loadProject();
        if (cancelled) return;
        setProject(loaded);
        setSyncStatus(PROJECT_STATUS.SYNCED);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'No se pudo cargar el proyecto');
        setSyncStatus(PROJECT_STATUS.ERROR);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Realtime: escucha cambios de otras pestañas y hace merge ----
  useEffect(() => {
    const unsubscribe = RealtimeService.subscribe((payload) => {
      const remote = payload?.project;
      const local = projectRef.current;
      if (!remote || !local || sameProjectAs(remote, local)) return;

      const { project: merged, conflicts } = mergeProjects(local, remote);
      if (sameProjectAs(merged, local)) return;

      setProject(merged);
      if (conflicts.length > 0) {
        const names = [...new Set(conflicts.map((c) => c.name).filter(Boolean))].slice(0, 3).join(', ');
        setCollabNotice(`Se integraron cambios de otro usuario — conflicto resuelto en: ${names}.`);
      } else {
        setCollabNotice('Se recibieron cambios de otro usuario y se integraron.');
      }

      // Si el resultado local difiere del remoto, escribirlo para converger
      // (sin re-transmitir, para evitar ecos entre pestañas).
      if (!sameProjectAs(merged, remote)) {
        void persistRemote(merged);
      }
    });
    return unsubscribe;
  }, []);

  const persist = useCallback(async (baseProject) => {
    if (!baseProject) return false;
    setSyncStatus(PROJECT_STATUS.SYNCING);
    try {
      const nextProject = { ...baseProject, updatedAt: new Date().toISOString() };
      const ok = await backendRef.current.saveProject(nextProject);
      setLastSyncAt(new Date());
      setSyncStatus(PROJECT_STATUS.SYNCED);
      RealtimeService.broadcast({ type: 'project', project: nextProject });
      return ok;
    } catch (err) {
      setError(err.message || 'Error al guardar');
      setSyncStatus(PROJECT_STATUS.ERROR);
      return false;
    }
  }, []);

  // Persiste un documento aplicado desde remoto, sin re-transmitirlo.
  const persistRemote = useCallback(async (nextProject) => {
    try {
      await backendRef.current.saveProject({ ...nextProject, updatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Error al guardar');
    }
  }, []);

  const scheduleSave = useCallback(
    (mutator) => {
      setCollabNotice(null);
      setProject((prev) => {
        const next = bumpVersion({ ...mutator(prev), updatedAt: new Date().toISOString() });
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const debouncedSave = useCallback(
    (mutator) => {
      setProject((prev) => {
        const next = bumpVersion({ ...mutator(prev), updatedAt: new Date().toISOString() });
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void persist(next);
        }, SYNC_DEBOUNCE_MS);
        return next;
      });
    },
    [persist],
  );

  const commit = useCallback(
    (mutator, { debounce = false } = {}) => {
      if (debounce) debouncedSave(mutator);
      else scheduleSave(mutator);
    },
    [scheduleSave, debouncedSave],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await backendRef.current.loadProject();
      setProject(loaded);
      setSyncStatus(PROJECT_STATUS.SYNCED);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el proyecto');
      setSyncStatus(PROJECT_STATUS.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const useSampleData = useCallback(() => {
    (async () => {
      try {
        const { default: raw } = await import('../../DB/sample_data.json');
        const next = bumpVersion(deserializeProject(JSON.stringify(raw)));
        setProject(next);
        void persist(next);
      } catch (err) {
        setError(err.message || 'No se pudo cargar la muestra');
      }
    })();
  }, [persist, setError]);

  const resetToEmpty = useCallback(() => {
    scheduleSave(() => ({
      id: null,
      name: 'Proyecto sin título',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      buckets: [],
      tasks: [],
    }));
  }, [scheduleSave]);

  // ---- Project metadata ----
  const updateProjectMeta = useCallback(
    (patch) => {
      scheduleSave((prev) => ({ ...prev, ...patch }));
    },
    [scheduleSave],
  );

  const renameProject = useCallback(
    (name) => {
      const clean = typeof name === 'string' ? name.trim() : '';
      if (!clean) return;
      scheduleSave((prev) => ({ ...prev, name: clean }));
    },
    [scheduleSave],
  );

  // ---- Buckets ----
  const addBucket = useCallback(
    (name) => {
      if (!name || !name.trim()) return;
      const bucket = createEmptyBucket();
      bucket.name = name.trim();
      scheduleSave((prev) => ({ ...prev, buckets: [...prev.buckets, bucket] }));
    },
    [scheduleSave],
  );

  const renameBucket = useCallback(
    (bucketId, name) => {
      if (!name || !name.trim()) return;
      scheduleSave((prev) => ({
        ...prev,
        buckets: prev.buckets.map((b) =>
          b.id === bucketId ? { ...b, name: name.trim() } : b,
        ),
      }));
    },
    [scheduleSave],
  );

  const moveBucket = useCallback(
    (bucketId, toIndex) => {
      scheduleSave((prev) => {
        const fromIndex = prev.buckets.findIndex((b) => b.id === bucketId);
        if (fromIndex === -1) return prev;
        const buckets = [...prev.buckets];
        const [moved] = buckets.splice(fromIndex, 1);
        const target = Math.max(0, Math.min(toIndex, buckets.length));
        buckets.splice(target, 0, moved);
        return { ...prev, buckets };
      });
    },
    [scheduleSave],
  );

  const toggleBucketCollapse = useCallback(
    (bucketId) => {
      scheduleSave((prev) => ({
        ...prev,
        buckets: prev.buckets.map((b) =>
          b.id === bucketId ? { ...b, collapsed: !b.collapsed } : b,
        ),
      }));
    },
    [scheduleSave],
  );

  const deleteBucket = useCallback(
    (bucketId) => {
      scheduleSave((prev) => ({
        ...prev,
        buckets: prev.buckets.filter((b) => b.id !== bucketId),
        tasks: prev.tasks.filter((t) => t.bucketId !== bucketId),
      }));
    },
    [scheduleSave],
  );

  // ---- Tasks ----
  const addTask = useCallback(
    (bucketId, partial) => {
      const task = { ...createEmptyTask(bucketId), ...(partial || {}) };
      if (!task.name) return;
      task.name = task.name.trim();
      scheduleSave((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
    },
    [scheduleSave],
  );

  const updateTask = useCallback(
    (taskId, patch) => {
      scheduleSave((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? { ...task, ...patch, updatedAt: new Date().toISOString() }
            : task,
        ),
      }));
    },
    [scheduleSave],
  );

  const setTaskProgress = useCallback(
    (taskId, value) => {
      const progress = clampProgress(value);
      scheduleSave((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, progress, updatedAt: new Date().toISOString() } : t,
        ),
      }));
    },
    [scheduleSave],
  );

  const deleteTask = useCallback(
    (taskId) => {
      scheduleSave((prev) => {
        const tasks = prev.tasks
          .filter((t) => t.id !== taskId)
          .map((t) => ({
            ...t,
            precedents: (t.precedents || []).filter((id) => id !== taskId),
            dependents: (t.dependents || []).filter((id) => id !== taskId),
          }));
        return { ...prev, tasks };
      });
    },
    [scheduleSave],
  );

  const moveTaskToBucket = useCallback(
    (taskId, bucketId) => {
      scheduleSave((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, bucketId } : t,
        ),
      }));
    },
    [scheduleSave],
  );

  const toggleTaskCompleted = useCallback(
    (taskId) => {
      scheduleSave((prev) => {
        const task = prev.tasks.find((t) => t.id === taskId);
        if (!task) return prev;
        const tasksById = Object.fromEntries(prev.tasks.map((t) => [t.id, t]));
        if (task.status !== TASK_STATUS.COMPLETED && !canCompleteTask(task, tasksById)) {
          setError('No se puede finalizar la tarea: tiene antecedentes pendientes.');
          return prev;
        }
        const newStatus =
          task.status === TASK_STATUS.COMPLETED ? TASK_STATUS.TODO : TASK_STATUS.COMPLETED;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: newStatus,
                  progress: newStatus === TASK_STATUS.COMPLETED ? 100 : t.progress,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        };
      });
    },
    [scheduleSave],
  );

  const setTaskStatus = useCallback(
    (taskId, status) => {
      scheduleSave((prev) => {
        const task = prev.tasks.find((t) => t.id === taskId);
        if (!task) return prev;
        if (status === TASK_STATUS.COMPLETED) {
          const tasksById = Object.fromEntries(prev.tasks.map((t) => [t.id, t]));
          if (!canCompleteTask(task, tasksById)) {
            setError('No se puede finalizar la tarea: tiene antecedentes pendientes.');
            return prev;
          }
        }
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status,
                  progress: status === TASK_STATUS.COMPLETED ? 100 : t.progress,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        };
      });
    },
    [scheduleSave],
  );

  // ---- Comments ----
  const addComment = useCallback(
    (taskId, text, author) => {
      if (!text || !text.trim()) return;
      const comment = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
        text: text.trim(),
        author: author || null,
        createdAt: new Date().toISOString(),
      };
      scheduleSave((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, comments: [...(t.comments || []), comment], updatedAt: new Date().toISOString() }
            : t,
        ),
      }));
    },
    [scheduleSave],
  );

  // ---- Dependencies ----
  const addDependency = useCallback(
    (precedentId, dependentId) => {
      scheduleSave((prev) => ({
        ...prev,
        tasks: linkTasks(prev.tasks, precedentId, dependentId),
      }));
    },
    [scheduleSave],
  );

  const removeDependency = useCallback(
    (precedentId, dependentId) => {
      scheduleSave((prev) => ({
        ...prev,
        tasks: unlinkTasks(prev.tasks, precedentId, dependentId),
      }));
    },
    [scheduleSave],
  );

  // ---- Miembros e invitaciones ----
  const sendInvite = useCallback(
    ({ name, email, invitedBy }) => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) return false;
      const alreadyMember = (projectRef.current?.members || []).some(
        (m) => m.email === cleanEmail,
      );
      if (alreadyMember) return false;
      scheduleSave((prev) =>
        InviteService.sendInvite(prev, { name, email: cleanEmail, invitedBy }).project,
      );
      return true;
    },
    [scheduleSave],
  );

  const acceptInvite = useCallback(
    (memberId) => {
      return new Promise((resolve) => {
        setProject((prev) => {
          const next = bumpVersion(InviteService.acceptInvite(prev, memberId).project);
          void persist(next).finally(resolve);
          return next;
        });
      });
    },
    [persist],
  );

  const revokeMember = useCallback(
    (memberId) => {
      scheduleSave((prev) => InviteService.revokeMember(prev, memberId).project);
    },
    [scheduleSave],
  );

  const clearCollabNotice = useCallback(() => {
    setCollabNotice(null);
  }, []);

  const value = useMemo(
    () => ({
      project,
      version: project?.version ?? 0,
      isLoading,
      syncStatus,
      lastSyncAt,
      error,
      collabNotice,
      backend,
      setError,
      clearCollabNotice,
      reload,
      persist,
      useSampleData,
      resetToEmpty,
      updateProjectMeta,
      renameProject,
      addBucket,
      renameBucket,
      moveBucket,
      toggleBucketCollapse,
      deleteBucket,
      addTask,
      updateTask,
      deleteTask,
      setTaskProgress,
      moveTaskToBucket,
      toggleTaskCompleted,
      setTaskStatus,
      addComment,
      addDependency,
      removeDependency,
      sendInvite,
      acceptInvite,
      revokeMember,
    }),
    [
      project,
      isLoading,
      syncStatus,
      lastSyncAt,
      error,
      collabNotice,
      backend,
      reload,
      persist,
      useSampleData,
      resetToEmpty,
      updateProjectMeta,
      renameProject,
      addBucket,
      renameBucket,
      moveBucket,
      toggleBucketCollapse,
      deleteBucket,
      addTask,
      updateTask,
      deleteTask,
      setTaskProgress,
      moveTaskToBucket,
      toggleTaskCompleted,
      setTaskStatus,
      addComment,
      addDependency,
      removeDependency,
      sendInvite,
      acceptInvite,
      revokeMember,
      clearCollabNotice,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};