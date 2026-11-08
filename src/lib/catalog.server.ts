import { papers } from '../../content/catalog.server';

// Build/CLI-only entrypoint. Client components use the solution-free catalog.ts.
export { exams, examIndex, documents, papers } from '../../content/catalog.server';
export const problemEntries = papers.flatMap(paper => paper.exam.problems.map(problem => ({ exam: paper.exam, problem, paper })));
