import { parseDocument } from 'yaml';
import { parseText, formulaReferences, displayEquations } from './text';
import { questionMetadataSchema } from './metadata';
import type { InOneLanguage, OriginalFigure, Part, Problem, Region } from './types';

export type ArticlePart = Omit<InOneLanguage<Part>, 'note'> & { note?: string };
export type ArticleProblem = Omit<InOneLanguage<Problem>, 'parts' | 'note'> & { parts: ArticlePart[]; note?: string };
export interface MarkdownQuestion { filePath: string; problem: ArticleProblem }
export interface QuestionResources { figures: Record<string, OriginalFigure> }
interface Section { name: string; depth: number; line: number; start: number; bodyStart: number; end: number; children: Section[] }

/** The frontmatter is metadata; all authored prose and calculations remain ordinary Markdown. */
export function readQuestionMarkdown(source: string, file = 'question.md', resources?: QuestionResources): ArticleProblem {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`${file}: expected YAML frontmatter delimited by ---`);
  const document = parseDocument(match[1], { uniqueKeys: true });
  if (document.errors.length) throw new Error(`${file}: ${document.errors.map(error => error.message).join('; ')}`);
  return parseQuestionBody(document.toJS({ maxAliasCount: 0 }), source.slice(match[0].length), file, resources);
}

export function parseQuestionBody(rawMetadata: unknown, body: string, file = 'question.md', resources?: QuestionResources): ArticleProblem {
  const checked = questionMetadataSchema.safeParse(rawMetadata);
  if (!checked.success) throw new Error(`${file}: invalid frontmatter: ${checked.error.message}`);
  const metadata = checked.data;
  const root: Section = { name: 'article', depth: 1, line: 1, start: 0, bodyStart: 0, end: body.length, children: [] };
  const stack = [root];
  function fail(section: Section, message: string): never { throw new Error(`${file}:${section.line} (${section.name}): ${message}`); }
  for (const node of parseText(body).children) {
    if (node.type !== 'heading') continue;
    if (node.depth === 1) fail(root, 'use level 2 headings for Question, Guide and Part');
    while (stack.length > 1 && stack.at(-1)!.depth >= node.depth) stack.pop()!.end = node.position!.start.offset!;
    const parent = stack.at(-1)!;
    const name = node.children.map(child => child.type === 'text' ? child.value : '').join('');
    const section: Section = { name, depth: node.depth, line: node.position!.start.line,
      start: node.position!.start.offset!, bodyStart: node.position!.end.offset!, end: body.length, children: [] };
    if (parent.children.some(child => child.name === name)) fail(section, 'duplicate section');
    parent.children.push(section); stack.push(section);
  }
  const raw = (section: Section) => body.slice(section.bodyStart, section.end).trim();
  const prose = (section: Section) => body.slice(section.bodyStart, section.children[0]?.start ?? section.end).trim();
  function child(section: Section, name: string) {
    const value = section.children.find(child => child.name === name);
    if (!value) fail(section, `missing section ${name}`);
    return value;
  }
  function nonempty(section: Section, value = raw(section)) {
    if (!value) fail(section, 'expected nonempty content');
    return value;
  }
  function figureSource(name: string): OriginalFigure {
    const source = resources?.figures[name];
    if (!source) fail(root, `missing figure source ${name} in figure-sources.json`);
    const [x, y, width, height] = source.region;
    return { doc: source.doc, page: source.page, region: [Math.max(0,x-.002), Math.max(0,y-.002), width+.004, height+.004]
      .map(value => Number(value.toFixed(4))) as Region };
  }
  for (const section of root.children) if (section.depth !== 2 || !['Question', 'Guide', 'Source correction'].includes(section.name) && !/^Part .+/.test(section.name))
    fail(section, 'unknown section');
  if (prose(root)) fail(root, 'place the original statement under Question');
  const figure = metadata.figure === null ? undefined : metadata.figure ?? metadata.id;
  // A source rectangle still locates the printed prompt when it has no diagram.
  const originalFigure = figureSource(figure ?? metadata.id);
  const sections = root.children.filter(section => /^Part .+/.test(section.name));
  if (!sections.length) fail(root, 'expected at least one Part');
  for (const label of Object.keys(metadata.parts)) if (!sections.some(section => section.name === `Part ${label}`))
    fail(root, `part metadata ${label} has no corresponding Part heading`);
  const parts: ArticlePart[] = sections.map(section => {
    const label = section.name.slice('Part '.length);
    const attributes = metadata.parts[label] ?? {};
    for (const child of section.children) if (child.depth !== 3 || !['Solution', 'Source correction'].includes(child.name)) fail(child, 'unknown section');
    const prompt = nonempty(section, prose(section));
    const solutionSection = child(section, 'Solution');
    const solution = nonempty(solutionSection);
    const equations = displayEquations(solution);
    if (!equations.length) fail(solutionSection, 'expected a displayed governing formula');
    if (equations.slice(0, -1).some(tex => /\\boxed\s*\{/.test(tex)))
      fail(solutionSection, 'boxed results belong only in the final displayed calculation');
    const finalEquation = parseText(solution).children.findLast(node => node.type === 'math');
    if (finalEquation?.type !== 'math' || !/\\boxed\s*\{/.test(finalEquation.value))
      fail(solutionSection, 'put the final result in a displayed boxed formula');
    try { formulaReferences(solution); } catch (error) { fail(solutionSection, String(error)); }
    const sourcePage = attributes.page ?? originalFigure.page;
    const questionFigure = attributes.questionFigure;
    const name = typeof questionFigure === 'string' ? questionFigure : questionFigure?.name;
    return {
      id: attributes.id ?? `${metadata.id}-${label.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
      label, points: attributes.points ?? 0, sourcePage, solutionPage: attributes.solutionPage ?? sourcePage,
      prompt, solution,
      ...(attributes.figure ? { figure: attributes.figure, figureCaption: attributes.figureCaption ?? prompt } : {}),
      ...(name ? { questionFigure: { name, source: figureSource(name), caption: typeof questionFigure === 'object' ? questionFigure.caption ?? prompt : prompt } } : {}),
      ...(section.children.some(child => child.name === 'Source correction') ? { note: nonempty(child(section, 'Source correction')) } : {}),
    };
  });
  return {
    id: metadata.id, number: Number(/-q(\d+)$/.exec(metadata.id)![1]), wording: 'original',
    title: metadata.title, topic: metadata.topic, points: metadata.points, givens: metadata.givens,
    ...(figure ? { figure, figureCaption: metadata.figureCaption ?? metadata.title } : {}), originalFigure,
    ...(metadata.figureAtParts ? { figureAtParts: true } : {}), lectures: metadata.lectures,
    statement: nonempty(child(root, 'Question')), guide: nonempty(child(root, 'Guide')), parts,
    ...(root.children.some(section => section.name === 'Source correction') ? { note: nonempty(child(root, 'Source correction')) } : {}),
  };
}
