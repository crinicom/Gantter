// Hub de tiempo real por canal de proyecto (SSE).
// Cada conexión se registra en el canal de SU proyecto; al persistir cambios
// sobre un proyecto, el broadcast reenvía el documento a todos sus suscriptores.

const channels = new Map(); // projectId -> Set<res>

export function subscribe(channelName, res) {
  if (!channels.has(channelName)) channels.set(channelName, new Set());
  channels.get(channelName).add(res);

  res.write(
    `data: ${JSON.stringify({ type: 'hello', channel: channelName })}\n\n`,
  );
  res.on('close', () => {
    const set = channels.get(channelName);
    if (set) {
      set.delete(res);
      if (set.size === 0) channels.delete(channelName);
    }
  });
}

export function broadcastToProject(projectId, project) {
  const set = channels.get(projectId);
  if (!set) return;
  const payload = JSON.stringify({ type: 'project', projectId, project });
  for (const res of set) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      /* cliente desconectado; se limpia en 'close' */
    }
  }
}
