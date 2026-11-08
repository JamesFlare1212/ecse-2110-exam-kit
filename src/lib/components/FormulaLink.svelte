<script lang="ts">
  import { onDestroy } from 'svelte';
  import { sourceName } from '../../../content/course';
  import type { Snippet } from 'svelte';
  import * as HoverCard from '#lib/components/ui/hover-card';
  import { Button } from '#lib/components/ui/button';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Math from './Math.svelte';
  import { useFormulaPreviews } from '#lib/formula-preview.svelte';
  import { cn } from '#lib/utils';
  import type { Formula, Locale, SourceRef, SourceDocument } from '#lib/types';
  let {formula,locale,documents,onsource,compact = false,inline = false,children}: {formula: Formula; locale: Locale; documents:Record<string,SourceDocument>; onsource:(s:SourceRef)=>void; compact?:boolean; inline?:boolean; children?:Snippet} = $props();
  const previews = useFormulaPreviews();
  const previewId = Symbol();
  const open = $derived(previews.active === previewId);
  onDestroy(() => previews.setOpen(previewId, false));
  let trigger = $state<HTMLAnchorElement|null>(null);
  function showSource() {
    trigger?.focus({preventScroll:true});
    previews.active = null;
    onsource(formula.source);
  }
</script>
<HoverCard.Root bind:open={() => open, (value) => previews.setOpen(previewId, value)} openDelay={180} closeDelay={160}>
  <HoverCard.Trigger bind:ref={trigger} href={`${documents[formula.source.doc].pdf}#page=${formula.source.page}`} class={cn('formula-link',inline && 'formula-link-inline')} onclick={(e) => {e.preventDefault(); showSource();}} aria-label={`${formula.title[locale]} · ${formula.source.label[locale]}`}>
    {#if inline}
      {#if children}{@render children()}{:else}{formula.title[locale]}{/if}
    {:else}
      <BookOpen aria-hidden="true" />
      <span>{formula.title[locale]}</span>
      {#if !compact}<span class="reference-page">p.{formula.source.page}</span>{/if}
    {/if}
  </HoverCard.Trigger><HoverCard.Content collisionPadding={12} hidden={!open} class="w-80 max-w-[calc(100vw-2rem)]">
    <div class="excerpt-heading"><strong>{formula.title[locale]}</strong><span>{sourceName(formula.source.doc,documents).toUpperCase()} / {formula.source.page}</span></div>
    <div class="excerpt-equation"><Math {locale} tex={formula.math} display /></div>
    <div class="original-excerpt"><img src={`/excerpts/${formula.id}.webp`} alt={formula.source.label[locale]} loading="lazy" /></div>
    <p class="excerpt-description">{locale === 'zh' ? '来自原始 PDF 的公式区域' : 'Excerpt from the original PDF'}</p>
    <Button size="sm" variant="secondary" onclick={showSource}><ArrowUpRight data-icon="inline-start" aria-hidden="true" />{locale === 'zh' ? '打开原页并定位' : 'Locate on original page'}</Button>
  </HoverCard.Content>
</HoverCard.Root>
