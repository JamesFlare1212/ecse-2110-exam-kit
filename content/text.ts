import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import type { Root, RootContent, PhrasingContent, ListItem } from 'mdast';
import type { SourceDocument } from './types';

export type TextNode = Root | RootContent | PhrasingContent | ListItem;
export const parseText = (source: string) => fromMarkdown(source, {
  extensions: [math()], mdastExtensions: [mathFromMarkdown()],
});

export function displayEquations(source: string): string[] {
  const equations: string[] = [];
  function visit(node: TextNode) {
    if (node.type === 'math') equations.push(node.value);
    if ('children' in node) node.children.forEach(visit);
  }
  visit(parseText(source));
  return equations;
}

export function formulaReference(node: TextNode): string | undefined {
  return node.type === 'link' ? /^formula:([a-z0-9-]+)$/.exec(node.url)?.[1] : undefined;
}

export function hasFormulaReference(node: TextNode): boolean {
  return Boolean(formulaReference(node)) || ('children' in node && node.children.some(hasFormulaReference));
}

export type PageReference = {doc:string;page:number};
type PageDocuments = Record<string,Pick<SourceDocument,'pageBase'|'pages'>>;

/** Ordinary local page-image links remain useful without JavaScript. */
export function pageReference(node:TextNode,documents:PageDocuments):PageReference|undefined {
  if(node.type!=='link'||!/^\/(?:pages\/|papers\/[^/]+\/[^/]+\/pages\/)/.test(node.url))return undefined;
  const entry=Object.entries(documents).find(([,doc])=>node.url.startsWith(doc.pageBase+'/'));
  if(!entry)throw new Error(`unknown source page ${node.url}`);
  const [id,doc]=entry,match=/^([1-9]\d*)\.webp$/.exec(node.url.slice(doc.pageBase.length+1));
  const page=match?Number(match[1]):NaN;
  if(!Number.isSafeInteger(page)||page>doc.pages)throw new Error(`invalid source page ${node.url}`);
  return{doc:id,page};
}
export function hasPageReference(node:TextNode,documents:PageDocuments):boolean {
  return Boolean(pageReference(node,documents))||('children'in node&&node.children.some(child=>hasPageReference(child,documents)));
}
export function pageReferences(text:string,documents:PageDocuments):PageReference[] {
  const refs=new Map<string,PageReference>();
  function visit(node:TextNode){const ref=pageReference(node,documents);if(ref)refs.set(`${ref.doc}:${ref.page}`,ref);if('children'in node)node.children.forEach(visit);}
  visit(parseText(text));return[...refs.values()];
}

/** A solution figure occupies one ordinary standalone Markdown image paragraph.
 * Its ID must match the owning part.figure; it is never a fetched image URL.
 */
export function solutionFigure(node: TextNode): string | undefined {
  if (node.type !== 'paragraph' || node.children.length !== 1) return undefined;
  const image = node.children[0];
  return image.type === 'image' ? /^figure:([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(image.url)?.[1] : undefined;
}

export function solutionFigures(source: string): string[] {
  const root = parseText(source);
  const anchors = root.children.filter(node => solutionFigure(node));
  const images = new Set<TextNode>();
  for (const node of anchors) if (node.type === 'paragraph') node.children.forEach(image => images.add(image));
  function visit(node: TextNode) {
    if (node.type === 'image' && /^figure:/i.test(node.url) && !images.has(node))
      throw new Error('figure: references must be valid IDs in standalone solution paragraphs');
    if ('children' in node) node.children.forEach(visit);
  }
  visit(root);
  const ids = anchors.map(node => solutionFigure(node)!);
  if (new Set(ids).size !== ids.length) throw new Error('a figure: reference may only be placed once in its solution');
  return ids;
}

/** Group closing prose punctuation with inline math without changing authored TeX or text. */
export function mathClosingPunctuation(node: TextNode, next: TextNode | undefined, source: string): string {
  if (node.type !== 'inlineMath' || source.slice(node.position?.start.offset ?? 0).startsWith('$$') || next?.type !== 'text') return '';
  return next.value.match(/^[,.;:!?，。；：！？、）］】》〉」』”’]+/u)?.[0] ?? '';
}

/** Read typed references from actual links, never code or mathematical text. */
export function formulaReferences(text: string): string[] {
  const ids = new Set<string>();
  function visit(node: TextNode) {
    if (node.type === 'link' && node.url.startsWith('formula:')) {
      const id = formulaReference(node);
      if (!id) throw new Error('expected a formula:formula-id link');
      ids.add(id);
    }
    if ('children' in node) node.children.forEach(visit);
  }
  visit(parseText(text));
  return [...ids];
}
