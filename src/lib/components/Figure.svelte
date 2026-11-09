<script lang="ts">
  import { RadioGroup } from 'bits-ui';
  import { tabsListVariants, tabsTriggerVariants } from '#lib/components/ui/tabs';
  import { cn } from '#lib/utils';
  import * as Dialog from '#lib/components/ui/dialog';
  import * as Tooltip from '#lib/components/ui/tooltip';
  import { Button,buttonVariants } from '#lib/components/ui/button';
  import Expand from '@lucide/svelte/icons/expand';
  import RichText from './RichText.svelte';
  import { plainText } from '#lib/math';
  import type { Locale, Localized, SourceRef } from '#lib/types';
  let {name,assetBase,locale,dark=false,caption,original,onsource,size,dialogOnly=false,zoom=$bindable(false),detailTitle}: {dialogOnly?:boolean;zoom?:boolean;detailTitle?:string;name:string;assetBase:string;size:[number,number,number];locale:Locale;dark?:boolean;caption?:Localized;original?:{doc:string;page:number;region:[number,number,number,number]};onsource?:(s:SourceRef)=>void}=$props();
  let view=$state('recreated');
  let error=$state(false);
  const aspectRatio=$derived(size[0]/size[1]);
  // Use each SVG's own dimensions and readable label size as a preference,
  // not a minimum: the article always shows the complete diagram at its available width.
  const drawingWidth=$derived(Math.max(size[0],size[2]));
  let retry=$state(0);
  let zoomError=$state(false);
  let fitWidth=$state(false);
  const src=$derived(view==='original' ? `${assetBase}/original-figures/${name}.webp` : `${assetBase}/figures/${name}${dark?'-dark':''}.svg`);
  const captionText=$derived(plainText(caption?.[locale]??(locale==='zh'?'解题图示':'Solution diagram')));
  const sourceLabel=$derived(original?`${locale==='zh'?'在原始试卷中定位':'Locate in the source exam'} · p.${original.page}`:'');
  $effect(()=>{name;view='recreated';});
  $effect(()=>{src;error=false;});
  $effect(()=>{if(zoom){zoomError=false;fitWidth=dialogOnly;}});
</script>
{#if !dialogOnly}
<figure class="study-figure" data-figure={name} style:--figure-width={`${drawingWidth}px`}>
  <div class="figure-toolbar">
    <span class="figure-label">{locale==='zh'?'图示':'FIGURE'}</span>
    <div class="ml-auto flex items-center gap-1">
      {#if original}
        <div class={cn(tabsListVariants(),'figure-version-track h-9')} data-variant="default">
          <RadioGroup.Root class="figure-version flex h-full" orientation="horizontal" bind:value={view} aria-label={locale==='zh'?'图像版本':'Figure version'}>
            <RadioGroup.Item class={tabsTriggerVariants()} data-active={view==='recreated'?true:undefined} value="recreated">{locale==='zh'?'矢量复刻':'Recreated SVG'}</RadioGroup.Item>
            <RadioGroup.Item class={tabsTriggerVariants()} data-active={view==='original'?true:undefined} value="original">{locale==='zh'?'原始插图':'Original'}</RadioGroup.Item>
          </RadioGroup.Root>
          {#if onsource}
            <Tooltip.Root>
              <Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'xs'})} data-figure-source
                aria-label={sourceLabel} aria-haspopup="dialog"
                onclick={event=>{event.currentTarget.focus({preventScroll:true});onsource?.({...original,label:{zh:'原始插图',en:'Original figure'}});}}>p.{original.page}</Tooltip.Trigger>
              <Tooltip.Content>{sourceLabel}</Tooltip.Content>
            </Tooltip.Root>
          {/if}
        </div>
      {/if}
      <Button size="icon-sm" variant="ghost" onclick={()=>{zoomError=false;fitWidth=false;zoom=true;}} disabled={error} aria-label={locale==='zh'?'放大图示':'Enlarge figure'}><Expand aria-hidden="true" /></Button>
    </div>
  </div>
  <div class:original-figure={view==='original'} class="figure-image">
    <div class="figure-canvas" style:aspect-ratio={aspectRatio}>
      {#if error}
        <div class="figure-error" role="alert"><p>{locale==='zh'?'图示加载失败，可重试或查看原卷。':'Figure could not load. Retry or view the source exam.'}</p><Button variant="outline" onclick={()=>{retry++;error=false;}}>{locale==='zh'?'重试图示':'Retry figure'}</Button></div>
      {:else}
        <img src={retry?`${src}?retry=${retry}`:src} width={size[0]} height={size[1]} alt={captionText} onerror={()=>error=true} />
      {/if}
    </div>
  </div>
</figure>
{/if}
<Dialog.Root bind:open={zoom}>
  <Dialog.Content closeLabel={locale==='zh'?'关闭':'Close'} class="figure-dialog" data-overview={dialogOnly} style={`--figure-width:${drawingWidth}px;--figure-aspect:${aspectRatio}`}>
    <Dialog.Header><Dialog.Title>{detailTitle??(locale==='zh'?'图示详情':'Figure detail')}</Dialog.Title><Dialog.Description><RichText text={caption?.[locale]??name}/></Dialog.Description></Dialog.Header>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (The enlarged image must support keyboard scrolling.) -->
    <div class:original-figure={view==='original'} class="figure-enlarged" data-fit-width={fitWidth} role="region" tabindex="0" aria-label={locale==='zh'?'放大图示，方向键滚动':'Enlarged figure; use arrow keys to scroll'}>{#if zoomError}<p role="alert">{locale==='zh'?'图示加载失败，请关闭后重试或查看原卷。':'Figure unavailable. Close and retry, or view the source exam.'}</p>{:else}<img {src} alt={captionText} onerror={()=>zoomError=true}/>{/if}</div>
    <Dialog.Footer class="figure-dialog-actions"><Button variant="outline" aria-pressed={dialogOnly?undefined:fitWidth} onclick={()=>fitWidth=!fitWidth} disabled={zoomError}>{dialogOnly?(fitWidth?(locale==='zh'?'查看细节':'View details'):(locale==='zh'?'适应窗口':'Fit view')):(locale==='zh'?'适应宽度':'Fit width')}</Button><Button variant="secondary" onclick={()=>zoom=false}>{locale==='zh'?'返回解题':'Back to problem'}</Button></Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
