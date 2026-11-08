import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import type { Root, RootContent, PhrasingContent, ListItem } from 'mdast';

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
