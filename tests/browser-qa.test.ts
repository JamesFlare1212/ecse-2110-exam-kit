import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {openQuestionSource} from '../scripts/browser-study-ux-qa.mjs';
import {originalFigureSample, sourceReadingSample} from '../scripts/browser-samples';
import {exams} from '../content/catalog.server';
import {problemFormulas} from '../src/lib/catalog';

test('source-reading QA uses the native page tab and preview, without a retired figure action', async () => {
  const calls: unknown[] = [];
  const source = '/papers/zh-cn/exam1_f26/pages/exam1/1.webp';
  const page = {
    getByRole(role: string, options: unknown) {
      calls.push(['role', role, options]);
      return {async click() {calls.push('open-tab');}};
    },
    locator(selector: string) {
      calls.push(['locator', selector]);
      return {first() {return {
        locator(selector: string) {
          calls.push(['preview-child', selector]);
          return {async getAttribute(name: string) {calls.push(['attribute', name]); return source;}};
        },
        async click() {calls.push('open-preview');},
      };}};
    },
  };
  expect(await openQuestionSource(page)).toBe(source);
  expect(calls).toEqual([
    ['role', 'tab', {name: '试卷原页', exact: true}], 'open-tab',
    ['locator', '.source-page-preview'], ['preview-child', 'img'], ['attribute', 'src'], 'open-preview',
  ]);
  expect(readFileSync('scripts/browser-study-ux-qa.mjs', 'utf8')).not.toContain('data-figure-source');
});

test('source-reading QA selects a question with actual formula references when available', () => {
  const problems = exams.flatMap(exam => exam.problems);
  const candidates = problems.filter(problem => problemFormulas(problem, 'zh').length > 0);
  expect(sourceReadingSample(exams)).toBe(candidates[0]?.id);
  expect(sourceReadingSample([{problems: problems.filter(problem => !problemFormulas(problem, 'zh').length)}])).toBeUndefined();
  expect(sourceReadingSample([])).toBeUndefined();
});

test('figure-switch QA skips text-only questions and missing-reference supplements', () => {
  const problems = [
    {id: 'text'},
    {id: 'supplement', figure: 'supplement', figureOriginal: false as const},
    {id: 'original', figure: 'original'},
  ];
  expect(originalFigureSample([{problems}])).toBe('original');
  expect(originalFigureSample([{problems: problems.slice(0, 2)}])).toBeUndefined();
  expect(originalFigureSample([])).toBeUndefined();
});
