<script lang="ts">
  import { parseText, solutionFigure } from '../../../content/text';
  import type { Snippet } from 'svelte';
  import Math from './Math.svelte';
  import ReferencedText from './ReferencedText.svelte';
  import type { Locale, SourceDocument, SourceRef } from '#lib/types';
  let {body,partId,locale,documents,onsource,figureName,illustration}: {
    body:string;partId:string;locale:Locale;documents:Record<string,SourceDocument>;onsource:(source:SourceRef)=>void;
    figureName?:string;illustration?:Snippet;
  }=$props();
  const nodes=$derived(parseText(body).children);
  const conclusion=$derived(nodes.findLastIndex(node=>node.type==='math'));
  const hasPlacedFigure=$derived(nodes.some(node=>solutionFigure(node)===figureName&&figureName));
</script>

<div class="solution-body">
  {#each nodes as node,i}
    {#if figureName&&solutionFigure(node)===figureName}
      {@render illustration?.()}
    {:else if node.type==='math'}
      <div class="derivation-equations" data-answer={i===conclusion?partId:undefined}><Math {locale} tex={node.value} display/></div>
    {:else if node.type==='paragraph'}
      <p class="solution-annotation" data-authored-annotation><ReferencedText text={body.slice(node.position!.start.offset,node.position!.end.offset)} {locale} {documents} {onsource}/></p>
    {:else}
      <div class="solution-annotation" data-authored-annotation><ReferencedText text={body.slice(node.position!.start.offset,node.position!.end.offset)} {locale} {documents} {onsource}/></div>
    {/if}
  {/each}
  {#if figureName&&!hasPlacedFigure}{@render illustration?.()}{/if}
</div>
