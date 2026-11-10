import { describe, expect, test } from 'bun:test';
import { exams, formulas, documents, documentsByLocale } from '../content/catalog.server';
import { parseContent } from '../content/schema';
import type { Exam } from '../content/types';

describe('Authored question and metadata validation', () => {
  test('uses the source objects without rewriting question or solution data', () => {
    const input = structuredClone(exams);
    const before = JSON.stringify(input);
    expect(parseContent(input, formulas, documents, documentsByLocale).exams).toBe(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  const cases: [string, (exam: Exam) => void, RegExp][] = [
    ['missing translation', e => { Reflect.deleteProperty(e.problems[0].statement, 'zh'); }, /statement\.zh/],
    ['unescaped TeX control character', e => { e.problems[0].statement.en += '\b'; }, /control character/],
    ['literal Unicode escape in a translation', e => { e.problems[0].parts[0].solution.zh += ' \\u58F3'; }, /literal Unicode escape/],
    ['bare current-density symbol', e => { e.problems[0].parts[0].solution.zh += '\n\n电流密度 J'; }, /KaTeX delimiters/],
    ['Unicode math in prose', e => { e.problems[0].parts[0].note = {zh:'密度 ρ₀',en:'Density $\\rho_0$'}; }, /KaTeX delimiters/],
    ['broken inline equation', e => { e.problems[0].guide.en += ' $\\frac{$'; }, /guide\.en.*invalid TeX/],
    ['unclosed math delimiter', e => { e.problems[0].parts[0].solution.en += '\n\n$J'; }, /unmatched math delimiter/],
    ['invalid equation', e => { e.problems[0].parts[0].solution.en += '\n\n$$\n\\boxed{\\frac{}\n$$'; }, /solution\.en.*invalid TeX/],
    ['unknown formula reference', e => { e.problems[0].parts[0].solution.en += '\n\n[Missing](formula:missing-formula)'; }, /unknown formula missing-formula/],
    ['unlinked lecture in solution', e => { e.problems[0].parts[0].solution.en = 'Use Lecture 9, pages 5–6.\n\n' + e.problems[0].parts[0].solution.en; }, /inline source-page link/],
    ['unlinked lecture in guide', e => { e.problems[0].guide.zh += '见第 9 讲第 5 页。'; }, /inline source-page link/],
    ['unlinked lecture in correction', e => { e.problems[0].parts[0].note = {en: 'Compare Lecture 9, page 6.'}; }, /inline source-page link/],
    ['unlinked lecture in caption', e => { e.problems[0].parts[0].figureCaption = {en: 'Lecture 9, page 5', zh: '图示'}; }, /inline source-page link/],
    ['duplicate part ID', e => { e.problems[0].parts.push(structuredClone(e.problems[0].parts[0])); }, /duplicate ID/],
    ['invalid PDF page', e => { e.problems[0].parts[0].sourcePage = 9999; }, /sourcePage.*exceeds/],
    ['out-of-page citation', e => { e.problems[0].originalFigure.region = [.9, .9, .2, .2]; }, /rectangle must fit/],
    ['misspelled field', e => { Object.assign(e.problems[0], { statment: 'typo' }); }, /statment.*unknown field/],
  ];
  test.each(cases)('rejects %s before static rendering', (_name, mutate, error) => {
    const input = structuredClone(exams);
    mutate(input[0]);
    expect(() => parseContent(input, formulas, documents, documentsByLocale)).toThrow(error);
  });

  test.skipIf(formulas.length === 0)('validates inline mathematics in shared formula notes too', () => {
    const input = structuredClone(formulas);
    input[0].note = {zh: '关系 $\\frac{$', en: 'Relation $a$'};
    expect(() => parseContent(exams, input, documents, documentsByLocale)).toThrow(/formulas\[0\]\.note\.zh.*invalid TeX/);
  });

  test('validates visible Markdown prose without treating syntax or link destinations as equations', () => {
    const input = structuredClone(exams);
    input[0].problems[0].guide.en += '\n\n> **Recall** [the lecture](/sources/lecture.pdf?page=2).\n\n- Check the boundary.';
    expect(parseContent(input, formulas, documents, documentsByLocale).exams).toBe(input);
  });
});
