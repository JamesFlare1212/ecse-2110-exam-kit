<script lang="ts">
  import Figure from './Figure.svelte';
  import {Button} from '#lib/components/ui/button';
  import type Converter from './Converter.svelte';
  import type {Locale,Localized,Part} from '#lib/types';
  let {name,assetBase,locale,dark,size,caption,interaction,active=false}:{name:string;assetBase:string;locale:Locale;dark:boolean;size:[number,number,number];caption?:Localized;interaction?:Part['interaction'];active?:boolean}=$props();
  let Diagram=$state<typeof Converter|undefined>(),failed=$state(false),retry=$state(0);
  $effect(()=>{
    retry;
    if(!active||!interaction||Diagram)return;
    let cancelled=false;failed=false;
    void import('./Converter.svelte').then(module=>{if(!cancelled)Diagram=module.default;}).catch(()=>{if(!cancelled)failed=true;});
    return()=>{cancelled=true;};
  });
</script>
{#snippet staticFigure()}<Figure {assetBase} {size} {name} {locale} {dark} {caption}/>{/snippet}
{#if Diagram&&interaction}
  <Diagram kind={interaction.kind} asset={interaction.asset} defaultSignals={interaction.defaultSignals} profile={interaction.kind==='full-converter'?interaction.profile:undefined} rippleAsset={interaction.kind==='full-converter'?interaction.rippleAsset:undefined} {assetBase} {locale} {dark} {active} staticFigure={{name,size,caption}} fallback={staticFigure}/>
{:else}
  {#if failed}<p role="status">{locale==='zh'?'交互图暂不可用，完整静态图仍可阅读。':'The interactive diagram is unavailable; the full static diagram remains readable.'} <Button size="sm" variant="outline" onclick={()=>retry++}>{locale==='zh'?'重试交互图':'Retry interactive diagram'}</Button></p>{/if}
  {@render staticFigure()}
{/if}
