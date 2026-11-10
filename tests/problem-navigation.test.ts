import {expect, test} from 'bun:test';
import {existsSync, readFileSync} from 'node:fs';
import {createExamIndex,createStudyProblem} from '../content/navigation';
import {exams} from '../content/catalog.server';
import {createCatalog} from '../src/lib/catalog';
import {problemPath} from '../src/lib/problem-navigation';

test('part destinations retain their stable IDs in shareable links', () => {
  expect(problemPath('e1-f26-q1','e1-f26-q1-ai')).toBe('/problems/e1-f26-q1/#e1-f26-q1-ai');
  expect(problemPath('e1-f26-q1')).toBe('/problems/e1-f26-q1/');
});

test('navigation and progress retain every stable ID without the retired search corpus', () => {
  const index = createExamIndex(exams);
  const catalog = createCatalog(index, {});
  expect(catalog.totalParts).toBe(exams.flatMap(exam => exam.problems).reduce((sum, problem) => sum + problem.parts.length, 0));
  for (const exam of exams) for (const problem of exam.problems) {
    expect(catalog.findProblem(problem.id).problem).toEqual({
      id: problem.id, number: problem.number, title: problem.title,
      parts: problem.parts.map(({id}) => ({id})),
    });
    for (const part of problem.parts) expect(catalog.partIds.has(part.id)).toBe(true);
  }
});

test('reader page data drops the retired overview without deleting authored solutions or source records', () => {
  for (const exam of exams) for (const problem of exam.problems) {
    const before = JSON.stringify(problem);
    const {guide, ...expected} = problem;
    const reader = createStudyProblem(problem);
    expect(reader).toEqual(expected);
    expect(reader).not.toHaveProperty('guide');
    expect(reader.parts).toBe(problem.parts);
    expect(reader.lectures).toBe(problem.lectures);
    expect(problem.guide).toBe(guide);
    expect(JSON.stringify(problem)).toBe(before);
  }
});

test('retired overview component, presentation, styles and labels are removed rather than hidden', () => {
  const desk = readFileSync('src/lib/components/StudyDesk.svelte', 'utf8');
  const css = readFileSync('src/styles/layout.css', 'utf8');
  expect(existsSync('src/lib/components/ProblemOverview.svelte')).toBe(false);
  for (const source of [desk, css]) expect(source).not.toMatch(/ProblemOverview|problem-overview|overview-title|overview-prose|overview-references|solution-section-heading|worked-solution|先读懂这道题|一步一步推导|WORK IT THROUGH/);
  expect(desk).not.toContain('problem.guide');
  expect(desk).toContain('data-solution-toggle');
  expect(desk).toContain('aria-controls="worked-parts"');
  expect(desk).toContain('aria-expanded={openParts.length>0}');
  expect(desk).toContain('<Accordion.Root id="worked-parts"');
  expect(readFileSync('src/lib/components/ProblemPart.svelte', 'utf8')).toContain('class="part-trigger" level={2}');
});

test('search controls, state, keyboard interception and dedicated code are removed', () => {
  const desk = readFileSync('src/lib/components/StudyDesk.svelte', 'utf8');
  const library = readFileSync('src/lib/components/Library.svelte', 'utf8');
  const css = readFileSync('src/styles/layout.css', 'utf8');
  for (const source of [desk, library, css]) expect(source).not.toMatch(/search|搜索/i);
  expect(desk).not.toMatch(/macKeys|navigator\.platform|toLowerCase\(\)\s*===\s*['"]k['"]/);
  expect(desk).toContain('aria-keyshortcuts="Control+b Meta+b"');
  expect(desk).toContain("document.addEventListener('astro:page-load',hashPart)");
  expect(desk).toMatch(/<div class="toolbar-actions">\s*<Tooltip.Root>/);
  expect(library).toContain('formulasForExam(examNumber)');
  expect(library).toContain('{#each formulas as formula(formula.id)}');
  for (const path of ['src/lib/components/Search.svelte', 'src/lib/search.ts']) expect(existsSync(path)).toBe(false);
});
