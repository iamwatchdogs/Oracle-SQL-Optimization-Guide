import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveBase } from '../../src/lib/site.mjs';

const here = import.meta.dirname;
const dist = path.resolve(here, '../../dist');
const port = Number(process.argv[2] ?? 4322);

/*
 * The path prefix the build was made for, passed in by Playwright.
 *
 * Astro writes a flat `dist/` even when `base` is set — a GitHub Pages artifact
 * is served whole at `/<repo>/` — but every href it generates points at that
 * prefix. So the server has to mount `dist` under it, or the stylesheet 404s and
 * every computed-style assertion in the suite silently falls back to UA defaults.
 *
 * Read from `astro.config.mjs` rather than passed as a literal so the harness
 * cannot quietly test a different deployment than the one being built.
 */
const mount = (await resolveBase()).replace(/\/$/u, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const contentType = (file) => TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

const resolveFile = async (urlPath) => {
  let decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);

  /*
   * Both the mounted path and the bare one reach the same file.
   *
   * The deployed site exists only at the mount, so this leniency is not
   * fidelity — it is what lets the suite drive the site by the routes the book is
   * written in, `/00-preface/`, rather than restating the repository name in 144
   * `page.goto` calls. The cost is that a link missing its prefix would resolve
   * here instead of 404ing, so the guarantee is held somewhere it cannot be
   * argued with: `internal-links.spec.mjs` reads the built HTML and asserts every
   * internal link carries the prefix. That check inspects the artifact itself, so
   * it survives any change to this server.
   */
  if (mount !== '' && (decoded === mount || decoded.startsWith(`${mount}/`))) {
    decoded = decoded.slice(mount.length) || '/';
  }

  const base = path.join(dist, path.normalize(decoded).replace(/^(\.\.[/\\])+/u, ''));
  if (!base.startsWith(dist)) {
    return null;
  }

  const candidates = decoded.endsWith('/')
    ? [path.join(base, 'index.html')]
    : [base, path.join(base, 'index.html'), `${base}.html`];

  const found = await Promise.all(
    candidates.map(async (candidate) => {
      try {
        const info = await stat(candidate);
        return info.isFile() ? candidate : null;
      } catch {
        return null;
      }
    }),
  );
  return found.find(Boolean) ?? null;
};

const server = createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/');
  if (!file) {
    /* Serve dist/404.html for an unresolvable path, the way a static host
       would. Without this the 404 page is unreachable through e2e and can
       never be regression-tested: the reader gets a bare text/plain body. */
    try {
      const body = await readFile(path.join(dist, '404.html'));
      res.writeHead(404, { 'content-type': TYPES['.html'] });
      res.end(body);
      return;
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': contentType(file) });
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error');
  }
});

server.listen(port, () => {
  process.stdout.write(`static dist server on http://localhost:${port}\n`);
});
