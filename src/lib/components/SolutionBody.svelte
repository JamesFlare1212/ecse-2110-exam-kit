<script lang="ts">
  import { parseText } from '../../../content/text';
  import Math from './Math.svelte';
  import ReferencedText from './ReferencedText.svelte';
  import type { Locale, SourceDocument, SourceRef } from '#lib/types';
  let {body,partId,locale,documents,onsource}: {
    body:string;partId:string;locale:Locale;documents:Record<string,SourceDocument>;onsource:(source:SourceRef)=>void;
  }=$props();
  const nodes=$derived(parseText(body).children);
  const conclusion=$derived(nodes.findLastIndex(node=>node.type==='math'));
</script>

<div class="solution-body">
  {#each nodes as node,i}
    {#if node.type==='math'}
      <div class="derivation-equations" data-answer={i===conclusion?partId:undefined}><Math {locale} tex={node.value} display/></div>
    {:else if node.type==='paragraph'}
      <p class="solution-annotation" data-authored-annotation><ReferencedText text={body.slice(node.position!.start.offset,node.position!.end.offset)} {locale} {documents} {onsource}/></p>
    {:else}
      <div class="solution-annotation" data-authored-annotation><ReferencedText text={body.slice(node.position!.start.offset,node.position!.end.offset)} {locale} {documents} {onsource}/></div>
    {/if}
  {/each}
</div>
