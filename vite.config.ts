import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const build = `${pkg.version}-${Date.now().toString(36)}`;

// base './' keeps the build portable: it works on GitHub Pages (/LearnGram/),
// at a domain root, and inside the Android app.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    {
      // Stamp the service worker with a unique build id so every deploy gets a fresh cache.
      name: 'stamp-sw',
      apply: 'build',
      writeBundle(opts) {
        const file = resolve(opts.dir ?? 'dist', 'sw.js');
        writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', build));
      },
    },
  ],
});
