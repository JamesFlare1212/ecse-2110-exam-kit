import formulaData from '../../content/formulas.json';
import type { ExamIndex, Formula, Problem, SourceDocument, Locale } from './types';
import { formulaReferences } from '../../content/text';
import { DEFAULT_PROBLEM_ID } from './problem-navigation';
import { course, formulaSheetFor } from '../../content/course';

export const formulas = formulaData as Formula[];
export const formulaById = Object.fromEntries(formulas.map(f => [f.id, f]));
export function createCatalog(exams: ExamIndex[], documents: Record<string, SourceDocument>) {
  const problemEntries = exams.flatMap(exam => exam.problems.map(problem => ({ exam, problem })));
  const partIds = new Set(problemEntries.flatMap(({problem}) => problem.parts.map(p => p.id)));
  const problemIds = new Set(problemEntries.map(({problem}) => problem.id));
  const findProblem = (id: string) => problemEntries.find(p => p.problem.id === id)
    ?? problemEntries.find(p => p.problem.id === DEFAULT_PROBLEM_ID) ?? problemEntries[0];
  return { exams, documents, problemEntries, partIds, problemIds, totalParts: partIds.size, findProblem };
}
export type Catalog = ReturnType<typeof createCatalog>;
export function formulasForExam(examNumber: number) {
  const sheet = formulaSheetFor(examNumber);
  return sheet ? formulas.filter(formula => formula.source.doc === sheet) : course.resources.formulaSheets ? [] : formulas;
}
export function problemFormulas(problem: Problem, locale: Locale) {
  const ids = [...new Set(problem.parts.flatMap(p => formulaReferences(p.solution[locale])))];
  const available = new Set(formulasForExam(Number(/^[ep](\d+)/.exec(problem.id)?.[1])).map(formula => formula.id));
  return ids.map(id => formulaById[id]).filter(formula => formula && available.has(formula.id));
}
