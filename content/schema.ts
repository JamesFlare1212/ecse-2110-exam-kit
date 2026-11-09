import katex from 'katex';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import type { Exam, Formula, SourceDocument } from './types.ts';
import { formulaReferences, displayEquations, solutionFigures, pageReferences } from './text';

type Rule = (value: unknown, path: string) => void;
function fail(path: string, message: string): never {
  throw new Error(`Invalid content at ${path}: ${message}`);
}
const text: Rule = (value, path) => {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected nonempty text');
  if (/[\u0000-\u0008\u000b-\u001f]/.test(value)) fail(path, 'contains a control character; check TeX escapes');
  if (/\\u[\da-f]{4}/i.test(value)) fail(path, 'contains a literal Unicode escape; write the actual character');
};
const natural: Rule = (value, path) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) fail(path, 'expected a nonnegative integer');
};
const positive: Rule = (value, path) => {
  natural(value, path);
  if (value === 0) fail(path, 'expected a positive integer');
};
const boolean: Rule = (value, path) => { if (typeof value !== 'boolean') fail(path, 'expected a boolean'); };
const array = (rule: Rule, minimum = 0): Rule => (value, path) => {
  if (!Array.isArray(value) || value.length < minimum) fail(path, `expected an array with at least ${minimum} entries`);
  value.forEach((item, index) => rule(item, `${path}[${index}]`));
};
const object = (required: Record<string, Rule>, optional: Record<string, Rule> = {}): Rule => (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected an object');
  const record = value as Record<string, unknown>;
  for (const [key, rule] of Object.entries(required)) rule(record[key], `${path}.${key}`);
  for (const [key, entry] of Object.entries(record)) {
    if (Object.hasOwn(optional, key)) optional[key](entry, `${path}.${key}`);
    else if (!Object.hasOwn(required, key)) fail(`${path}.${key}`, 'unknown field');
  }
};
const tex: Rule = (value, path) => {
  text(value, path);
  try { katex.renderToString(value as string, { throwOnError: true, strict: 'ignore', trust: false }); }
  catch (error) { fail(path, `invalid TeX: ${error instanceof Error ? error.message : String(error)}`); }
};
const richText: Rule = (value, path) => {
  text(value, path);
  const runs: string[] = [];
  interface Node { type: string; value?: string; children?: Node[] }
  function visit(node: Node) {
    if (node.type === 'math' || node.type === 'inlineMath') { tex(node.value, path); return; }
    if (node.type === 'code' || node.type === 'inlineCode') return;
    if (node.value) runs.push(node.value);
    node.children?.forEach(visit);
  }
  visit(fromMarkdown(value as string, { extensions: [math()], mdastExtensions: [mathFromMarkdown()] }));
  const prose = runs.join(' ');
  if (prose.includes('$')) fail(path, 'unmatched math delimiter');
  if (/[α-ωΑ-Ωℓ₀-₉ₙᵢ⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺′∝≤≥∫×−≈̂≪=<>°%]|\bJ\b/u.test(prose)) {
    fail(path, 'mathematical symbols must use KaTeX delimiters');
  }
};
const localized = object({ zh: richText, en: richText });
const optionalLocalized: Rule = (value, path) => {
  object({}, { zh: richText, en: richText })(value, path);
  if (!Object.keys(value as object).length) fail(path, 'expected at least one language');
};
const region: Rule = (value, path) => {
  if (!Array.isArray(value) || value.length !== 4 || value.some(n => typeof n !== 'number' || !Number.isFinite(n))) fail(path, 'expected [x, y, width, height]');
  const [x, y, width, height] = value as number[];
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) fail(path, 'rectangle must fit inside the PDF page');
};
const originalFigure = object({ doc: text, page: positive, region });
const source = object({ doc: text, page: positive, label: localized }, { region });
const part = object({
  id: text, label: text, points: natural, prompt: localized, solution: localized,
  sourcePage: positive, solutionPage: positive,
}, {
  note: optionalLocalized, figure: text, figureCaption: localized,
  interaction: (value,path)=>{
    const asset:Rule=(entry,where)=>{if(typeof entry!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry))fail(where,'expected a safe paper-local interaction asset name');};
    const kind=(value as {kind?:string})?.kind;
    if(kind==='semi-converter'){object({kind:text,asset})(value,path);return;}
    if(kind!=='full-converter')fail(path,'unknown interaction kind');
    object({kind:text,asset,profile:(entry,where)=>{if(!['reversed-emf','ideal-drive','ripple-drive'].includes(entry as string))fail(where,'unknown full-converter profile');}},{rippleAsset:asset})(value,path);
    const full=value as {profile:string;rippleAsset?:string};
    if((full.profile==='ripple-drive')!==Boolean(full.rippleAsset))fail(path,'only the ripple profile requires a representative-current asset');
  },
  questionFigure: object({ name: text, source: originalFigure, caption: localized }),
});
const problem = object({
  wording: (value, path) => { if (value !== 'original') fail(path, 'must preserve original exam wording'); },
  id: text, number: positive, title: localized, topic: localized, statement: localized,
  givens: array(tex), points: natural,
  originalFigure, lectures: array(source, 1),
  guide: localized,
  parts: array(part, 1),
}, { figure: text, figureCaption: localized, figureAtParts: boolean,
  figureOriginal: (value,path) => { if (value !== false) fail(path, 'only false is allowed; omit for an authentic original'); },
  note: optionalLocalized });
