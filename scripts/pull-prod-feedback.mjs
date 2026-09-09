// pull-prod-feedback.mjs — baja los comentarios de prod (SQLite de la máquina
// Fly, volumen persistente) al inbox local sin duplicar.
//
// Read-only sobre la máquina: baja una copia del DB con `cat` (la consola ssh
// de Fly no corre shell completo, así que nada de SQL remoto ni `cd`/`&&`) y
// consulta la copia local con better-sqlite3. No deployea.
// Uso: node scripts/pull-prod-feedback.mjs
//
// Requiere `flyctl` autenticado con acceso a la app `gantter`.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inbox = resolve(root, 'feedback', 'inbox.jsonl');

const DB_REMOTE = '/data/data.sqlite';
const tmpDir = mkdirSync(resolve(tmpdir(), `gantter-pull-${process.pid}`), { recursive: true });
const DB_LOCAL = resolve(tmpDir, 'data.sqlite');

function fetchRemote(remotePath) {
  // flyctl (con pty) devuelve exit 1 con "The handle is invalid" en Windows
  // aunque el stdout traiga los bytes bien; por eso se valida el contenido.
  const r = spawnSync('flyctl', ['ssh', 'console', '-C', `cat ${remotePath}`], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  });
  if (!r.stdout || r.stdout.length === 0) {
    const msg = (r.stderr || Buffer.alloc(0)).toString('utf8').trim() || String(r.error || r.status);
    throw new Error(`${remotePath}: ${msg}`);
  }
  return r.stdout;
}

try {
  writeFileSync(DB_LOCAL, fetchRemote(DB_REMOTE));
  // WAL: si hay escrituras recientes sin checkpoint, la copia del main puede
  // quedar atrás; se baja el -wal y se abre la copia en modo normal para que
  // SQLite lo replique.
  try {
    writeFileSync(`${DB_LOCAL}-wal`, fetchRemote(`${DB_REMOTE}-wal`));
  } catch {
    // sin WAL pendiente: ok
  }

  const require = createRequire(resolve(root, 'server', 'resolve-hint.cjs'));
  const Database = require('better-sqlite3');
  const db = new Database(DB_LOCAL);
  const rows = db.prepare('SELECT document FROM feedback').all();
  db.close();

  const existing = new Set();
  if (existsSync(inbox)) {
    for (const line of readFileSync(inbox, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      try {
        existing.add(JSON.parse(t).id);
      } catch {
        // línea corrupta: se ignora
      }
    }
  }

  const fresh = [];
  for (const row of rows) {
    try {
      const entry = JSON.parse(row.document);
      if (entry?.id && !existing.has(entry.id)) {
        existing.add(entry.id);
        fresh.push(entry);
      }
    } catch {
      // fila no-json: se ignora
    }
  }

  if (!fresh.length) {
    console.log('pull-prod-feedback: sin comentarios nuevos desde prod.');
    process.exit(0);
  }

  fresh.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  mkdirSync(resolve(root, 'feedback'), { recursive: true });
  appendFileSync(inbox, fresh.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  console.log(`pull-prod-feedback: +${fresh.length} desde prod -> feedback/inbox.jsonl`);
} catch (err) {
  console.error('pull-prod-feedback: fallo:', err?.message || err);
  process.exit(1);
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}