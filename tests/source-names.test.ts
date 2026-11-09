import {describe, expect, test} from 'bun:test';
import {course, sourceName, type CourseConfig} from '../content/course';
import {fixtureDocument} from './fixtures/template';

const first = fixtureDocument('exam-one-reference', 'reference');
const second = {...fixtureDocument('other-reference', 'reference'), title: 'Reference Sheet · Exam 2 · Fall 2026'};
const notes = {...fixtureDocument('notes-without-number', 'lecture'), title: 'A very long original lecture title'};
const documents = {[first.id]: first, [second.id]: second, [notes.id]: notes};
const config: CourseConfig = {...course, resources: {
  formulaSheet: null, formulaSheets: {'1': first.id, '2': second.id},
  lectures: [{doc: notes.id, label: 'A', title: {zh: '课程资料', en: 'Course notes'}}],
}};

describe('Compact formula-source names', () => {
  test('exam sheets use configured identity and locale instead of the full provenance title', () => {
    expect(sourceName(first.id, documents, config, 'zh')).toBe('Exam 1 公式表');
    expect(sourceName(second.id, documents, config, 'zh')).toBe('Exam 2 公式表');
    expect(sourceName(second.id, documents, config, 'en')).toBe('Exam 2 sheet');
    expect(documents[second.id].title).toBe('Reference Sheet · Exam 2 · Fall 2026');
  });
  test('shared sheets list every configured exam numerically without inferring from IDs', () => {
    const shared = {...config, resources: {...config.resources, formulaSheets: {'12': first.id, '3': first.id}}};
    expect(sourceName(first.id, documents, shared, 'en')).toBe('Exam 3/12 sheet');
  });
  test('the single-sheet and lecture interfaces remain compatible with other courses', () => {
    const single = {...config, resources: {...config.resources, formulaSheet: first.id, formulaSheets: undefined}};
    expect(sourceName(first.id, documents, single)).toBe('Crib sheet');
    expect(sourceName(first.id, documents, single, 'zh')).toBe('公式表');
    expect(sourceName(notes.id, documents, config)).toBe('Lecture A');
  });
  test('unconfigured documents preserve their real titles and missing resources retain their ID', () => {
    const unconfigured = {...config, resources: {...config.resources, formulaSheets: {}}};
    expect(sourceName(second.id, documents, unconfigured, 'zh')).toBe(second.title);
    expect(sourceName('not-a-resource', documents, config)).toBe('not-a-resource');
  });
});
