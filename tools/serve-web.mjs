#!/usr/bin/env node
/**
 * Local preview server for the web build.
 *
 * Exists because `npx serve dist` will NOT work: expo-sqlite's web build
 * drives its worker over SharedArrayBuffer, which browsers only expose to a
 * cross-origin-isolated page. Without the two COOP/COEP headers below the
 * database never opens and the app boots to an error — the same failure you
 * would hit deploying to a host that cannot set custom headers.
 *
 *     npm run build:web && npm run serve:web
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const root = process.argv[2] ?? 'dist';
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

async function resolve(urlPath) {
  // Strip any traversal before touching the filesystem.
  const safe = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  const direct = join(root, safe);
  try {
    const info = await stat(direct);
    if (info.isFile()) return direct;
    // A directory serves its own index — the viewport probes live at
    // /probe/<x>/ as real static pages, and falling through to the SPA
    // shell here would hand every probe the app instead of the probe.
    if (info.isDirectory()) {
      const index = join(direct, 'index.html');
      const inner = await stat(index);
      if (inner.isFile()) return index;
    }
  } catch {
    /* fall through to the SPA shell */
  }
  return join(root, 'index.html');
}

createServer(async (req, res) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  try {
    const file = await resolve(req.url ?? '/');
    const body = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream');
    if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Haki web preview: http://localhost:${port}`);
  console.log('Cross-origin isolation is ON — required for the database to open.');
});
