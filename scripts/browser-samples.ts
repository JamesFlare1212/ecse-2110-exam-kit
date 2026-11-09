import type {Problem} from '../content/types';
import {problemFormulas} from '../src/lib/catalog';

/** Exercise both source-page and formula-source readers whenever the corpus has formulas. */
export function sourceReadingSample(exams: readonly {problems: readonly Problem[]}[]) {
  return exams.flatMap(exam => exam.problems).find(problem => problemFormulas(problem, 'zh').length > 0)?.id;
}

/** Version-switch QA requires an authentic original, not just any prompt image. */
export function originalFigureSample(exams: readonly {problems: readonly Pick<Problem, 'id' | 'figure' | 'figureOriginal'>[]}[]) {
  return exams.flatMap(exam => exam.problems).find(problem => problem.figure && problem.figureOriginal !== false)?.id;
}
