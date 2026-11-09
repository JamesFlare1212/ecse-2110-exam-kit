import {describe, expect, test} from 'bun:test';
import {readQuestionMarkdown} from '../content/markdown';
import {displayEquations, formulaReferences, parseText, solutionFigure, solutionFigures} from '../content/text';
import {exams} from '../content/catalog.server';
import {readTemplate} from './fixtures/template';

const source = readTemplate('question.en.md');
const resources = JSON.parse(readTemplate('figure-sources.json'));
const declared = source.replace('    points: 4', '    points: 4\n    figure: e1-f00-q1-circuit');
const marker = '![A circuit](figure:e1-f00-q1-circuit)';
const placed = declared.replace('Given $x=3$', `${marker}\n\nGiven $x=3$`);
const read = (text: string) => readQuestionMarkdown(text, 'questions/q1.md', resources);

describe('Authored, context-adjacent solution figures', () => {
  test('standalone Markdown image places the declared local figure without changing equations or references', () => {
    const before = read(source), after = read(placed);
    expect(after.parts[0].figure).toBe('e1-f00-q1-circuit');
    expect(after.parts[0].solution).toContain(marker);
    expect(solutionFigures(after.parts[0].solution)).toEqual(['e1-f00-q1-circuit']);
    expect(displayEquations(after.parts[0].solution)).toEqual(displayEquations(before.parts[0].solution));
    expect(formulaReferences(after.parts[0].solution)).toEqual(formulaReferences(before.parts[0].solution));
    expect(after.statement).toBe(before.statement);
  });
  test('does not interpret code, inline code or ordinary external images as figure placements', () => {
    for (const text of [`\`${marker}\``, `\`\`\`markdown\n${marker}\n\`\`\``, '![Untrusted](https://example.com/a.svg)'])
      expect(solutionFigures(text)).toEqual([]);
    expect(solutionFigure(parseText(marker).children[0])).toBe('e1-f00-q1-circuit');
  });
  test('rejects foreign, undeclared, duplicated, embedded, nested or unsafe figure references', () => {
    const invalid = [
      placed.replace('figure:e1-f00-q1-circuit)', 'figure:another-part)'),
      placed.replace('    figure: e1-f00-q1-circuit\n', ''),
      placed.replace(marker, `${marker}\n\n${marker}`),
      placed.replace(marker, `Text ${marker}`),
      placed.replace(marker, `> ${marker}`),
      placed.replace(marker, '- '+marker),
      placed.replace('figure:e1-f00-q1-circuit)', 'figure:../outside)'),
      placed.replace('figure:e1-f00-q1-circuit)', 'figure:remote?url=https://example.com)'),
    ];
    for (const text of invalid) expect(() => read(text)).toThrow('figure:');
  });
  test('does not permit teaching figure placements in Question, Guide or part prompts', () => {
    for (const heading of ['## Question', '## Guide', '## Part a'])
      expect(() => read(declared.replace(heading, `${heading}\n\n${marker}`))).toThrow('only in Solution');
  });
  test('rejects placements hidden in question-level or part-level source corrections instead of falling back to the end', () => {
    const questionNote = declared.replace('## Part a', `## Source correction\n\n${marker}\n\n## Part a`);
    const partNote = declared.replace('## Part b', `### Source correction\n\n${marker}\n\n## Part b`);
    for (const text of [questionNote, partNote]) {
      expect(() => read(text)).toThrow('only in Solution');
      expect(() => read(text)).toThrow('Source correction');
    }
  });
  test('older plug-in course articles without placements remain backward compatible', () => {
    expect(read(declared).parts[0].figure).toBe('e1-f00-q1-circuit');
    expect(solutionFigures(read(declared).parts[0].solution)).toEqual([]);
  });
  test('every active solution figure is explicitly placed once beside its own explanation in both languages', () => {
    let count = 0;
    for (const exam of exams) for (const problem of exam.problems) for (const part of problem.parts) {
      for (const locale of ['en', 'zh'] as const) {
        const anchors = solutionFigures(part.solution[locale]);
        expect(anchors).toEqual(part.figure ? [part.figure] : []);
        if (part.figure) {
          count++;
          const nodes = parseText(part.solution[locale]).children;
          const index = nodes.findIndex(node => solutionFigure(node) === part.figure);
          expect(index).toBeGreaterThan(0);
          expect(index).toBeLessThan(nodes.length - 1);
        }
      }
    }
    expect(count).toBe(22); // eleven solution illustrations, independently placed in two languages
  });
});