const exam = object({
  id: text, number: positive, term: localized,
  year: (value, path) => { if (value !== null) positive(value, path); }, points: natural,
  doc: text, solutionDoc: text, questionsOnly: boolean, problems: array(problem, 1),
}, { kind: (value, path) => { if (value !== 'exam' && value !== 'practice') fail(path, 'expected exam or practice'); } });
const formula = object({ id: text, title: localized, math: tex, source }, { note: localized });
const dimensions: Rule = (value, path) => {
  if (!Array.isArray(value) || value.length !== 2 || value.some(n => typeof n !== 'number' || !Number.isFinite(n) || n <= 0)) fail(path, 'expected positive PDF page dimensions');
};
const document = object({
  id: text, title: text, kind: text, pages: positive, pdf: text, pageBase: text,
  sizes: array(dimensions, 1), original: text,
  sha256: (value, path) => { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(path, 'expected SHA-256 provenance'); },
});

/** Validate authored content in memory, without rewriting Markdown or generating JSON. */
export function parseContent(rawExams: unknown, rawFormulas: unknown, rawDocuments: unknown) {
  array(exam, 1)(rawExams, 'exams');
  array(formula)(rawFormulas, 'formulas');
  if (!rawDocuments || typeof rawDocuments !== 'object' || Array.isArray(rawDocuments)) fail('documents', 'expected a document registry');
  for (const [id, entry] of Object.entries(rawDocuments)) document(entry, `documents.${id}`);
  const exams = rawExams as Exam[];
  const formulas = rawFormulas as Formula[];
  const documents = rawDocuments as Record<string, SourceDocument>;
  const ids = new Set<string>();
  function unique(id: string, path: string) {
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id)) fail(path, `invalid or duplicate ID ${id}`);
    ids.add(id);
  }
  function page(doc: string, number: number, path: string) {
    if (!documents[doc]) fail(path, `unknown document ${doc}`);
    if (number > documents[doc].pages) fail(path, `PDF page ${number} exceeds ${doc}'s ${documents[doc].pages} pages`);
  }
  for (const [id, doc] of Object.entries(documents)) {
    if (id !== doc.id) fail(`documents.${id}.id`, 'must match its registry key');
    if (doc.sizes.length !== doc.pages) fail(`documents.${id}.sizes`, 'must describe every PDF page');
    if (!/^\/(?:papers\/(?:en|zh-cn)\/(?:exam|practice)[1-9]\d*_(?:[fs]\d{2}|u00)\/)?sources\//.test(doc.pdf)
      || !/^\/(?:papers\/(?:en|zh-cn)\/(?:exam|practice)[1-9]\d*_(?:[fs]\d{2}|u00)\/)?pages\//.test(doc.pageBase)) fail(`documents.${id}`, 'source assets must use local language-scoped paths');
  }
  const formulaIds = new Set<string>();
  for (const f of formulas) {
    unique(f.id, `formulas.${f.id}`); formulaIds.add(f.id);
    page(f.source.doc, f.source.page, `formulas.${f.id}.source`);
  }
  for (const e of exams) {
    unique(e.id, `exams.${e.id}`);
    page(e.doc, 1, `${e.id}.doc`); page(e.solutionDoc, 1, `${e.id}.solutionDoc`);
    if (e.problems.reduce((sum, q) => sum + q.points, 0) !== e.points) fail(`${e.id}.points`, 'must equal the total problem points');
    for (const q of e.problems) {
      unique(q.id, `${e.id}.problems`);
      if (q.id !== `${e.id}-q${q.number}`) fail(q.id, 'must match its exam ID and problem number');
      if (q.figure && !q.figureCaption) fail(`${q.id}.figureCaption`, 'question figures need bilingual captions');
      if (q.figureOriginal === false) {
        if (!q.figure) fail(`${q.id}.figureOriginal`, 'requires a question figure');
        if (!q.note?.en || !q.note?.zh) fail(`${q.id}.note`, 'a matched question figure requires source-correction provenance in both languages');
      }
      for (const ref of [q.originalFigure, ...q.lectures]) page(ref.doc, ref.page, `${q.id}.sources`);
      for (const locale of ['en', 'zh'] as const) for (const [field, body] of Object.entries({statement: q.statement[locale], guide: q.guide[locale], note: q.note?.[locale]})) {
        if(body)try{pageReferences(body,documents);}catch(error){fail(`${q.id}.${field}.${locale}`,String(error));}
        if (body && solutionFigures(body).length) fail(`${q.id}.${field}.${locale}`, 'figure: placements belong only in Solution');
      }
      for (const p of q.parts) {
        unique(p.id, `${q.id}.parts`);
        if (!p.id.startsWith(`${q.id}-`)) fail(p.id, 'must belong to its problem');
        page(e.doc, p.sourcePage, `${p.id}.sourcePage`); page(e.solutionDoc, p.solutionPage, `${p.id}.solutionPage`);
        if (p.questionFigure) page(p.questionFigure.source.doc, p.questionFigure.source.page, `${p.id}.questionFigure`);
        if (p.figure && !p.figureCaption) fail(`${p.id}.figureCaption`, 'solution figures need bilingual captions');
        if (p.interaction && !p.figure) fail(`${p.id}.interaction`, 'requires a complete static solution figure');
        for (const locale of ['en','zh'] as const) {
          for (const [field, body] of Object.entries({prompt: p.prompt[locale], note: p.note?.[locale]}))
            if (body && solutionFigures(body).length) fail(`${p.id}.${field}.${locale}`, 'figure: placements belong only in Solution');
          const equations = displayEquations(p.solution[locale]);
          if (!/\\boxed\s*\{/.test(equations.at(-1) ?? ''))
            fail(`${p.id}.solution.${locale}`, 'expected a displayed boxed result');
          if (equations.slice(0, -1).some(tex => /\\boxed\s*\{/.test(tex)))
            fail(`${p.id}.solution.${locale}`, 'boxed results belong only in the final displayed calculation');
          let refs: string[];
          try {
            for(const body of [p.solution[locale],p.prompt[locale],p.note?.[locale]])if(body)pageReferences(body,documents);
            refs = formulaReferences(p.solution[locale]);
            const placed = solutionFigures(p.solution[locale]);
            if (placed.length && (placed.length !== 1 || placed[0] !== p.figure))
              fail(`${p.id}.solution.${locale}`, 'figure: placement must match the owning part figure');
          } catch (error) { fail(`${p.id}.solution.${locale}`, String(error)); }
          for (const ref of refs) if (!formulaIds.has(ref)) fail(`${p.id}.solution.${locale}`, `unknown formula ${ref}`);
        }
      }
    }
  }
  return { exams, formulas, documents };
}
