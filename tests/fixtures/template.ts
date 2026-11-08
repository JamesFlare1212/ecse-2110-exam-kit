import {cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import type {SourceDocument} from '../../content/types';

export const project = resolve(import.meta.dir, '../..');
export const templates = resolve(project, 'templates');
export const readTemplate = (name: string) => readFileSync(resolve(templates, name), 'utf8');
// Synthetic metadata for parser fixtures only; the build smoke test replaces it with its generated PDFs' hashes.
export const fixtureDocument = (id: string, kind: string): SourceDocument => ({
  id, title: `Synthetic ${id}`, kind, pages: 1, pdf: `sources/${id}.pdf`, pageBase: `pages/${id}`,
  sizes: [[612, 792]], original: `${id}.pdf`, sha256: '0'.repeat(64),
});
export function templateFixture(withFormulas = true) {
  const root = mkdtempSync(resolve(tmpdir(), 'fieldnotes-template-'));
  cpSync(resolve(templates, 'course.json'), resolve(root, 'course.json'));
  writeFileSync(resolve(root, 'formulas.json'), withFormulas ? readTemplate('formulas.json') : '[]');
  const notes = fixtureDocument('course-notes', 'lecture');
  writeFileSync(resolve(root, 'documents.json'), JSON.stringify({[notes.id]: {...notes, pdf: '/sources/course-notes.pdf', pageBase: '/pages/course-notes'}}));
  for (const locale of ['en', 'zh-cn']) {
    const folder = resolve(root, locale, 'exam1_f00');
    mkdirSync(resolve(folder, 'assets'), {recursive: true});
    mkdirSync(resolve(folder, 'questions'));
    cpSync(resolve(templates, `paper.${locale}.json`), resolve(folder, 'paper.json'));
    cpSync(resolve(templates, 'figure-sources.json'), resolve(folder, 'figure-sources.json'));
    writeFileSync(resolve(folder, 'questions/q1.md'), withFormulas ? readTemplate(`question.${locale}.md`)
      : readTemplate(`question.${locale}.md`).replace(/\[([^\]]+)\]\(formula:[^)]+\)/g, '$1'));
    writeFileSync(resolve(folder, 'documents.json'), JSON.stringify({
      'e1-f00': fixtureDocument('e1-f00', 'exam'), 'e1-f00-sol': fixtureDocument('e1-f00-sol', 'solution'),
    }));
  }
  return root;
}
