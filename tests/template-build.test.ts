import {expect, test} from 'bun:test';
import {createHash} from 'node:crypto';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {project, templateFixture} from './fixtures/template';
import type {SourceDocument} from '../content/types';

/** A tiny, genuinely separate source PDF, not a copy of any shipped course file. */
function pdf(title: string) {
  const stream = `BT /F1 12 Tf 60 720 Td (${title}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let result = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(result.length); result += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = result.length;
  result += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) result += `${String(offset).padStart(10, '0')} 00000 n \n`;
  return Buffer.from(result + `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

test('another subject builds static pages with its own branding, sources and storage namespace', async () => {
  const root = mkdtempSync(resolve(tmpdir(), 'fieldnotes-migration-build-'));
  const put = (path: string, value: string | Uint8Array) => { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, value); };
  try {
    renameSync(templateFixture(), resolve(root, 'content'));
    for (const entry of readdirSync(resolve(project, 'content'))) if (entry.endsWith('.ts'))
      cpSync(resolve(project, 'content', entry), resolve(root, 'content', entry));
    cpSync(resolve(project, 'src'), resolve(root, 'src'), {recursive: true});
    mkdirSync(resolve(root, 'scripts'));
    for (const entry of readdirSync(resolve(project, 'scripts'))) if (entry.endsWith('.ts'))
      cpSync(resolve(project, 'scripts', entry), resolve(root, 'scripts', entry));
    for (const file of ['package.json', 'astro.config.ts', 'svelte.config.js', 'tsconfig.json', 'components.json'])
      cpSync(resolve(project, file), resolve(root, file));
    symlinkSync(resolve(project, 'node_modules'), resolve(root, 'node_modules'), 'dir');
    // Keep Vite virtual Astro stylesheet IDs under this fixture when dependencies are shared by symlink.
    const astroConfig = resolve(root, 'astro.config.ts');
    writeFileSync(astroConfig, readFileSync(astroConfig, 'utf8').replace('vite: {', 'vite: {\n    resolve: { preserveSymlinks: true },'));

    const image = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
    const populate = (registryPath: string, assets: string) => {
      const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Record<string, SourceDocument>;
      for (const document of Object.values(registry)) {
        const source = pdf(document.id);
        document.sha256 = createHash('sha256').update(source).digest('hex');
        put(resolve(assets, document.pdf.replace(/^\//, '')), source);
        put(resolve(assets, document.pageBase.replace(/^\//, ''), '1.webp'), image);
      }
      writeFileSync(registryPath, JSON.stringify(registry));
    };
    populate(resolve(root, 'content/documents.json'), resolve(root, 'static'));
    put(resolve(root, 'static/excerpts/fundamental-theorem.webp'), image);
    for (const locale of ['en', 'zh-cn']) {
      const folder = resolve(root, 'content', locale, 'exam1_f00');
      populate(resolve(folder, 'documents.json'), resolve(folder, 'assets'));
      put(resolve(folder, 'generate_figures.py'), '# Synthetic build fixture; no production drawing renderer.\n');
      for (const id of ['e1-f00', 'e1-f00-sol']) put(resolve(folder, 'extracted', `${id}.txt`), `Synthetic ${id}\n`);
      for (const suffix of ['', '-dark']) put(resolve(folder, 'assets/figures', `e1-f00-q1${suffix}.svg`),
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100"><text x="20" y="50" style="font-size:20px">f(x) = 2x</text></svg>');
      put(resolve(folder, 'assets/original-figures/e1-f00-q1.webp'), image);
    }
    const child = Bun.spawn([process.execPath, 'run', 'build'], {cwd: root, stdout: 'pipe', stderr: 'pipe'});
    const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
    expect(code, stdout + stderr).toBe(0);
    const html = readFileSync(resolve(root, 'build/problems/e1-f00-q1/index.html'), 'utf8');
    expect(html).toContain('Fieldnotes · COURSE 101');
    expect(html).toContain('new-course-fieldnotes-v1');
    expect(html).not.toContain('ECSE 2100');
    expect(html).not.toContain('ecse2100-fieldnotes-v1');
    expect(html).toContain('Lecture A');
    expect(html).not.toContain('All 10 pages');
    expect(readFileSync(resolve(root, 'build/index.html'), 'utf8')).toContain('/problems/e1-f00-q1/');
    expect(stdout + stderr).toContain('Prerender verified: 1 problem HTML pages, 2 question parts');
  } finally { rmSync(root, {recursive: true, force: true}); }
}, 90_000);
