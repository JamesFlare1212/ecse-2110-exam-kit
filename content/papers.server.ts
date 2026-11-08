import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseContent } from './schema.ts';
import { formulaSheetFor, parseCourseConfig, validateCourseDocuments } from './course.ts';
import { createExamIndex } from './navigation.ts';
import { readQuestionMarkdown, type MarkdownQuestion } from './markdown.ts';
import { CONTENT_LOCALES, joinTranslations } from './localization.ts';
import { formulaReferences } from './text';
import type { Exam, ExamInfo, Formula, InOneLanguage, Locale, Localized, SourceDocument } from './types.ts';

// u00 is reserved for a source whose academic year is genuinely unknown.
export const PAPER_NAME = /^(?:exam|practice)[1-9]\d*_(?:[fs]\d{2}|u00)$/;
export interface Paper {
  name: string;
  directory: string;
  directories: Record<Locale, string>;
  assetBase: Localized;
  exam: Exam;
  documents: Record<Locale, Record<string, SourceDocument>>;
}
function readJson<T>(path: string): T {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`Cannot read ${path}`, { cause: error }); }
}

/** Discover complete paper folders; no source list or generated registry. */
export function loadContent(directory = resolve('content'), articles?: readonly MarkdownQuestion[]) {
  const course = parseCourseConfig(readJson(resolve(directory, 'course.json')));
  const shared = readJson<Record<string, SourceDocument>>(resolve(directory, 'documents.json'));
  const documentsByLocale = { en: { ...shared }, zh: { ...shared } };
  const formulas = readJson<Formula[]>(resolve(directory, 'formulas.json'));
  const names = new Set(Object.values(CONTENT_LOCALES).flatMap(locale =>
    readdirSync(resolve(directory, locale), { withFileTypes: true }).filter(entry => entry.isDirectory() && PAPER_NAME.test(entry.name)).map(entry => entry.name)));
  const papers: Paper[] = [...names].map(name => {
      const directories = { en: resolve(directory, 'en', name), zh: resolve(directory, 'zh-cn', name) };
      const localized = Object.fromEntries((Object.keys(CONTENT_LOCALES) as Locale[]).map(locale => {
        const folder = directories[locale];
        const info = readJson<InOneLanguage<ExamInfo>>(resolve(folder, 'paper.json'));
        if (Object.hasOwn(info, 'problems')) throw new Error(`${folder}/paper.json: author questions in questions/*.md`);
        const questions = resolve(folder, 'questions');
        const resources = readJson<import('./markdown').QuestionResources>(resolve(folder, 'figure-sources.json'));
        const problems = readdirSync(questions, { withFileTypes: true }).filter(file => file.isFile() && file.name.endsWith('.md')).map(file => {
          const path = resolve(questions, file.name);
          const problem = articles ? articles.find(article => resolve(article.filePath) === path)?.problem
            : readQuestionMarkdown(readFileSync(path, 'utf8'), path, resources);
          if (!problem) throw new Error(`${path}: missing from the Astro questions collection`);
          if (file.name !== `q${problem.number}.md`) throw new Error(`${path}: filename must match question number q${problem.number}.md`);
          return problem;
        }).sort((a, b) => a.number - b.number);
        return [locale, { ...info, problems }];
      })) as Record<Locale, InOneLanguage<Exam>>;
      const exam = joinTranslations<Exam>(localized.en, localized.zh, name);
      const match = /^([ep])([1-9]\d*)-([fs]\d{2}|u00)$/.exec(exam.id);
      if (!match || name !== `${match[1] === 'p' ? 'practice' : 'exam'}${match[2]}_${match[3]}` || exam.number !== Number(match[2])
        || (exam.kind === 'practice') !== (match[1] === 'p')
        || (match[3] === 'u00' ? exam.year !== null : exam.year === null || exam.year % 100 !== Number(match[3].slice(1)))) {
        throw new Error(`${name}/paper.json: exam ID and number must match the paper folder`);
      }
      const assetBase = { en: `/papers/en/${name}`, zh: `/papers/zh-cn/${name}` };
      const owned = { en: {}, zh: {} } as Paper['documents'];
      for (const locale of Object.keys(CONTENT_LOCALES) as Locale[]) {
        const folder = directories[locale], documents = documentsByLocale[locale];
        const local = readJson<Record<string, SourceDocument>>(resolve(folder, 'documents.json'));
        for (const [id, doc] of Object.entries(local)) {
          if (Object.hasOwn(documents, id)) throw new Error(`${folder}: duplicate document ${id}`);
          if (!/^sources\/[a-z0-9-]+\.pdf$/.test(doc.pdf) || !/^pages\/[a-z0-9-]+$/.test(doc.pageBase)) {
            throw new Error(`${folder}/documents.json: use relative sources/*.pdf and pages/* asset paths`);
          }
          owned[locale][id] = { ...doc, pdf: `${assetBase[locale]}/${doc.pdf}`, pageBase: `${assetBase[locale]}/${doc.pageBase}` };
          documents[id] = owned[locale][id];
        }
        if (!Object.hasOwn(owned[locale], exam.doc) || !Object.hasOwn(owned[locale], exam.solutionDoc))
          throw new Error(`${folder}: the paper must own its exam and solution PDFs`);
        if (!existsSync(resolve(folder, 'assets'))) throw new Error(`${folder}: missing assets directory`);
      }
      return { name, directory: directories.en, directories, assetBase, exam, documents: owned };
    });
  papers.sort((a, b) => a.exam.number - b.exam.number
    || Number(b.exam.kind === 'practice') - Number(a.exam.kind === 'practice')
    || (a.exam.year ?? 0) - (b.exam.year ?? 0)
    || Number(a.exam.id.includes('-f')) - Number(b.exam.id.includes('-f')) || a.name.localeCompare(b.name));
  const checked = parseContent(papers.map(paper => paper.exam), formulas, documentsByLocale.en);
  parseContent(checked.exams, formulas, documentsByLocale.zh);
  for (const documents of Object.values(documentsByLocale)) validateCourseDocuments(course, documents);
  if (course.resources.formulaSheets) {
    const sheetIds = new Set(Object.values(course.resources.formulaSheets));
    for (const formula of formulas) if (!sheetIds.has(formula.source.doc))
      throw new Error(`Formula ${formula.id}: source is not a configured exam reference sheet`);
    for (const exam of checked.exams) for (const question of exam.problems) for (const part of question.parts) {
      for (const locale of ['en', 'zh'] as const) for (const id of formulaReferences(part.solution[locale])) {
        if (formulas.find(formula => formula.id === id)?.source.doc !== formulaSheetFor(exam.number, course))
          throw new Error(`${part.id}: formula ${id} is not on this exam's reference sheet`);
      }
    }
  }
  return { ...checked, course, documentsByLocale, papers, examIndex: createExamIndex(checked.exams) };
}

