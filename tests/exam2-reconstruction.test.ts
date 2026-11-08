import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expectIndependentPageImages, expectPaperSourceMetadata} from './fixtures/paper-provenance';
import {readQuestionMarkdown} from '../content/markdown';
import {displayEquations} from '../content/text';

const root = resolve(import.meta.dir, '..');
const folder = (locale: string) => resolve(root, 'content', locale, 'exam2_u00');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const article = (locale: string, number: number) => {
  const path = resolve(folder(locale), `questions/q${number}.md`);
  return readQuestionMarkdown(readFileSync(path, 'utf8'), path,
    json(resolve(folder(locale), 'figure-sources.json')));
};
const last = (locale: string, number: number, part: number) =>
  displayEquations(article(locale, number).parts[part].solution).at(-1)!;

describe('undated Exam 2 reconstruction', () => {
  test('retains printed numbering and all 95 academic points without guessing a date or Q1', () => {
    for (const locale of ['en', 'zh-cn']) {
      const paper = json(resolve(folder(locale), 'paper.json'));
      expect(paper.id).toBe('e2-u00');
      expect(paper.year).toBeNull();
      expect(paper.points).toBe(95);
      expect(paper.questionsOnly).toBe(true);
      expect(paper.solutionDoc).not.toBe(paper.doc);
      expect([2, 3, 4, 5].map(n => article(locale, n).points)).toEqual([21, 20, 22, 32]);
      expect(article(locale, 2).parts.map(p => p.label)).toEqual(['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7']);
      expect(article(locale, 2).parts.map(p => p.points)).toEqual([3, 3, 3, 3, 3, 3, 3]);
      expect(article(locale, 3).parts.map(p => p.points)).toEqual([10, 10]);
      expect(article(locale, 4).parts.map(p => p.points)).toEqual([7, 7, 8]);
      expect(article(locale, 5).parts.map(p => p.points)).toEqual([16, 10, 6]);
    }
  });

  test('keeps actual printed defects and explains physical underdetermination in both languages', () => {
    expect(article('en', 3).statement).toContain('primer mover');
    expect(article('en', 5).statement).toContain('negligible armature.');
    expect(article('en', 5).parts[1].prompt).toContain('it maximum');
    expect(article('en', 5).parts[1].prompt).toContain('prime mover');
    for (const locale of ['en', 'zh-cn']) {
      expect(article(locale, 2).parts[2].note).toBeTruthy();
      expect(article(locale, 2).parts[5].note).toBeTruthy();
      expect(article(locale, 2).parts[6].note).toBeTruthy();
      expect(article(locale, 3).note).toBeTruthy();
      expect(article(locale, 5).parts[2].note).toContain('246.906');
    }
    // Equal phasors cancel the sinusoidal spatial fundamental, including at
    // nonzero current instants. A rotating balanced-current result is invalid.
    for (const theta of [0, .3, 1.4]) {
      const field = [0, 1, 2].reduce((s, k) => s + Math.cos(theta - 2 * Math.PI * k / 3), 0);
      expect(field).toBeCloseTo(0, 12);
    }
    for (const locale of ['en', 'zh-cn']) {
      expect(article(locale, 2).parts[6].solution).toContain('F_1=0');
      expect(article(locale, 2).parts[6].solution).toContain('F_3');
    }
  });

  test('generator arithmetic respects Y conversion, printed voltage and current direction', () => {
    const loadedLineVoltage = 200 * Math.sqrt(200 / 244);
    const phaseVoltage = 1732 / Math.sqrt(3);
    const internalVoltage = 1.5e6 / (3 * phaseVoltage * Math.sin(Math.PI / 6));
    const currentReal = internalVoltage * Math.sin(Math.PI / 6);
    const currentImag = phaseVoltage - internalVoltage * Math.cos(Math.PI / 6);
    const pf = currentReal / Math.hypot(currentReal, currentImag);
    expect(loadedLineVoltage).toBeCloseTo(181.071492085, 8);
    expect(3 * phaseVoltage * currentReal).toBeCloseTo(1.5e6, 7);
    expect(currentImag).toBeGreaterThan(0); // outward current leads load voltage
    expect(pf).toBeCloseTo(.965954155, 8);
    for (const locale of ['en', 'zh-cn']) {
      expect(last(locale, 3, 1)).toContain('181.0715');
      expect(last(locale, 4, 0)).toContain('3978.87');
      expect(last(locale, 4, 1)).toContain('1000.0293');
      expect(last(locale, 4, 2)).toContain('0.965954');
    }
  });

  test('delta motor satisfies real/reactive power and distinguishes both operating conditions', () => {
    const initialE = 40000 * 4 / (3 * 600 * Math.sin(Math.PI / 3));
    const initialReal = initialE * Math.sin(Math.PI / 3) / 4;
    const initialImag = -(600 - initialE * Math.cos(Math.PI / 3)) / 4;
    const initialPhase = Math.hypot(initialReal, initialImag);
    expect(3 * 600 * initialReal).toBeCloseTo(40000, 8);
    expect(initialPhase * Math.sqrt(3)).toBeCloseTo(240.682993288, 8);
    const newReal = 1.2 * initialE / 4;
    const newImag = -600 / 4;
    const newPhase = Math.hypot(newReal, newImag);
    expect(newPhase * Math.sqrt(3)).toBeCloseTo(265.225271127, 8);
    expect(-3 * 600 * newImag).toBe(270000);
    expect(-3 * 600 * initialImag).toBeCloseTo(246905.989232, 5);
    for (const locale of ['en', 'zh-cn']) {
      expect(last(locale, 5, 0)).toContain('240.6830');
      expect(last(locale, 5, 1)).toContain('265.2253');
      expect(last(locale, 5, 2)).toContain('270.000');
      expect(last(locale, 5, 2)).toContain('153.1279');
    }
  });

  test('both locales retain clean reconstruction provenance metadata and independent page images', () => {
    for (const id of ['e2-u00', 'e2-u00-sol']) {
      for (const locale of ['en', 'zh-cn']) {
        const documents = json(resolve(folder(locale), 'documents.json'));
        const doc = documents[id];
        expectPaperSourceMetadata(doc, id);
        expect(doc.sha256).not.toBe('835d89bf996ba7fa0f8f92c6ffa835bc79f2ca626386c26feba001891743f792');
        expect(doc.pages).toBe(5);
        expect(doc.original).toBe(`scripts/reconstruct_exam2.py#${id === 'e2-u00' ? 'printed-questions' : 'independent-solutions'}`);
      }
      expectIndependentPageImages(['en', 'zh-cn'].map(folder), id, 5);
    }
    expect(json(resolve(folder('en'), 'documents.json'))['e2-u00-sol'].title).toContain('Not official');
  });

  test('preserved reconstruction extraction excludes grading records', () => {
    // PDF bytes, vector objects and PDF text are audited offline by
    // scripts/check_reconstruction.py, independently of these frontend tests.
    for (const locale of ['en', 'zh-cn']) for (const id of ['e2-u00', 'e2-u00-sol']) {
      const text = readFileSync(resolve(folder(locale), `extracted/${id}.txt`), 'utf8');
      expect(text).toContain('1.732');
      expect(text).toContain('600');
      expect(text).not.toMatch(/Graded|Total Points|Question assigned to the following page|Student/);
    }
  });
});
