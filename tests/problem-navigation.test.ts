import {expect, test} from 'bun:test';
import {existsSync, readFileSync} from 'node:fs';
import {createExamIndex} from '../content/navigation';
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
