import type { Exam, ExamIndex } from './types.ts';

/** In-memory projection for page data; the authored Markdown remains the only question source. */
export function createExamIndex(exams: Exam[]): ExamIndex[] {
  return exams.map(({ problems, ...exam }) => ({
    ...exam,
    problems: problems.map(({ id, number, title, topic, statement, parts }) => ({
      id, number, title, topic, statement,
      parts: parts.map(({ id, label, prompt }) => ({ id, label, prompt })),
    })),
  }));
}