/** Resolve public asset URLs to canonical source files without staging. */
export function assetSource(path: string, directory = resolve('content')) {
  if (!path.startsWith('/') || path.includes('\\') || path.split('/').some(part => part === '..' || part === '.')) {
    throw new Error(`Invalid local asset path: ${path}`);
  }
  if (path.startsWith('/papers/')) {
    const [, , locale, name, ...parts] = path.split('/');
    if (!Object.values(CONTENT_LOCALES).includes(locale as 'en' | 'zh-cn') || !PAPER_NAME.test(name) || !parts.length) throw new Error(`Invalid paper asset path: ${path}`);
    return resolve(directory, locale, name, 'assets', ...parts);
  }
  return resolve(directory, '../static', path.slice(1));
}

/** Copy only public assets. Markdown, JSON, extracted text and Python remain private. */
export function stagePaperAssets(papers: Paper[], destination = resolve('static/papers')) {
  // Preserve unchanged files so watching the public directory does not turn a
  // prose edit into hundreds of asset changes and browser reloads.
  function sync(source: string, target: string) {
    mkdirSync(target, { recursive: true });
    const entries = readdirSync(source, { withFileTypes: true });
    for (const name of readdirSync(target)) if (!entries.some(entry => entry.name === name))
      rmSync(resolve(target, name), { recursive: true, force: true });
    for (const entry of entries) {
      const from = resolve(source, entry.name), to = resolve(target, entry.name);
      if (entry.isDirectory()) sync(from, to);
      else if (!existsSync(to) || !readFileSync(from).equals(readFileSync(to))) copyFileSync(from, to);
    }
  }
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(destination)) {
    if (!Object.values(CONTENT_LOCALES).includes(entry as 'en' | 'zh-cn')) rmSync(resolve(destination, entry), { recursive: true, force: true });
  }
  for (const [locale, folder] of Object.entries(CONTENT_LOCALES) as [Locale, string][]) {
    const localized = resolve(destination, folder);
    mkdirSync(localized, { recursive: true });
    for (const entry of readdirSync(localized)) if (!papers.some(paper => paper.name === entry)) rmSync(resolve(localized, entry), { recursive: true, force: true });
    for (const paper of papers) {
      const target = resolve(localized, paper.name);
      sync(resolve(paper.directories[locale], 'assets'), target);
    }
  }
}
