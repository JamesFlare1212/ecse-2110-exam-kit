import {describe, expect, test} from 'bun:test';
import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import katex from 'katex';
import {course, pageTitle, parseCourseConfig, sourceName, studyDescription, validateCourseDocuments} from '../content/course';
import {loadContent} from '../content/papers.server';
import {displayEquations, parseText} from '../content/text';
import {project, readTemplate, templateFixture as fixture} from './fixtures/template';

const config = parseCourseConfig(JSON.parse(readTemplate('course.json')));

describe('Reusable course and authoring templates', () => {
  test('a non-ECSE course discovers paired worked articles without the original course data', () => {
    const root = fixture();
    try {
      const content = loadContent(root);
      expect(content.course.id).toBe('new-course');
      expect(content.exams).toHaveLength(1);
      expect(content.exams[0].problems[0].parts.map(part => part.id)).toEqual(['e1-f00-q1-a', 'e1-f00-q1-b']);
      expect(Object.keys(content.documents).sort()).toEqual(['course-notes', 'e1-f00', 'e1-f00-sol']);
      const problem = content.exams[0].problems[0];
      for (const part of problem.parts) for (const locale of ['en', 'zh'] as const) {
        const equations = displayEquations(part.solution[locale]);
        expect(equations[0]).not.toContain('\\boxed');
        expect(equations.at(-1)).toContain('\\boxed');
        expect(part.solution[locale].match(/\\boxed\{/g)).toHaveLength(1);
      }
      expect(problem.parts[1].solution.en).toContain('(-1)^2');
      expect(pageTitle(problem.title.en, content.course)).toBe('A linear function · Fieldnotes · COURSE 101');
      expect(studyDescription('zh', 1, 2, content.course)).toContain('COURSE 101 示例课程');
      expect(studyDescription('en', 1, 2, content.course)).not.toMatch(/ECSE|2100|Fields/);
      expect(sourceName('course-notes', content.documents, content.course)).toBe('Lecture A');
      expect(sourceName('e1-f00', content.documents, content.course)).toBe('Synthetic e1-f00');
    } finally { rmSync(root, {recursive: true, force: true}); }
  });

  test('a course may omit a dedicated formula sheet and have an empty formula library', () => {
    const root = fixture(false);
    try {
      expect(loadContent(root).formulas).toEqual([]);
      expect(config.resources.formulaSheet).toBeNull();
      expect(config.defaultProblemId).toBeNull();
    } finally { rmSync(root, {recursive: true, force: true}); }
  });

  test('authoring rejects duplicated early boxed results, not just a missing final answer', () => {
    const root = fixture();
    try {
      const path = resolve(root, 'en/exam1_f00/questions/q1.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('### Solution', () => '### Solution\n\n$$\n\\boxed{6}\n$$'));
      expect(() => loadContent(root)).toThrow('boxed results belong only in the final displayed calculation');
    } finally { rmSync(root, {recursive: true, force: true}); }
  });

  test('course configuration rejects typos, missing translations, duplicate resources and unversioned storage', () => {
    const invalid = [
      {...config, cdoe: 'TYPO'}, {...config, title: {en: 'Only English'}},
      {...config, storageKey: 'unversioned'}, {...config, defaultProblemId: '../../outside'},
      {...config, resources: {...config.resources, lectures: [config.resources.lectures[0], config.resources.lectures[0]]}},
    ];
    for (const value of invalid) expect(() => parseCourseConfig(value)).toThrow('Invalid course.json');
    expect(() => validateCourseDocuments(config, {})).toThrow('unknown resource document course-notes');
  });

  test('the current course keeps its existing URL preference and storage namespace', () => {
    if (course.id !== 'ecse-2100') return;
    expect(course.storageKey).toBe('ecse2100-fieldnotes-v1');
    expect(course.defaultProblemId).toBe('e2-s26-q3');
  });

  test('style-guide worked examples keep valid math and a single final boxed calculation', () => {
    const guide = readFileSync(resolve(project, 'docs/solution-style.md'), 'utf8');
    const examples = parseText(guide).children.filter(node => node.type === 'code' && node.lang === 'markdown');
    expect(examples).toHaveLength(4);
    for (const example of examples) {
      if (example.type !== 'code') continue;
      const equations = displayEquations(example.value);
      expect(equations[0]).not.toContain('\\boxed');
      expect(equations.at(-1)).toContain('\\boxed');
      expect(example.value.match(/\\boxed\{/g)).toHaveLength(1);
      for (const tex of equations) expect(() => katex.renderToString(tex, {throwOnError: true, strict: 'ignore'})).not.toThrow();
    }
  });
});
