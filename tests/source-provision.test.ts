import {expect, test} from 'bun:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {unzipSync, zipSync} from 'fflate';
import {createPdfBundle, downloadPdfBundle, MAX_BUNDLE_BYTES, missingPdfs, prepareSourcePdfs, restorePdfBundle, sha256, sourcePdfs} from '../scripts/source_pdfs';

async function rejects(promise: Promise<unknown>, fragment: string) {
  await assert.rejects(promise, error => error instanceof Error && error.message.includes(fragment));
}

function fixture(populated = false) {
  const root = mkdtempSync(resolve(tmpdir(), 'fieldnotes-source-provision-'));
  const bytes = Buffer.from('%PDF-1.4\nSynthetic deployment-test PDF\n%%EOF\n');
  const put = (path: string, data: string | Uint8Array) => { mkdirSync(dirname(path), {recursive: true}); writeFileSync(path, data); };
  const record = {pdf: '/sources/notes.pdf', sha256: sha256(bytes), original: 'reference/Notes.pdf'};
  put(resolve(root, 'content/documents.json'), JSON.stringify({notes: record}));
  for (const locale of ['en', 'zh-cn']) {
    put(resolve(root, 'content', locale, 'practice1_f26/documents.json'), JSON.stringify({
      'p1-f26-sol': {...record, pdf: 'sources/p1-f26-sol.pdf', original: 'Exams/Practice.pdf'},
    }));
  }
  const records = sourcePdfs(root);
  if (populated) for (const record of records) put(resolve(root, record.path), bytes);
  const archive = () => zipSync(Object.fromEntries(records.map(record => [record.path, bytes])));
  return {root, bytes, records, put, archive, close: () => rmSync(root, {recursive: true, force: true})};
}

test('build provisions PDFs before paper staging and content validation', () => {
  const scripts = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).scripts;
  expect(scripts.build).toStartWith('bun run sources:prepare && bun run papers:prepare &&');
  expect(scripts.dev).toStartWith('bun run sources:prepare &&');
  expect(scripts['sources:prepare']).toBe('bun scripts/prepare_source_pdfs.ts');
});

test('complete builds stay offline and never require a bundle or Python', async () => {
  const f = fixture(true);
  try {
    expect(await prepareSourcePdfs({root: f.root, env: {COURSE_SOURCES_URL: 'expired-or-invalid'}, request: async () => { throw new Error('Unexpected network access'); }})).toBe(3);
  } finally { f.close(); }
});

test('a clean clone reports actionable build-time provisioning instructions', async () => {
  const f = fixture();
  try {
    await rejects(prepareSourcePdfs({root: f.root, env: {}}), 'Missing 3 required source PDFs');
    await rejects(prepareSourcePdfs({root: f.root, env: {}}), 'at BUILD TIME');
    expect(missingPdfs(f.root)).toHaveLength(3);
  } finally { f.close(); }
});

test('a canonical ZIP restores separate language files with verified bytes', async () => {
  const f = fixture();
  try {
    const bundle = resolve(f.root, 'deployment.zip');
    writeFileSync(bundle, f.archive());
    expect(await prepareSourcePdfs({root: f.root, env: {COURSE_SOURCES_FILE: bundle}})).toBe(3);
    expect(missingPdfs(f.root)).toEqual([]);
    const paths = f.records.slice(1).map(record => resolve(f.root, record.path));
    expect(statSync(paths[0]).ino).not.toBe(statSync(paths[1]).ino);
    for (const record of f.records) expect(sha256(readFileSync(resolve(f.root, record.path)))).toBe(record.sha256);
  } finally { f.close(); }
});

test('bundles contain only registered PDFs, never private reference exports', () => {
  const f = fixture(true);
  try {
    f.put(resolve(f.root, 'reference/submission_private.pdf'), '%PDF-private');
    const files = unzipSync(createPdfBundle(f.root));
    expect(Object.keys(files).sort()).toEqual(f.records.map(record => record.path).sort());
    expect(Object.keys(files).join('\n')).not.toContain('submission');
  } finally { f.close(); }
});

test('the local reference archive imports only exact registered originals', async () => {
  const f = fixture();
  try {
    f.put(resolve(f.root, 'reference/Notes.pdf'), f.bytes);
    f.put(resolve(f.root, 'reference/Exams/Practice.pdf'), f.bytes);
    f.put(resolve(f.root, 'reference/submission_private.pdf'), '%PDF-private');
    expect(await prepareSourcePdfs({root: f.root, env: {}})).toBe(3);
    expect(existsSync(resolve(f.root, 'static/sources/submission_private.pdf'))).toBe(false);
  } finally { f.close(); }
});

