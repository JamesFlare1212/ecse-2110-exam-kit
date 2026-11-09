import type { Exam, ExamIndex } from './types.ts';

/** In-memory projection for page data; the authored Markdown remains the only question source. */
export function createExamIndex(exams: Exam[]): ExamIndex[] {
  return exams.map(({ problems, ...exam }) => ({
    ...exam,
    problems: problems.map(({ id, number, title, parts }) => ({
      id, number, title,
      parts: parts.map(({ id }) => ({ id })),
    })),
  }));
}
