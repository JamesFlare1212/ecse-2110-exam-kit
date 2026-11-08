import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';

/** A publication boundary: keep local source PDFs, serve only rendered assets. */
export function stagePublicAssets(source = resolve('static'), destination = resolve('.public-assets')) {
  function sync(from: string, to: string) {
    mkdirSync(to, {recursive: true});
    const entries = readdirSync(from, {withFileTypes: true}).filter(entry => !/\.pdf$/i.test(entry.name));
    for (const name of readdirSync(to)) if (!entries.some(entry => entry.name === name))
      rmSync(resolve(to, name), {recursive: true, force: true});
    for (const entry of entries) {
      const input = resolve(from, entry.name), output = resolve(to, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Public assets must be independent files: ${input}`);
      if (entry.isDirectory()) sync(input, output);
      else if (!existsSync(output) || !readFileSync(input).equals(readFileSync(output))) copyFileSync(input, output);
    }
  }
  sync(source, destination);
}
