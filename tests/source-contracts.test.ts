import {expect, test} from 'bun:test';
import {readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadContent, PAPER_NAME} from '../content/papers.server';
import {templateFixture} from './fixtures/template';

function configureSheets(root: string, sheets: Record<string, string>) {
  const path = resolve(root, 'course.json');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  config.resources.formulaSheets = sheets;
  writeFileSync(path, JSON.stringify(config));
}

test('text-only questions preserve citations without synthesizing prompt figures', () => {
  const root = templateFixture();
  try {
    for (const locale of ['en', 'zh-cn']) {
      const path = resolve(root, locale, 'exam1_f00/questions/q1.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('givens:', 'figure: null\ngivens:'));
    }
    const q = loadContent(root).exams[0].problems[0];
    expect(q.figure).toBeUndefined();
    expect(q.figureCaption).toBeUndefined();
    expect(q.originalFigure.doc).toBe('e1-f00');
    expect(q.parts).toHaveLength(2);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('matched question figures retain prompt citations and carry an explicit no-original override in both locales', () => {
  const root = templateFixture();
  try {
    const original = loadContent(root).exams[0].problems[0];
    const matched = `${original.id}-matched`;
    for (const locale of ['en', 'zh-cn']) {
      const path = resolve(root, locale, 'exam1_f00/questions/q1.md');
      const note = locale === 'en' ? 'The referenced diagram is missing; matched to verified course material.' : '题干所引图片漏失，补图依据核实过的课程资料匹配。';
      writeFileSync(path, readFileSync(path, 'utf8').replace('givens:', `figure: ${matched}\nfigureOriginal: false\ngivens:`)
        .replace('## Part a', `## Source correction\n\n${note}\n\n## Part a`));
    }
    const q = loadContent(root).exams[0].problems[0];
    expect(q.figure).toBe(matched);
    expect(q.figureOriginal).toBe(false);
    expect(q.originalFigure).toEqual(original.originalFigure);
    expect(q.parts).toEqual(original.parts);
    const path = resolve(root, 'en/exam1_f00/questions/q1.md');
    const source = readFileSync(path, 'utf8');
    writeFileSync(path, source.replace(`figure: ${matched}`, 'figure: null'));
    expect(() => loadContent(root)).toThrow('requires a question figure');
    writeFileSync(path, source.replace('figureOriginal: false', 'figureOriginal: true'));
    expect(() => loadContent(root)).toThrow('invalid frontmatter');
    const registryPath = resolve(root, 'en/exam1_f00/figure-sources.json');
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    registry.figures[matched] = registry.figures[original.id];
    writeFileSync(registryPath, JSON.stringify(registry));
    writeFileSync(path, source.replace('figureOriginal: false\n', ''));
    expect(() => loadContent(root)).toThrow('language files must agree');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('suppressing an original-image counterpart requires an authored source-correction note', () => {
  const root = templateFixture();
  try {
    const path = resolve(root, 'en/exam1_f00/questions/q1.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('givens:', 'figureOriginal: false\ngivens:'));
    expect(() => loadContent(root)).toThrow('requires Source correction provenance');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('mapped reference sheets reject lecture additions and cross-exam formula links', () => {
  const root = templateFixture();
  try {
    configureSheets(root, {'1': 'e1-f00'});
    expect(() => loadContent(root)).toThrow('not a configured exam reference sheet');
    configureSheets(root, {'1': 'e1-f00', '2': 'course-notes'});
    expect(() => loadContent(root)).toThrow("not on this exam's reference sheet");
    configureSheets(root, {'1': 'course-notes'});
    expect(loadContent(root).formulas).toHaveLength(1);
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('practice packs have distinct stable IDs while belonging to their exam group', () => {
  const root = templateFixture();
  try {
    for (const locale of ['en', 'zh-cn']) {
      const folder = resolve(root, locale, 'practice1_f26');
      renameSync(resolve(root, locale, 'exam1_f00'), folder);
      for (const file of ['paper.json', 'documents.json', 'figure-sources.json', 'questions/q1.md']) {
        const path = resolve(folder, file);
        writeFileSync(path, readFileSync(path, 'utf8').replaceAll('e1-f00', 'p1-f26'));
      }
      const path = resolve(folder, 'paper.json');
      const paper = JSON.parse(readFileSync(path, 'utf8'));
      paper.year = 2026;
      paper.kind = 'practice';
      paper.term = locale === 'en' ? 'Practice set 1' : '练习题组 1';
      writeFileSync(path, JSON.stringify(paper));
    }
    expect(PAPER_NAME.test('practice1_f26')).toBe(true);
    const paper = loadContent(root).exams[0];
    expect(paper.id).toBe('p1-f26');
    expect(paper.kind).toBe('practice');
    expect(paper.number).toBe(1);
    expect(paper.problems[0].parts[0].id).toBe('p1-f26-q1-a');
  } finally { rmSync(root, {recursive: true, force: true}); }
});
