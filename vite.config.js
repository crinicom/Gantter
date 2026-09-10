import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { mkdirSync, appendFileSync } from 'fs';

// Inbox de feedback para el agente (modo dev): cada comentario que se envía en
// la app local (localStorage) se refleja aqui en `feedback/inbox.jsonl`, que es
// lo que el agente lee en cada planning. Solo existe en el dev server; en
// build/preview no hay middleware.
const INBOX_PATH = resolve(__dirname, 'feedback', 'inbox.jsonl');

function feedbackInboxPlugin() {
  return {
    name: 'feedback-inbox',
    configureServer(server) {
      server.middlewares.use('/dev/feedback', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const entry = JSON.parse(body || '{}');
            if (!entry || typeof entry.message !== 'string') {
              res.statusCode = 400;
              res.end('entry with message required');
              return;
            }
            mkdirSync(resolve(__dirname, 'feedback'), { recursive: true });
            appendFileSync(INBOX_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
            res.statusCode = 200;
            res.end('ok');
          } catch {
            res.statusCode = 400;
            res.end('bad json');
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), feedbackInboxPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@maia': resolve(__dirname, 'maia'),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
