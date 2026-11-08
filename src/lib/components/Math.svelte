<script lang="ts">
  import type { Locale } from '#lib/types';
  import { renderMath } from '#lib/math';
  let {tex, display = false, boxed = false, locale='zh'}: {tex: string; display?: boolean; boxed?: boolean;locale?:Locale} = $props();
  const html = $derived(renderMath(boxed ? `\\boxed{${tex}}` : tex, display));
  let scroller=$state<HTMLSpanElement>();
  let overflowing=$state(false);
  $effect(()=>{
    const node=scroller;
    if(!node)return;
    const measure=()=>overflowing=node.scrollWidth>node.clientWidth+1;
    const observer=new ResizeObserver(measure);observer.observe(node);
    if(node.firstElementChild)observer.observe(node.firstElementChild);
    void document.fonts.ready.then(measure);measure();
    return()=>observer.disconnect();
  });
</script>
{#if display}
  <div class="math-scroll">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Overflowing math is a keyboard scroll region.) -->
    <span bind:this={scroller} class="math-display" data-math={tex} tabindex={overflowing?0:undefined} role="region" aria-label={locale==='zh'?'公式；可用方向键左右滚动':'Equation; scroll horizontally with arrow keys'}>{@html html}</span>
    {#if overflowing}<span class="math-scroll-hint" aria-hidden="true">↔ {locale==='zh'?'左右滚动查看完整公式':'Scroll to read the full equation'}</span>{/if}
  </div>
{:else}<span class="math-inline" data-math={tex}>{@html html}</span>{/if}
