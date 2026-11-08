// Build-time PDF provisioning. Never imported by the browser or content compiler.
import {createHash, randomUUID} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve} from 'node:path';
import {unzipSync, zipSync} from 'fflate';

export interface SourcePdf {path: string; sha256: string; original: string}
export const MAX_BUNDLE_BYTES = 256 * 1024 * 1024;
const MAX_PDF_BYTES = 64 * 1024 * 1024;
const PAPER = /^(?:exam|practice)[1-9]\d*_(?:[fs]\d{2}|u00)$/;
export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Read only source registries: provisioning must run before loadContent/staging. */
export function sourcePdfs(root = process.cwd()): SourcePdf[] {
  const records: SourcePdf[] = [];
  function registry(path: string, base: string, shared: boolean) {
    const entries = JSON.parse(readFileSync(path, 'utf8')) as Record<string, {pdf: string; sha256: string; original: string}>;
    for (const [id, doc] of Object.entries(entries)) {
      const pattern = shared ? /^\/sources\/[a-z0-9-]+\.pdf$/ : /^sources\/[a-z0-9-]+\.pdf$/;
      if (!pattern.test(doc.pdf) || !/^[a-f0-9]{64}$/.test(doc.sha256) || typeof doc.original !== 'string')
        throw new Error(`Invalid PDF provenance for ${id} in ${relative(root, path)}`);
      const target = resolve(base, doc.pdf.replace(/^\//, ''));
      const local = relative(root, target).split('\\').join('/');
      if (local.startsWith('../') || isAbsolute(local)) throw new Error('Source PDF path escapes the project');
      records.push({path: local, sha256: doc.sha256, original: doc.original});
    }
  }
  registry(resolve(root, 'content/documents.json'), resolve(root, 'static'), true);
  for (const language of ['en', 'zh-cn']) {
    for (const entry of readdirSync(resolve(root, 'content', language), {withFileTypes: true})) {
      if (entry.isDirectory() && PAPER.test(entry.name)) {
        const paper = resolve(root, 'content', language, entry.name);
        registry(resolve(paper, 'documents.json'), resolve(paper, 'assets'), false);
      }
    }
  }
  if (new Set(records.map(record => record.path)).size !== records.length) throw new Error('Duplicate canonical PDF path');
  return records;
}

function verify(bytes: Uint8Array, record: SourcePdf) {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new Error(`Source PDF exceeds 64 MiB: ${record.path}`);
  if (sha256(bytes) !== record.sha256) throw new Error(`Source SHA-256 mismatch: ${record.path}`);
  if (Buffer.from(bytes.subarray(0, 5)).toString() !== '%PDF-') throw new Error(`Invalid PDF header: ${record.path}`);
}

function noSymlinks(root: string, path: string) {
  let target = root;
  for (const part of path.split('/')) {
    target = resolve(target, part);
    if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error(`Canonical PDF paths must not be symlinks: ${path}`);
  }
}

export function missingPdfs(root: string, records = sourcePdfs(root)) {
  return records.filter(record => {
    noSymlinks(root, record.path);
    const path = resolve(root, record.path);
    if (!existsSync(path)) return true;
    verify(readFileSync(path), record); // Never replace an existing, altered source silently.
    return false;
  });
}

/** Select exact registered members, bound allocation, verify ALL before writing. */
export function restorePdfBundle(root: string, payload: Uint8Array, missing: SourcePdf[]) {
  if (payload.byteLength > MAX_BUNDLE_BYTES) throw new Error('Source bundle exceeds 256 MiB');
  const expected = new Map(missing.map(record => [record.path, record]));
  const seen = new Set<string>();
  let total = 0;
  const files = unzipSync(payload, {filter(info) {
    if (!expected.has(info.name)) return false; // No arbitrary archive extraction, paths or symlinks.
    if (seen.has(info.name)) throw new Error(`Duplicate PDF bundle member: ${info.name}`);
    seen.add(info.name);
    if (info.originalSize > MAX_PDF_BYTES || info.size > MAX_PDF_BYTES) throw new Error(`Source PDF exceeds 64 MiB: ${info.name}`);
    total += info.originalSize;
    if (total > MAX_BUNDLE_BYTES) throw new Error('Expanded source PDFs exceed 256 MiB');
    return true;
  }});
  for (const record of missing) {
    const bytes = files[record.path];
    if (!bytes) throw new Error(`Source bundle is missing ${record.path}`);
    verify(bytes, record);
    noSymlinks(root, record.path);
  }
  for (const record of missing) writePdf(root, record, files[record.path]);
}

function writePdf(root: string, record: SourcePdf, bytes: Uint8Array) {
  noSymlinks(root, record.path);
  const path = resolve(root, record.path), temporary = `${path}.${randomUUID()}.tmp`;
  mkdirSync(dirname(path), {recursive: true});
  try { writeFileSync(temporary, bytes); renameSync(temporary, path); }
  finally { rmSync(temporary, {force: true}); }
}

/** Only inspect registered original paths; never walk/import the student archive. */
function restoreReferenceDirectory(root: string, reference: string, missing: SourcePdf[]) {
  for (const record of missing) {
    const original = record.original.replaceAll('\\', '/').replace(/^reference\//, '');
    if (!original.endsWith('.pdf') || original.startsWith('/') || original.split('/').includes('..')) continue;
    const path = resolve(reference, original);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    verify(bytes, record);
    writePdf(root, record, bytes);
  }
}

type FetchPdfBundle = (url: string, init: RequestInit) => Promise<Response>;
export async function downloadPdfBundle(address: string, request: FetchPdfBundle = (url, init) => fetch(url, init)) {
  let url: URL;
  try { url = new URL(address); } catch { throw new Error('COURSE_SOURCES_URL must be an HTTPS ZIP URL'); }
  const signal = AbortSignal.timeout(120_000);
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('COURSE_SOURCES_URL and every redirect must use HTTPS without embedded credentials');
    let response: Response;
    try { response = await request(url.href, {redirect: 'manual', signal}); }
    catch { throw new Error('Unable to download COURSE_SOURCES_URL (network error or timeout)'); }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Source bundle redirect has no location');
      try { url = new URL(location, url); } catch { throw new Error('Invalid source bundle redirect'); }
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error(`Unable to download source bundle (HTTP ${response.status})`);
    }
    if (Number(response.headers.get('content-length')) > MAX_BUNDLE_BYTES) {
      await response.body.cancel();
      throw new Error('Source bundle exceeds 256 MiB');
    }
    const chunks: Uint8Array[] = [], reader = response.body.getReader();
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BUNDLE_BYTES) { await reader.cancel(); throw new Error('Source bundle exceeds 256 MiB'); }
        chunks.push(chunk.value);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Source bundle exceeds 256 MiB') throw error;
      throw new Error('Unable to read source bundle (network error or timeout)');
    } finally { reader.releaseLock(); }
    return Buffer.concat(chunks, size);
  }
  throw new Error('Too many source bundle redirects');
}

