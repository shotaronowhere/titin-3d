#!/usr/bin/env node
/** Loopback-only static server for deterministic source and standalone browser tests. */
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const args = process.argv.slice(2);
const portAt = args.indexOf('--port');
const port = portAt >= 0 ? Number(args[portAt + 1]) : 4173;
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(`invalid --port '${args[portAt + 1]}'`);
}
const TYPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/healthz') {
    response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('ok\n');
    return;
  }
  const requested = url.pathname === '/' ? 'index.html'
    : url.pathname === '/source.html' ? 'src/index.template.html'
      : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const path = normalize(join(ROOT, requested));
  const rel = relative(ROOT, path);
  if (!rel || rel === '..' || rel.startsWith('../')) {
    response.writeHead(403); response.end('forbidden\n'); return;
  }
  try {
    if (!statSync(path).isFile()) throw new Error('not a file');
    const bytes = readFileSync(path);
    response.writeHead(200, {
      'content-type': TYPE[extname(path)] || 'application/octet-stream',
      'content-length': bytes.byteLength,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    });
    response.end(bytes);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('not found\n');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`browser test server listening on http://127.0.0.1:${port}`);
});
