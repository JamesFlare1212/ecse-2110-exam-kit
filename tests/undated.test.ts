import {expect, test} from 'bun:test';
import {readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {assetSource, loadContent, PAPER_NAME} from '../content/papers.server';
import {parseCourseConfig} from '../content/course';
import {templateFixture} from './fixtures/template';

function undatedFixture() {
  const root = templateFixture();
  for (const language of ['en', 'zh-cn']) {
    const folder = resolve(root, language, 'exam1_u00');
    renameSync(resolve(root, language, 'exam1_f00'), folder);
    for (const name of ['paper.json', 'documents.json', 'figure-sources.json', 'questions/q1.md']) {
      const path = resolve(folder, name);
      writeFileSync(path, readFileSync(path, 'utf8').replaceAll('e1-f00', 'e1-u00'));
    }
    const path = resolve(folder, 'paper.json');
    const paper = JSON.parse(readFileSync(path, 'utf8'));
    paper.year = null;
    paper.term = language === 'en' ? 'Undated archive' : '年份未注明';
    writeFileSync(path, JSON.stringify(paper));
  }
  return root;
}

test('undated sources use a reserved stable slot without inventing an academic year', () => {
  const root = undatedFixture();
  try {
    const content = loadContent(root);
    expect(content.exams[0].year).toBeNull();
    expect(content.exams[0].id).toBe('e1-u00');
    expect(content.exams[0].problems[0].parts[0].id).toBe('e1-u00-q1-a');
    expect(assetSource('/papers/en/exam1_u00/sources/e1-u00.pdf', root)).toBe(resolve(root, 'en/exam1_u00/assets/sources/e1-u00.pdf'));
    expect(parseCourseConfig({...content.course, defaultProblemId: 'e1-u00-q1'}).defaultProblemId).toBe('e1-u00-q1');
  } finally { rmSync(root, {recursive: true, force: true}); }
});

test('only u00 is reserved; unknown-year sources cannot acquire a guessed year', () => {
  expect(PAPER_NAME.test('exam2_u00')).toBe(true);
  for (const name of ['exam2_u26', 'exam0_u00', 'exam2_u000', '../exam2_u00']) expect(PAPER_NAME.test(name)).toBe(false);
  const root = undatedFixture();
  try {
    for (const language of ['en', 'zh-cn']) {
      const path = resolve(root, language, 'exam1_u00/paper.json');
      const paper = JSON.parse(readFileSync(path, 'utf8'));
      paper.year = 2026;
      writeFileSync(path, JSON.stringify(paper));
    }
    expect(() => loadContent(root)).toThrow('exam ID and number must match');
  } finally { rmSync(root, {recursive: true, force: true}); }
});
