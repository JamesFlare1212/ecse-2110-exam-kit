import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {createPdfBundle, sha256, sourcePdfs} from './source_pdfs';

try {
  if (process.argv.length > 3) throw new Error('Usage: bun run sources:bundle [output.zip]');
  const root = process.cwd(), output = resolve(process.argv[2] ?? 'artifacts/deployment/ecse2110-sources.zip');
  if (!output.endsWith('.zip')) throw new Error('Source bundle output must end in .zip');
  const local = relative(root, output).split('\\').join('/');
  if (local.startsWith('static/') || /^content\/(?:en|zh-cn)\/[^/]+\/assets\//.test(local))
    throw new Error('Keep the build-time source bundle outside public site assets');
  const payload = createPdfBundle(root);
  mkdirSync(dirname(output), {recursive: true});
  writeFileSync(output, payload);
  const manifest = {file: output.split(/[\\/]/).at(-1), bytes: payload.byteLength, sha256: sha256(payload), pdfCopies: sourcePdfs(root).length};
  writeFileSync(`${output}.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Created canonical PDF bundle: ${output}\n${manifest.pdfCopies} copies; ${payload.byteLength} bytes; SHA-256 ${manifest.sha256}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Unable to create PDF bundle');
  process.exitCode = 1;
}
