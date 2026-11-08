import { exams, formulas, documents, papers } from '../content/catalog.server';
import { assetSource } from '../content/papers.server';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { displayEquations } from '../content/text';

function required(path: string) {
  if (!existsSync(path)) throw new Error(`Missing paper resource: ${path}`);
}
for (const paper of papers) for (const locale of ['en','zh'] as const) {
  const directory=paper.directories[locale];
  for (const name of ['generate_figures.py', 'figure-sources.json']) required(resolve(directory, name));
  for (const doc of Object.values(paper.documents[locale])) {
    required(resolve(directory, 'extracted', `${doc.id}.txt`));
    for (let page = 1; page <= doc.pages; page++) required(assetSource(`${doc.pageBase}/${page}.webp`));
  }
  for (const question of paper.exam.problems) {
    const names = [question.figure, ...question.parts.flatMap(part => [part.figure, part.questionFigure?.name])].filter((name): name is string => Boolean(name));
    for (const name of new Set(names)) for (const theme of ['', '-dark']) required(resolve(directory, 'assets/figures', `${name}${theme}.svg`));
    for (const name of [question.figure, ...question.parts.flatMap(part => part.questionFigure ? [part.questionFigure.name] : [])].filter(Boolean)) required(resolve(directory, 'assets/original-figures', `${name}.webp`));
  }
}

// Shared course resources must be complete too, including after replacing the sample course.
for (const doc of Object.values(documents)) {
  for (let page = 1; page <= doc.pages; page++) required(assetSource(`${doc.pageBase}/${page}.webp`));
}
for (const formula of formulas) required(assetSource(`/excerpts/${formula.id}.webp`));

const problems = exams.flatMap(exam => exam.problems);
const parts = problems.flatMap(problem => problem.parts);
console.log(`Content verified from Markdown: ${exams.length} exams / ${problems.length} problems / ${parts.length} parts / ${parts.reduce((sum, part) => sum + displayEquations(part.solution.en).length, 0)} English equation groups / ${formulas.length} formulas / ${Object.keys(documents).length} documents.`);
