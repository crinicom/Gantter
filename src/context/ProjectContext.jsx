import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { createEmptyTask, canCompleteTask } from '../models/task';
import { createEmptyBucket } from '../models/bucket';
import { linkTasks, unlinkTasks } from '../utils/taskHelpers';
import { clampProgress } from '../utils/progress';
import { mergeProjects, sameProjectAs } from '../utils/collab';
import { isProjectVisible, visibleProjects } from '../utils/projectAccess';
import { MEMBER_ROLES } from '../models/member';
import { TASK_STATUS, PROJECT_STATUS } from '../constants/project';
import { LocalBackend } from '../services/localStorageBackend';
import { RealtimeService } from '../services/realtimeService';
import { InviteService } from '../services/inviteService';
import { createProject, deserializeProject } from '../services/projectStorage';

export const ProjectContext = createContext(null);

const SYNC_DEBOUNCE_MS = 2000;

const bumpVersion = (p) => (p ? { ...p, version: (p.version || 0) + 1 } : p);

const projectHashOf = (id) => `#/proyecto/${encodeURIComponent(id)}`;
const parseProjectHash = () => {
  const m = window.location.hash.match(/^#\/proyecto\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

export const ProjectProvider = ({ children }) => {
  const { user } = useAuth();
  const [store, setStore] = useState({});
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(PROJECT_STATUS.IDLE);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [error, setError] = useState(null);
  const [collabNotice, setCollabNotice] = useState(null);
  const [backend] = useState(LocalBackend);

  const backendRef = useRef(backend);
  const saveTimer = useRef(null);
  const storeRef = useRef(store);
  storeRef.current = store;
  const activeIdRef = useRef(activeProjectId);
  activeIdRef.current = activeProjectId;
  const userRef = useRef(user);
  userRef.current = user;

  const project = useMemo(
    () => (activeProjectId ? store[activeProjectId] : null),
    [store, activeProjectId],
  );

  const persist = useCallback(async (baseProject) => {
    if (!baseProject) return false;
    setSyncStatus(PROJECT_STATUS.SYNCING);
    try {
      const nextProject = { ...baseProject, updatedAt: new Date().toISOString() };
      const ok = await backendRef.current.saveProject(nextProject);
      setLastSyncAt(new Date());
      setSyncStatus(PROJECT_STATUS.SYNCED);
      RealtimeService.broadcast({
        type: 'project',
        projectId: nextProject.id,
        project: nextProject,
      });
      return ok;
    } catch (err) {
      setError(err.message || 'Error al guardar');
      setSyncStatus(PROJECT_STATUS.ERROR);
      return false;
    }
  }, []);

  const persistRemote = useCallback(async (nextProject) => {
    try {
      await backendRef.current.saveProject({ ...nextProject, updatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Error al guardar');
    }
  }, []);

  const applyToStore = useCallback((projectId, nextProject) => {
    const newStore = { ...storeRef.current, [projectId]: nextProject };
    storeRef.current = newStore;
    setStore(newStore);
  }, []);

  const removeFromStore = useCallback((projectId) => {
    const newStore = { ...storeRef.current };
    delete newStore[projectId];
    storeRef.current = newStore;
    setStore(newStore);
  }, []);

  // Aplica un mutador al proyecto activo (versión + fecha). Devuelve el nuevo proyecto.
  const commitToStore = useCallback(
    (mutator, { debounce = false } = {}) => {
      setCollabNotice(null);
      const id = activeIdRef.current;
      const prev = storeRef.current[id];
      if (!id || !prev) return null;
      const mutated = mutator(prev);
      if (!mutated) return null;
      const next = bumpVersion({ ...mutated, updatedAt: new Date().toISOString() });
      applyToStore(id, next);
      if (debounce) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          void persist(next);
        }, SYNC_DEBOUNCE_MS);
      } else {
        void persist(next);
      }
      return next;
    },
    [applyToStore, persist],
  );

  // ---- Carga inicial + resolución del hash ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await backendRef.current.loadProjects();
        if (cancelled) return;
        const map = Object.fromEntries((list || []).map((p) => [p.id, p]));
        storeRef.current = map;
        setStore(map);
        const hashId = parseProjectHash();
        if (hashId && map[hashId] && isProjectVisible(map[hashId], userRef.current)) {
          setActiveProjectId(map[hashId].id);
        }
        setSyncStatus(PROJECT_STATUS.SYNCED);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'No se pudieron cargar los proyectos');
        setSyncStatus(PROJECT_STATUS.ERROR);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Hash (#/proyecto/<id>) → proyecto activo ----
  useEffect(() => {
    const onHashChange = () => {
      const hashId = parseProjectHash();
      const current = storeRef.current;
      setActiveProjectId(
        hashId && current[hashId] && isProjectVisible(current[hashId], userRef.current)
          ? hashId
          : null,
      );
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openProject = useCallback((projectId) => {
    if (window.location.hash === projectHashOf(projectId)) return;
    window.location.hash = projectHashOf(projectId);
  }, []);

  const closeProject = useCallback(() => {
    setActiveProjectId(null);
    if (window.location.hash !== '') window.location.hash = '';
  }, []);

  // ---- Realtime (solo para el proyecto activo) ----
  useEffect(() => {
    const unsubscribe = RealtimeService.subscribe((payload) => {
      const remote = payload?.project;
      const remoteId = payload?.projectId;
      if (!remote || !remoteId || remoteId !== activeIdRef.current) return;
      const local = storeRef.current[remoteId];
      if (!local || sameProjectAs(remote, local)) return;

      const { project: merged, conflicts } = mergeProjects(local, remote);
      if (sameProjectAs(merged, local)) return;

      applyToStore(merged.id, merged);
      if (conflicts.length > 0) {
        const names = [...new Set(conflicts.map((c) => c.name).filter(Boolean))].slice(0, 3).join(', ');
        setCollabNotice(`Se integraron cambios de otro usuario — conflicto resuelto en: ${names}.`);
      } else {
        setCollabNotice('Se recibieron cambios de otro usuario y se integraron.');
      }

      if (!sameProjectAs(merged, remote)) {
        void persistRemote(merged);
      }
    });
    return unsubscribe;
  }, [applyToStore, persistRemote]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await backendRef.current.loadProjects();
      const map = Object.fromEntries((list || []).map((p) => [p.id, p]));
      storeRef.current = map;
      setStore(map);
      setSyncStatus(PROJECT_STATUS.SYNCED);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los proyectos');
      setSyncStatus(PROJECT_STATUS.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---- Gestión de proyectos ----
  const createNewProject = useCallback(
    ({ name, description }) => {
      const doc = createProject({ name, description, owner: userRef.current });
      applyToStore(doc.id, doc);
      void persist(doc);
      openProject(doc.id);
      return doc;
    },
    [applyToStore, persist, openProject],
  );

  const deleteProject = useCallback(
    (projectId) => {
      removeFromStore(projectId);
      if (activeIdRef.current === projectId) closeProject();
      void backendRef.current.deleteProject(projectId).catch((err) => {
        setError(err.message || 'Error al eliminar el proyecto');
      });
    },
    [removeFromStore, closeProject],
  );

  const setProjectImage = useCallback(
    (projectId, image) => {
      const prev = storeRef.current[projectId];
      if (!prev) return;
      const next = bumpVersion({ ...prev, image, updatedAt: new Date().toISOString() });
      applyToStore(projectId, next);
      void persist(next);
    },
    [applyToStore, persist],
  );

  const useSampleData = useCallback(() => {
    (async () => {
      try {
        const { default: raw } = await import('../../DB/sample_data.json');
        const sample = deserializeProject(JSON.stringify(raw));
        const owner = userRef.current;
        const doc = createProject({
          name: sample.name || 'Proyecto demo',
          description: sample.description || '',
          owner,
        });
        doc.buckets = sample.buckets || [];
        doc.tasks = sample.tasks || [];
        doc.members = [
          doc.members[0],
          ...(sample.members || [])
            .filter((m) => m.id !== owner?.id)
            .map((m) => (m.role === MEMBER_ROLES.OWNER ? { ...m, role: MEMBER_ROLES.MEMBER } : m)),
        ].filter(Boolean);
        applyToStore(doc.id, doc);
        void persist(doc);
        openProject(doc.id);
      } catch (err) {
        setError(err.message || 'No se pudo cargar la muestra');
      }
    })();
  }, [applyToStore, persist, openProject]);

  // ---- Project metadata ----
  const renameProject = useCallback(
    (name) => {
      const clean = typeof name === 'string' ? name.trim() : '';
      if (!clean) return;
      commitToStore((prev) => ({ ...prev, name: clean }));
    },
    [commitToStore],
  );

  // ---- Buckets ----
  const addBucket = useCallback(
    (name) => {
      if (!name || !name.trim()) return;
      const bucket = createEmptyBucket();
      bucket.name = name.trim();
      commitToStore((prev) => ({ ...prev, buckets: [...prev.buckets, bucket] }));
    },
    [commitToStore],
  );

  const renameBucket = useCallback(
    (bucketId, name) => {
      if (!name || !name.trim()) return;
      commitToStore((prev) => ({
        ...prev,
        buckets: prev.buckets.map((b) =>
          b.id === bucketId ? { ...b, name: name.trim() } : b,
        ),
      }));
    },
    [commitToStore],
  );

  const moveBucket = useCallback(
    (bucketId, toIndex) => {
      commitToStore((prev) => {
        const fromIndex = prev.buckets.findIndex((b) => b.id === bucketId);
        if (fromIndex === -1) return prev;
        const buckets = [...prev.buckets];
        const [moved] = buckets.splice(fromIndex, 1);
        const target = Math.max(0, Math.min(toIndex, buckets.length));
        buckets.splice(target, 0, moved);
        return { ...prev, buckets };
      });
    },
    [commitToStore],
  );

  const toggleBucketCollapse = useCallback(
    (bucketId) => {
      commitToStore((prev) => ({
        ...prev,
        buckets: prev.buckets.map((b) =>
          b.id === bucketId ? { ...b, collapsed: !b.collapsed } : b,
        ),
      }));
    },
    [commitToStore],
  );

  const deleteBucket = useCallback(
    (bucketId) => {
      commitToStore((prev) => ({
        ...prev,
        buckets: prev.buckets.filter((b) => b.id !== bucketId),
        tasks: prev.tasks.filter((t) => t.bucketId !== bucketId),
      }));
    },
    [commitToStore],
  );

  // ---- Tasks ----
  const addTask = useCallback(
    (bucketId, partial) => {
      const task = { ...createEmptyTask(bucketId), ...(partial || {}) };
      if (!task.name) return;
      task.name = task.name.trim();
      commitToStore((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
    },
    [commitToStore],
  );

  const updateTask = useCallback(
    (taskId, patch) => {
      commitToStore((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId
            ? { ...task, ...patch, updatedAt: new Date().toISOString() }
            : task,
        ),
      }));
    },
    [commitToStore],
  );

  const setTaskProgress = useCallback(
    (taskId, value) => {
      const progress = clampProgress(value);
      commitToStore((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, progress, updatedAt: new Date().toISOString() } : t,
        ),
      }));
    },
    [commitToStore],
  );

  const deleteTask = useCallback(
    (taskId) => {
      commitToStore((prev) => {
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
    [commitToStore],
  );

  const moveTaskToBucket = useCallback(
    (taskId, bucketId) => {
      commitToStore((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, bucketId } : t)),
      }));
    },
    [commitToStore],
  );

  const toggleTaskCompleted = useCallback(
    (taskId) => {
      commitToStore((prev) => {
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
    [commitToStore],
  );

  const setTaskStatus = useCallback(
    (taskId, status) => {
      commitToStore((prev) => {
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
    [commitToStore],
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
      commitToStore((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, comments: [...(t.comments || []), comment], updatedAt: new Date().toISOString() }
            : t,
        ),
      }));
    },
    [commitToStore],
  );

  // ---- Dependencies ----
  const addDependency = useCallback(
    (precedentId, dependentId) => {
      commitToStore((prev) => ({
        ...prev,
        tasks: linkTasks(prev.tasks, precedentId, dependentId),
      }));
    },
    [commitToStore],
  );

  const removeDependency = useCallback(
    (precedentId, dependentId) => {
      commitToStore((prev) => ({
        ...prev,
        tasks: unlinkTasks(prev.tasks, precedentId, dependentId),
      }));
    },
    [commitToStore],
  );

  // ---- Miembros e invitaciones ----
  const sendInvite = useCallback(
    ({ name, email, invitedBy }) => {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) return false;
      const alreadyMember = (project?.members || []).some((m) => m.email === cleanEmail);
      if (alreadyMember) return false;
      commitToStore((prev) =>
        InviteService.sendInvite(prev, { name, email: cleanEmail, invitedBy }).project,
      );
      return true;
    },
    [commitToStore, project],
  );

  const acceptInvite = useCallback(
    (memberId) =>
      new Promise((resolve) => {
        const id = activeIdRef.current;
        const prev = storeRef.current[id];
        if (!id || !prev) {
          resolve();
          return;
        }
        const next = bumpVersion(InviteService.acceptInvite(prev, memberId).project);
        applyToStore(id, next);
        void persist(next).finally(resolve);
      }),
    [applyToStore, persist],
  );

  const revokeMember = useCallback(
    (memberId) => {
      commitToStore((prev) => InviteService.revokeMember(prev, memberId).project);
    },
    [commitToStore],
  );

  const clearCollabNotice = useCallback(() => {
    setCollabNotice(null);
  }, []);

  const projects = useMemo(() => {
    const list = Object.values(store || {});
    return visibleProjects(list, user).sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    );
  }, [store, user]);

  const value = useMemo(
    () => ({
      project,
      activeProjectId,
      projects,
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
      openProject,
      closeProject,
      createProject: createNewProject,
      deleteProject,
      setProjectImage,
      useSampleData,
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
      activeProjectId,
      projects,
      isLoading,
      syncStatus,
      lastSyncAt,
      error,
      collabNotice,
      backend,
      reload,
      persist,
      openProject,
      closeProject,
      createNewProject,
      deleteProject,
      setProjectImage,
      useSampleData,
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