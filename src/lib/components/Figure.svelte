<script lang="ts">
  import { RadioGroup } from 'bits-ui';
  import { tabsListVariants, tabsTriggerVariants } from '#lib/components/ui/tabs';
  import { cn } from '#lib/utils';
  import * as Dialog from '#lib/components/ui/dialog';
  import { Button } from '#lib/components/ui/button';
  import Expand from '@lucide/svelte/icons/expand';
  import FileSearch from '@lucide/svelte/icons/file-search';
  import RichText from './RichText.svelte';
  import { plainText } from '#lib/math';
  import type { Locale, Localized, SourceRef } from '#lib/types';
  let {name,assetBase,locale,dark=false,caption,original,onsource,size}: {name:string;assetBase:string;size:[number,number,number];locale:Locale;dark?:boolean;caption?:Localized;original?:{doc:string;page:number;region:[number,number,number,number]};onsource?:(s:SourceRef)=>void}=$props();
  let view=$state('recreated');
  let zoom=$state(false);
  let error=$state(false);
  const aspectRatio=$derived(size[0]/size[1]);
  const previewWidth=$derived(Math.max(size[2],Math.min(520,aspectRatio*280)));
  let retry=$state(0);
  let zoomError=$state(false);
  let scroller=$state<HTMLDivElement>();
  let overflowX=$state(false);
  let overflowY=$state(false);
  const overflowing=$derived(overflowX||overflowY);
  const scrollHint=$derived(overflowX&&overflowY
    ? (locale==='zh'?'滚动查看完整图示':'Scroll to read the full figure')
    : overflowY
      ? (locale==='zh'?'上下滚动查看完整图示':'Scroll vertically to read the full figure')
      : (locale==='zh'?'左右滚动查看完整图示':'Scroll horizontally to read the full figure'));
  $effect(()=>{
    const node=scroller;
    if(!node)return;
    const measure=()=>{overflowX=node.scrollWidth>node.clientWidth+1;overflowY=node.scrollHeight>node.clientHeight+1;};
    const observer=new ResizeObserver(measure);
    observer.observe(node);
    if(node.firstElementChild)observer.observe(node.firstElementChild);
    measure();
    return()=>observer.disconnect();
  });
  const src=$derived(view==='original' ? `${assetBase}/original-figures/${name}.webp` : `${assetBase}/figures/${name}${dark?'-dark':''}.svg`);
  const captionText=$derived(plainText(caption?.[locale]??(locale==='zh'?'解题图示':'Solution diagram')));
  $effect(()=>{name;view='recreated';});
  $effect(()=>{src;error=false;});
</script>
<figure class="study-figure" data-figure={name}>
  <div class="figure-toolbar">
    <span class="figure-label hidden min-[360px]:inline">{locale==='zh'?'图示':'FIGURE'} <span>↗</span></span>
    <div class="ml-auto flex items-center gap-2">
      {#if original}
        <RadioGroup.Root class={cn(tabsListVariants(),'figure-version h-9')} data-variant="default" orientation="horizontal" bind:value={view} aria-label={locale==='zh'?'图像版本':'Figure version'}>
          <RadioGroup.Item class={tabsTriggerVariants()} data-active={view==='recreated'?true:undefined} value="recreated">{locale==='zh'?'矢量复刻':'Recreated SVG'}</RadioGroup.Item>
          <RadioGroup.Item class={tabsTriggerVariants()} data-active={view==='original'?true:undefined} value="original">{locale==='zh'?'原始插图':'Original'}</RadioGroup.Item>
        </RadioGroup.Root>
      {/if}
      <Button size="icon-sm" variant="ghost" onclick={()=>{zoomError=false;zoom=true;}} disabled={error} aria-label={locale==='zh'?'放大图示':'Enlarge figure'}><Expand aria-hidden="true" /></Button>
    </div>
  </div>
  <div class="figure-scroll-shell">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The figure region supports keyboard scrolling.) -->
  <div bind:this={scroller} tabindex={overflowing?0:undefined} role="region" aria-label={locale==='zh'?'图示，可用方向键滚动':'Figure; use arrow keys to scroll'} class:original-figure={view==='original'} class="figure-image">
    <div class="figure-canvas measured" style:aspect-ratio={aspectRatio} style:min-width={`${size[2]}px`} style:max-width={`${previewWidth}px`}>
      {#if error}<p>{locale==='zh'?'图示加载失败，可重试或查看原卷。':'Figure could not load. Retry or view the source exam.'}</p><Button variant="outline" onclick={()=>{retry++;error=false;}}>{locale==='zh'?'重试图示':'Retry figure'}</Button>{:else}<img src={retry?`${src}?retry=${retry}`:src} width={size[0]} height={size[1]} alt={captionText} onerror={()=>error=true} />{/if}
    </div>
  </div>
  {#if overflowing}<p class="figure-scroll-hint" aria-hidden="true">{overflowX&&overflowY?'↔↕':overflowY?'↕':'↔'} {scrollHint}</p>{/if}
  </div>
  {#if original&&onsource}
    <div class="figure-source">
      <Button size="xs" variant="ghost" onclick={()=>onsource?.({...original,label:{zh:'原始插图',en:'Original figure'}})}><FileSearch data-icon="inline-start" aria-hidden="true" />{locale==='zh'?'在原始试卷中定位':'Locate in the source exam'} · p.{original.page}</Button>
    </div>
  {/if}
</figure>
<Dialog.Root bind:open={zoom}>
  <Dialog.Content closeLabel={locale==='zh'?'关闭':'Close'} class="figure-dialog sm:max-w-5xl">
    <Dialog.Header><Dialog.Title>{locale==='zh'?'图示详情':'Figure detail'}</Dialog.Title><Dialog.Description><RichText text={caption?.[locale]??name}/></Dialog.Description></Dialog.Header>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (The enlarged image must support keyboard scrolling.) -->
    <div class:original-figure={view==='original'} class="figure-enlarged" role="region" tabindex="0" aria-label={locale==='zh'?'放大图示，方向键滚动':'Enlarged figure; use arrow keys to scroll'}>{#if zoomError}<p role="alert">{locale==='zh'?'图示加载失败，请关闭后重试或查看原卷。':'Figure unavailable. Close and retry, or view the source exam.'}</p>{:else}<img {src} alt={captionText} style:min-width={`${Math.max(700,size[2])}px`} onerror={()=>zoomError=true}/>{/if}</div>
    <Dialog.Footer><Button variant="secondary" onclick={()=>zoom=false}>{locale==='zh'?'返回解题':'Back to problem'}</Button></Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
