// Utilidades de colaboración sobre el documento de proyecto.
//
// Patrón: documento JSON único versionado (`project.version`). Cuando llega
// una versión remota (otra pestaña / futuro backend), se hace un merge a
// nivel de entidad (buckets, tareas, miembros) donde gana la entidad con
// `updatedAt` más reciente. Las entidades tocadas por ambas partes se
// reportan como "conflictos" resueltos con última-escritura-gana.
//
// Este merge es conmutativo e idempotente, suficiente para ediciones que no
// tocan la misma entidad al mismo tiempo. La migración a un backend real está
// documentada en docs/backend-plan.md (opciones: LWW, merge, CRDT).

const ts = (entity) => {
  const t = Date.parse(entity?.updatedAt || entity?.createdAt || '');
  return Number.isFinite(t) ? t : 0;
};

export function nextVersion(project) {
  return (project?.version || 0) + 1;
}

function mergeEntities(localList, remoteList, idKey, kind, conflicts) {
  const map = new Map((localList || []).map((e) => [e[idKey], e]));
  const out = [];

  (remoteList || []).forEach((remoteEntity) => {
    const localEntity = map.get(remoteEntity[idKey]);
    if (localEntity && ts(remoteEntity) !== ts(localEntity)) {
      // La entidad se editó en las dos partes: conflicto resuelto con LWW.
      conflicts.push({
        kind,
        id: remoteEntity[idKey],
        name: remoteEntity?.name || localEntity?.name || '',
      });
    }
    if (!localEntity || ts(remoteEntity) >= ts(localEntity)) {
      out.push(remoteEntity);
    } else {
      out.push(localEntity);
    }
    map.delete(remoteEntity[idKey]);
  });

  map.forEach((localEntity) => out.push(localEntity));
  return out;
}

// Compara dos documentos por su contenido canónico (claves ordenadas).
export function sameProjectAs(projectA, projectB) {
  return canonicalJson(projectA) === canonicalJson(projectB);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Fusiona el documento local con uno remoto (entidad por entidad).
 * @returns {{ project: object, conflicts: Array<{kind,id,name}> }}
 */
export function mergeProjects(local, remote) {
  const conflicts = [];
  const merged = {
    id: ts(remote) >= ts(local) ? remote.id ?? local.id : local.id ?? remote.id,
    name: ts(remote) >= ts(local) ? remote.name ?? local.name : local.name ?? remote.name,
    description:
      ts(remote) >= ts(local) ? remote.description ?? local.description : local.description ?? remote.description,
    createdAt: local.createdAt || remote.createdAt,
    updatedAt: ts(remote) >= ts(local) ? remote.updatedAt || local.updatedAt : local.updatedAt || remote.updatedAt,
    version: Math.max(local.version || 0, remote.version || 0),
    buckets: mergeEntities(local.buckets, remote.buckets, 'id', 'bucket', conflicts),
    tasks: mergeEntities(local.tasks, remote.tasks, 'id', 'task', conflicts),
    members: mergeEntities(local.members, remote.members, 'id', 'member', conflicts),
  };
  return { project: merged, conflicts };
}