import type { Exam, ExamIndex, Problem, StudyProblem } from './types.ts';

/** Keep retired source-only editorial guidance out of HTML and island payloads. */
export function createStudyProblem({guide: _guide, ...problem}: Problem): StudyProblem {
  return problem;
}

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
