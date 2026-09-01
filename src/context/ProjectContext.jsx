import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createEmptyTask } from '../models/task';
import { canCompleteTask } from '../models/task';
import { createEmptyBucket } from '../models/bucket';
import { linkTasks, unlinkTasks } from '../utils/taskHelpers';
import { TASK_STATUS, PROJECT_STATUS } from '../constants/project';
import { LocalBackend } from '../services/localStorageBackend';
import { serializeProject, deserializeProject } from '../services/projectStorage';

export const ProjectContext = createContext(null);

const SYNC_DEBOUNCE_MS = 2000;

export const ProjectProvider = ({ children }) => {
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(PROJECT_STATUS.IDLE);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [error, setError] = useState(null);
  const [backend, setBackendState] = useState(LocalBackend);

  const saveTimer = useRef(null);
  const backendRef = useRef(backend);
  backendRef.current = backend;

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

  const persist = useCallback(async (nextProject) => {
    if (!nextProject) return;
    setSyncStatus(PROJECT_STATUS.SYNCING);
    try {
      await backendRef.current.saveProject({
        ...nextProject,
        updatedAt: new Date().toISOString(),
      });
      setLastSyncAt(new Date());
      setSyncStatus(PROJECT_STATUS.SYNCED);
    } catch (err) {
      setError(err.message || 'Error al guardar');
      setSyncStatus(PROJECT_STATUS.ERROR);
    }
  }, []);

  const scheduleSave = useCallback(
    (mutator) => {
      setProject((prev) => {
        const next = mutator(prev);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const debouncedSave = useCallback(
    (mutator) => {
      setProject((prev) => {
        const next = mutator(prev);
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
        const next = deserializeProject(JSON.stringify(raw));
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
            t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t,
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
            t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t,
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

  const value = useMemo(
    () => ({
      project,
      isLoading,
      syncStatus,
      lastSyncAt,
      error,
      backend,
      setError,
      reload,
      persist,
      useSampleData,
      resetToEmpty,
      updateProjectMeta,
      addBucket,
      renameBucket,
      moveBucket,
      toggleBucketCollapse,
      deleteBucket,
      addTask,
      updateTask,
      deleteTask,
      moveTaskToBucket,
      toggleTaskCompleted,
      setTaskStatus,
      addComment,
      addDependency,
      removeDependency,
    }),
    [
      project,
      isLoading,
      syncStatus,
      lastSyncAt,
      error,
      backend,
      reload,
      persist,
      useSampleData,
      resetToEmpty,
      updateProjectMeta,
      addBucket,
      renameBucket,
      moveBucket,
      toggleBucketCollapse,
      deleteBucket,
      addTask,
      updateTask,
      deleteTask,
      moveTaskToBucket,
      toggleTaskCompleted,
      setTaskStatus,
      addComment,
      addDependency,
      removeDependency,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};