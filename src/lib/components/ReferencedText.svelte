<script lang="ts">
  import { parseText, formulaReference, hasFormulaReference, mathClosingPunctuation, type TextNode } from '../../../content/text';
  import FormulaLink from './FormulaLink.svelte';
  import RichText from './RichText.svelte';
  import { formulaById } from '#lib/catalog';
  import type { Locale, SourceDocument, SourceRef } from '#lib/types';

  let {text,locale,documents,onsource}: {
    text:string; locale:Locale; documents:Record<string,SourceDocument>; onsource:(source:SourceRef)=>void;
  } = $props();
  const tree = $derived(parseText(text));
  const source = (node:TextNode) => text.slice(node.position?.start.offset, node.position?.end.offset);
</script>

{#snippet renderChildren(nodes:TextNode[])}
  {#each nodes as child,index}
    {@const punctuation=mathClosingPunctuation(child,nodes[index+1],text)}
    {@const preceding=index>0?mathClosingPunctuation(nodes[index-1],child,text):''}
    {#if punctuation}<span class="math-with-punctuation">{@render render(child)}{punctuation}</span>
    {:else if preceding&&child.type==='text'}{@render render({...child,value:child.value.slice(preceding.length)})}
    {:else}{@render render(child)}{/if}
  {/each}
{/snippet}

{#snippet render(node:TextNode)}
  {@const id = formulaReference(node)}
  {#if node.type === 'text'}
    {#each node.value.split('\n') as line,i}{#if i}<br/>{/if}{line}{/each}
  {:else if id && formulaById[id]}
    <FormulaLink formula={formulaById[id]} {locale} {documents} {onsource} inline>
      {#if 'children' in node}{@render renderChildren(node.children)}{/if}
    </FormulaLink>
  {:else if !hasFormulaReference(node)}
    <RichText text={source(node)}/>
  {:else if node.type === 'emphasis'}
    <em>{@render renderChildren(node.children)}</em>
  {:else if node.type === 'strong' || node.type === 'heading'}
    <strong>{@render renderChildren(node.children)}</strong>
  {:else if node.type === 'list'}
    <span class="markdown-list" role="list">{#each node.children as item,i}<span class="markdown-list-item" role="listitem"><span aria-hidden="true">{node.ordered ? `${(node.start ?? 1) + i}.` : '•'}</span><span>{@render render(item)}</span></span>{/each}</span>
  {:else if node.type === 'blockquote'}
    <span class="markdown-quote">{#each node.children as child,i}{#if i}<br/><br/>{/if}{@render render(child)}{/each}</span>
  {:else if 'children' in node}
    {@render renderChildren(node.children)}
  {/if}
{/snippet}

<span class="rich-text">{#each tree.children as node,i}{#if i}<br/><br/>{/if}{@render render(node)}{/each}</span>
