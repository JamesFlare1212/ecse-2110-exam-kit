import {describe, expect, test} from 'bun:test';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {exams, examIndex, documents, formulas, papers} from '../content/catalog.server';
import {course, formulaSheetFor} from '../content/course';
import {formulasForExam} from '../src/lib/catalog';
import {displayEquations, formulaReferences} from '../content/text';
import {expectIndependentPageImages, expectPaperSourceMetadata} from './fixtures/paper-provenance';
import type {SourceDocument} from '../content/types';

const expected = {'e1-f26': [6, 100], 'e1-s25': [6, 120], 'e2-s25': [7, 100], 'e2-u00': [4, 95]};

describe('ECSE 2110 delivery and provenance', () => {
  test('retains the Fieldnotes visual system while allowing responsive figure improvements', () => {
    // The upstream stylesheet is no longer byte-frozen: image layout now adapts
    // to the article. Preserve the shared themes and reading workspace instead.
    const css = readFileSync(resolve('src/styles/layout.css'), 'utf8');
    expect(css).toMatch(/--background:\s*#faf9f6\b/);
    expect(css).toMatch(/--background:\s*#172025\b/);
    for (const token of ['formula', 'diagram', 'interactive-hover', 'reader-text'])
      expect(css).toContain(`var(--${token})`);
    for (const selector of ['.app-shell', '.reading-layout', '.reference-rail', '.desktop-navigation'])
      expect(css).toContain(selector);
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  });
  test('uses its own course and browser namespace, with all source exams', () => {
    expect(course.id).toBe('ecse-2110');
    expect(course.code).toBe('ECSE 2110');
    expect(course.storageKey).toBe('ecse2110-fieldnotes-v1');
    const originals = exams.filter(exam => exam.kind !== 'practice');
    expect(originals).toHaveLength(4);
    expect(originals.reduce((count, exam) => count + exam.problems.length, 0)).toBe(23);
    expect(exams.filter(exam => exam.kind === 'practice').map(exam => exam.id).sort()).toEqual(['p1-f26', 'p2-f26']);
    for (const exam of originals) {
      expect([exam.problems.length, exam.points]).toEqual(expected[exam.id as keyof typeof expected]);
      expect(exam.problems.reduce((sum, problem) => sum + problem.points, 0)).toBe(exam.points);
    }
    expect(exams.find(exam => exam.id === 'e2-u00')?.year).toBeNull();
    expect(exams.find(exam => exam.id === 'e2-u00')?.problems.map(q => q.number)).toEqual([2, 3, 4, 5]);
  });

  test('all original parts have independent full solutions, not generated answer copies', () => {
    for (const exam of exams) for (const problem of exam.problems) {
      expect(problem.wording).toBe('original');
      expect(problem.guide.en).toBeTruthy();
      expect(problem.guide.zh).toMatch(/[\u4e00-\u9fff]/);
      expect(problem.guide.en).not.toContain('\\boxed');
      expect(problem.guide.zh).not.toContain('\\boxed');
      for (const part of problem.parts) for (const locale of ['en', 'zh'] as const) {
        const math = displayEquations(part.solution[locale]);
        expect(math.length).toBeGreaterThanOrEqual(2);
        expect(math[0]).not.toContain('\\boxed');
        expect(math.at(-1)).toContain('\\boxed');
        expect(math.slice(0, -1).join('\n')).not.toContain('\\boxed');
        expect(part).not.toHaveProperty('answer');
        expect(part.solution[locale]).not.toMatch(/### (?:Step|Answer|Explanation|Equation)/);
        for (const id of formulaReferences(part.solution[locale])) expect(formulas.some(f => f.id === id)).toBe(true);
      }
    }
  });

  test('navigation projects question identity and progress IDs without shipping article text', () => {
    for (const exam of exams) {
      const index = examIndex.find(item => item.id === exam.id)!;
      expect(index.problems.map(q => q.id)).toEqual(exam.problems.map(q => q.id));
      for (const problem of exam.problems) {
        const entry = index.problems.find(q => q.id === problem.id)!;
        expect(entry).toEqual({id: problem.id, number: problem.number, title: problem.title, parts: problem.parts.map(({id}) => ({id}))});
      }
    }
  });

  test('preserves recorded source identities and independently owned locale assets', () => {
    for (const paper of papers) for (const locale of ['en', 'zh'] as const) {
      const local = JSON.parse(readFileSync(resolve(paper.directories[locale], 'documents.json'), 'utf8')) as Record<string, SourceDocument>;
      expect(Object.keys(paper.documents[locale]).sort()).toEqual(Object.keys(local).sort());
      expect(Object.keys(local).sort()).toEqual(Object.keys(paper.documents[locale === 'en' ? 'zh' : 'en']).sort());
      for (const [id, document] of Object.entries(local)) {
        expectPaperSourceMetadata(document, id);
        expect(paper.documents[locale][id]).toEqual({
          ...document,
          pdf: `${paper.assetBase[locale]}/${document.pdf}`,
          pageBase: `${paper.assetBase[locale]}/${document.pageBase}`,
        });
        const paired = paper.documents[locale === 'en' ? 'zh' : 'en'][id];
        for (const key of ['id', 'sha256', 'pages', 'sizes', 'original'] as const) expect(document[key]).toEqual(paired[key]);
        if (locale === 'en') expectIndependentPageImages(Object.values(paper.directories), id, document.pages);
      }
      for (const question of paper.exam.problems) {
        const source = readFileSync(resolve(paper.directories[locale], 'questions', `q${question.number}.md`), 'utf8');
        expect(source).not.toMatch(/## (?:English|中文)/);
        for (const figure of [question.figure, ...question.parts.flatMap(p => [p.figure, p.questionFigure?.name])].filter(Boolean)) {
          for (const suffix of ['', '-dark']) expect(existsSync(resolve(paper.directories[locale], 'assets/figures', `${figure}${suffix}.svg`))).toBe(true);
        }
      }
    }
  });

  test('shared resources reflect the supplied course rather than the template', () => {
    expect(course.resources.lectures.map(l => l.label)).toEqual(['01', '02', '03', '04', '06', '07', '08', '09', '10', '11–12', '13–14', '15']);
    expect(documents['crib']).toBeUndefined();
    expect(formulas).toHaveLength(22);
    for (const number of [1, 2]) {
      const id = `reference-exam${number}`;
      expect(formulaSheetFor(number)).toBe(id);
      expect(documents[id].pages).toBe(2);
      expect(documents[id].original).toContain('Reference_Sheet');
      expect(formulasForExam(number).every(formula => formula.source.doc === id)).toBe(true);
    }
    expect(new Set(formulas.map(formula => formula.source.doc))).toEqual(new Set(['reference-exam1', 'reference-exam2']));
    expect(documents['homework-7']).toBeDefined();
    expect(documents['homework-7-sol']).toBeUndefined();
    for (const id of ['02', '03', '07']) {
      expect(documents[`post-lecture-${id}`]).toBeDefined();
      expect(documents[`post-lecture-${id}`].sha256).not.toBe(documents[`lecture-${id}`].sha256);
    }
    expect(JSON.stringify(documents)).not.toMatch(/ECSE.?2100|Fields and Waves|submission_369646790/);
  });

  test('only authentic printed diagrams appear in original exam prompts', () => {
    const originals = exams.filter(exam => exam.kind !== 'practice');
    expect(originals.flatMap(exam => exam.problems.filter(q => q.figure).map(q => q.id)).sort()).toEqual(['e1-f26-q5','e1-s25-q3','e1-s25-q5','e1-s25-q6']);
    const clean = originals.find(exam => exam.id === 'e1-f26')!;
    expect(clean.doc).toBe('e1-f26-sol');
    expect(clean.problems.every(q => q.originalFigure.doc === 'e1-f26-sol')).toBe(true);
    expect(clean.problems.find(q => q.number === 4)?.figure).toBeUndefined();
    expect(clean.problems.find(q => q.number === 5)?.originalFigure.page).toBe(12);
    expect(clean.problems.find(q => q.number === 6)?.originalFigure.page).toBe(14);
  });

  test('every formula link belongs to the reference sheet for its exam group', () => {
    for (const exam of exams) for (const q of exam.problems) for (const part of q.parts) for (const locale of ['en','zh'] as const) {
      for (const id of formulaReferences(part.solution[locale])) {
        expect(formulas.find(f => f.id === id)?.source.doc).toBe(formulaSheetFor(exam.number) ?? undefined);
      }
    }
  });

  test('no student export or private submission text is part of public resources', () => {
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, {withFileTypes: true})) {
        const path = resolve(directory, entry.name);
        expect(entry.name).not.toMatch(/submission_369646790|gradescope.*\.pdf/i);
        if (entry.isDirectory()) visit(path);
        else if (/\.(?:svg|txt|html)$/i.test(entry.name)) {
          expect(readFileSync(path, 'utf8')).not.toMatch(/Peter Chen|66057490|97\s*\/\s*100\s*pts/);
        }
      }
    };
    visit(resolve('static'));
    for (const paper of papers) for (const directory of Object.values(paper.directories)) visit(resolve(directory, 'assets'));
  });
});
