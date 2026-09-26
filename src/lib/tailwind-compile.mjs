import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/* fileURLToPath, not `.pathname`: a percent-encoded pathname is not a valid
   filesystem path on Windows, and every integration test imports this module. */
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const projectStylesheet = path.join(projectRoot, 'src/styles/global.css');

const runViteCssBuild = async (root, cssPath) => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'tw-out-'));
  try {
    await build({
      root,
      logLevel: 'silent',
      configFile: false,
      plugins: [tailwindcss()],
      build: {
        write: true,
        outDir,
        emptyOutDir: true,
        copyPublicDir: false,
        minify: false,
        rollupOptions: {
          input: cssPath,
          output: { entryFileNames: 'compiled.css', assetFileNames: 'compiled.[ext]' },
        },
      },
    });
    return await readFile(path.join(outDir, 'compiled.css'), 'utf8');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
};

let projectStylesheetCache;

export const compileProjectStylesheet = () => {
  projectStylesheetCache ??= runViteCssBuild(projectRoot, projectStylesheet);
  return projectStylesheetCache;
};

const writeMirror = (mirror, files) =>
  Promise.all(
    Object.entries(files).map(async ([relativePath, contents]) => {
      const target = path.join(mirror, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents);
    }),
  );

export const compileMirroredStylesheet = async (stylesheet, files) => {
  const mirror = await mkdtemp(path.join(tmpdir(), 'tw-mirror-'));
  try {
    await symlink(path.join(projectRoot, 'node_modules'), path.join(mirror, 'node_modules'), 'dir');
    await writeMirror(mirror, files);
    const mirroredStylesheet = path.join(mirror, 'src/styles/mirror.css');
    await mkdir(path.dirname(mirroredStylesheet), { recursive: true });
    await writeFile(mirroredStylesheet, stylesheet);
    return await runViteCssBuild(mirror, mirroredStylesheet);
  } finally {
    await rm(mirror, { recursive: true, force: true });
  }
};