test('missing or corrupt ZIP members fail before any archive PDF is installed', () => {
  const f = fixture();
  try {
    const partial = {[f.records[0].path]: f.bytes};
    expect(() => restorePdfBundle(f.root, zipSync(partial), f.records)).toThrow('Source bundle is missing');
    expect(f.records.every(record => !existsSync(resolve(f.root, record.path)))).toBe(true);
    const corrupt = Object.fromEntries(f.records.map((record, i) => [record.path, i === 2 ? Buffer.from('%PDF-corrupt') : f.bytes]));
    expect(() => restorePdfBundle(f.root, zipSync(corrupt), f.records)).toThrow('Source SHA-256 mismatch');
    expect(f.records.every(record => !existsSync(resolve(f.root, record.path)))).toBe(true);
  } finally { f.close(); }
});

test('unregistered traversal members are ignored, never extracted', () => {
  const f = fixture();
  try {
    const files = Object.fromEntries(f.records.map(record => [record.path, f.bytes]));
    files['../outside-source-test.pdf'] = Buffer.from('unregistered');
    files['reference/submission_private.pdf'] = Buffer.from('unregistered');
    restorePdfBundle(f.root, zipSync(files), f.records);
    expect(missingPdfs(f.root)).toEqual([]);
    expect(existsSync(resolve(f.root, 'reference'))).toBe(false);
    expect(existsSync(resolve(f.root, '../outside-source-test.pdf'))).toBe(false);
  } finally { f.close(); }
});

test('registered paths cannot escape the project or follow a symlink', () => {
  const f = fixture();
  try {
    const outside = resolve(f.root, 'external');
    mkdirSync(outside);
    mkdirSync(resolve(f.root, 'static'));
    symlinkSync(outside, resolve(f.root, 'static/sources'), 'dir');
    expect(() => restorePdfBundle(f.root, f.archive(), f.records)).toThrow('must not be symlinks');
    expect(existsSync(resolve(outside, 'notes.pdf'))).toBe(false);
    writeFileSync(resolve(f.root, 'content/documents.json'), JSON.stringify({bad: {pdf: '/sources/../../escape.pdf', sha256: sha256(f.bytes), original: 'bad.pdf'}}));
    expect(() => sourcePdfs(f.root)).toThrow('Invalid PDF provenance');
  } finally { f.close(); }
});

test('existing altered sources are not overwritten by downloads', async () => {
  const f = fixture(true);
  try {
    const path = resolve(f.root, f.records[0].path);
    writeFileSync(path, '%PDF-altered');
    await rejects(prepareSourcePdfs({root: f.root, env: {COURSE_SOURCES_URL: 'https://example.test/bundle.zip'}, request: async () => { throw new Error('Must not fetch'); }}), 'Source SHA-256 mismatch');
    expect(readFileSync(path, 'utf8')).toBe('%PDF-altered');
  } finally { f.close(); }
});

test('HTTPS download works without forwarding the URL into errors or source metadata', async () => {
  const f = fixture();
  try {
    const calls: string[] = [];
    expect(await prepareSourcePdfs({root: f.root, env: {COURSE_SOURCES_URL: 'https://example.test/bundle.zip?signature=test-only'}, request: async (url, init) => {
      calls.push(url);
      expect(init.redirect).toBe('manual');
      return new Response(f.archive());
    }})).toBe(3);
    expect(calls).toHaveLength(1);
    expect(readFileSync(resolve(f.root, 'content/documents.json'), 'utf8')).not.toContain('signature');
    await rejects(downloadPdfBundle('https://example.test/bundle.zip?signature=test-only', async url => { throw new Error(url); }), 'Unable to download COURSE_SOURCES_URL (network error or timeout)');
  } finally { f.close(); }
});

test('downloads reject insecure redirects and oversized payloads before extraction', async () => {
  await rejects(downloadPdfBundle('http://example.test/bundle.zip'), 'must use HTTPS');
  await rejects(downloadPdfBundle('https://example.test/bundle.zip', async () => new Response(null, {status: 302, headers: {location: 'http://example.test/plain.zip'}})), 'must use HTTPS');
  await rejects(downloadPdfBundle('https://example.test/bundle.zip', async () => new Response('x', {headers: {'content-length': String(MAX_BUNDLE_BYTES + 1)}})), 'exceeds 256 MiB');
});
