import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import { papersPlugin } from './scripts/papers-plugin';
import { criticalFontInlineLimit } from './scripts/font-assets';

export default defineConfig({
  output: 'static',
  outDir: './build',
  publicDir: './.public-assets',
  trailingSlash: 'ignore',
  server: { host: '127.0.0.1', port: 5173 },
  integrations: [svelte()],
  vite: {
    // The virtual astro:transitions/client facade is discovered only at request
    // time. Include its resolved re-exports before the first browser loads the
    // dev toolbar, otherwise re-optimization invalidates that toolbar's chunks.
    environments: { client: { optimizeDeps: { include: [
      'astro/virtual-modules/transitions-router.js',
      'astro/virtual-modules/transitions-types.js',
      'astro/virtual-modules/transitions-events.js',
      'astro/virtual-modules/transitions-swap-functions.js',
    ] } } },
    plugins: [tailwindcss(), papersPlugin()],
    build: { assetsInlineLimit: criticalFontInlineLimit },
    server: { watch: {
      usePolling: true, interval: 700,
      // Vite must observe staged paper additions/removals to update its public-file cache.
      ignored: ['**/.git/**', '**/.astro/**', '**/build/**', '**/content/**/extracted/**', '**/.agents/**', '**/scripts/**', '**/design-system/**'],
    } },
  },
});
