import {expect, test} from 'bun:test';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {stagePublicAssets} from '../scripts/public-assets';
import {loadContent, stagePaperAssets} from '../content/papers.server';
import {templateFixture} from './fixtures/template';

test('public staging preserves images but excludes and cleans PDFs without deleting originals', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'fieldnotes-public-assets-'));
  try {
    const source = resolve(root, 'static'), target = resolve(root, 'public');
    mkdirSync(resolve(source, 'pages'), {recursive: true});
    mkdirSync(resolve(source, 'sources'), {recursive: true});
    mkdirSync(resolve(target, 'sources'), {recursive: true});
    writeFileSync(resolve(source, 'pages/1.webp'), 'rendered page');
    writeFileSync(resolve(source, 'sources/original.pdf'), '%PDF-local-only');
    writeFileSync(resolve(source, 'sources/other.PDF'), '%PDF-local-only');
    writeFileSync(resolve(target, 'sources/stale.pdf'), '%PDF-stale-public-copy');
    stagePublicAssets(source, target);
    expect(readFileSync(resolve(target, 'pages/1.webp'), 'utf8')).toBe('rendered page');
    expect(Array.from(new Bun.Glob('**/*.{pdf,PDF}').scanSync({cwd: target}))).toEqual([]);
    expect(existsSync(resolve(source, 'sources/original.pdf'))).toBe(true);
    expect(existsSync(resolve(source, 'sources/other.PDF'))).toBe(true);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('each paper stages its independent page images but never original PDF files', () => {
  const root = templateFixture();
  try {
    for (const locale of ['en', 'zh-cn']) {
      const assets = resolve(root, locale, 'exam1_f00/assets');
      mkdirSync(resolve(assets, 'sources'), {recursive: true});
      mkdirSync(resolve(assets, 'pages/e1-f00'), {recursive: true});
      writeFileSync(resolve(assets, 'sources/e1-f00.pdf'), '%PDF-local-original');
      writeFileSync(resolve(assets, 'pages/e1-f00/1.webp'), locale);
    }
    const destination = resolve(root, 'staging');
    stagePaperAssets(loadContent(root).papers, destination);
    for (const locale of ['en', 'zh-cn']) {
      expect(readFileSync(resolve(destination, locale, 'exam1_f00/pages/e1-f00/1.webp'), 'utf8')).toBe(locale);
      expect(existsSync(resolve(destination, locale, 'exam1_f00/sources/e1-f00.pdf'))).toBe(false);
      expect(existsSync(resolve(root, locale, 'exam1_f00/assets/sources/e1-f00.pdf'))).toBe(true);
    }
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('build and dev do not invoke PDF provisioning or retain archive-download dependencies', () => {
  const {scripts, devDependencies, dependencies} = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  expect(scripts.build).toStartWith('bun run papers:prepare && bun run content:check');
  expect(scripts.dev).toStartWith('bun run papers:prepare &&');
  expect(scripts).not.toHaveProperty('sources:prepare');
  expect(scripts).not.toHaveProperty('sources:bundle');
  expect(devDependencies).not.toHaveProperty('fflate');
  expect(dependencies).not.toHaveProperty('fflate');
  for (const path of ['scripts/source_pdfs.ts', 'scripts/create_source_bundle.ts', 'scripts/prepare_source_pdfs.ts'])
    expect(existsSync(resolve(path))).toBe(false);
});