export async function prepareSourcePdfs(options: {
  root?: string; env?: Record<string, string | undefined>; request?: FetchPdfBundle;
} = {}) {
  const root = resolve(options.root ?? process.cwd()), env = options.env ?? process.env;
  const records = sourcePdfs(root);
  let missing = missingPdfs(root, records);
  if (!missing.length) return records.length; // Complete builds are offline, even with an expired bundle URL.
  const reference = resolve(root, env.COURSE_REFERENCE_DIR || 'reference');
  if (existsSync(reference)) restoreReferenceDirectory(root, reference, missing);
  missing = missingPdfs(root, records);
  if (!missing.length) return records.length;
  let payload: Uint8Array;
  if (env.COURSE_SOURCES_FILE) {
    const file = Bun.file(resolve(root, env.COURSE_SOURCES_FILE));
    if (!await file.exists()) throw new Error('COURSE_SOURCES_FILE does not exist inside the build container');
    if (file.size > MAX_BUNDLE_BYTES) throw new Error('Source bundle exceeds 256 MiB');
    payload = new Uint8Array(await file.arrayBuffer());
  } else if (env.COURSE_SOURCES_URL) {
    payload = await downloadPdfBundle(env.COURSE_SOURCES_URL, options.request);
  } else {
    throw new Error([
      `Missing ${missing.length} required source PDFs (large originals are intentionally not stored in Git).`,
      ...missing.slice(0, 3).map(record => `  ${record.path}`),
      'Supply COURSE_SOURCES_URL (HTTPS ZIP) or COURSE_SOURCES_FILE at BUILD TIME, not just at runtime.',
      'Create the canonical bundle from a provisioned checkout: bun run sources:bundle',
      'Alternatively provide reference/ or COURSE_REFERENCE_DIR. See README.md#ci--部署资源.',
    ].join('\n'));
  }
  restorePdfBundle(root, payload, missing);
  if (missingPdfs(root, records).length) throw new Error('Source provisioning did not restore every canonical PDF');
  return records.length;
}

/** ZIP format is compatible with scripts/provision_sources.py; no private archive. */
export function createPdfBundle(root = process.cwd()) {
  const records = sourcePdfs(root), missing = missingPdfs(root, records);
  if (missing.length) throw new Error(`Cannot create a bundle: ${missing.length} canonical PDFs are missing`);
  let total = 0;
  const files = Object.fromEntries(records.map(record => {
    const bytes = readFileSync(resolve(root, record.path));
    total += bytes.byteLength;
    if (total > MAX_BUNDLE_BYTES) throw new Error('Source PDFs exceed 256 MiB');
    return [record.path, bytes];
  }));
  return zipSync(files, {level: 0});
}
