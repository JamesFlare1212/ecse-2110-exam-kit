<script lang="ts">
  import { Button } from '#lib/components/ui/button';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import type { Locale, SourceDocument } from '#lib/types';
  let {doc,page,locale,alt,onopen}: {doc:SourceDocument;page:number;locale:Locale;alt:string;onopen:()=>void}=$props();
  let failed=$state(false);
  let retry=$state(0);
  const size=$derived(doc.sizes[page-1]);
  const label=$derived(locale==='zh'?`放大查看第 ${page} 页`:`Inspect page ${page}`);
  $effect(()=>{doc;page;failed=false;retry=0;});
</script>

<div class="original-page-card">
  <div><strong>PDF · {locale==='zh'?`第 ${page} 页`:`Page ${page}`}</strong><Button variant="outline" size="sm" aria-label={label} onclick={onopen}>{locale==='zh'?'放大查看':'Inspect page'}<ArrowUpRight data-icon="inline-end" aria-hidden="true"/></Button></div>
  <div class="original-page-image" style:aspect-ratio={`${size[0]} / ${size[1]}`}>
    {#if failed}
      <div class="source-page-failed" role="alert"><p>{locale==='zh'?'原卷页图加载失败，可重试或打开 PDF。':'Page image unavailable. Retry or open the PDF.'}</p><Button variant="outline" onclick={()=>{retry++;failed=false;}}>{locale==='zh'?'重试页图':'Retry page image'}</Button><Button href={`${doc.pdf}#page=${page}`} target="_blank" rel="noopener noreferrer">{locale==='zh'?'打开 PDF':'Open PDF'}</Button></div>
    {:else}
      <button class="source-page-preview" onclick={onopen} aria-label={label}><img src={`${doc.pageBase}/${page}.webp${retry?'?retry='+retry:''}`} width={size[0]} height={size[1]} {alt} loading="lazy" onerror={()=>failed=true}/></button>
    {/if}
  </div>
</div>
