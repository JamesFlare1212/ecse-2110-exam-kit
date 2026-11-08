import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { loadContent, stagePaperAssets } from '../content/papers.server.ts';

/** Watch discovered source files as well as newly added/removed paper folders. */
export function papersPlugin(): Plugin {
  return {
    name: 'fieldnotes-papers',
    configureServer(server) {
      const root = resolve('content') + '/';
      let timer: ReturnType<typeof setTimeout> | undefined;
      const refresh = (path: string) => {
        if (!path.startsWith(root) || (!path.endsWith('.json') && !path.endsWith('.md') && !path.includes('/assets/'))) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          try {
            stagePaperAssets(loadContent().papers);
            for (const environment of Object.values(server.environments)) environment.moduleGraph.invalidateAll();
            server.ws.send({ type: 'full-reload' });
          } catch (error) {
            server.ws.send({ type: 'error', err: { message: String(error), stack: error instanceof Error ? error.stack ?? '' : '' } });
          }
        }, 100);
      };
      server.watcher.add(root);
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
      server.httpServer?.once('close', () => {
        clearTimeout(timer);
        server.watcher.off('add', refresh).off('change', refresh).off('unlink', refresh);
      });
    },
  };
}
