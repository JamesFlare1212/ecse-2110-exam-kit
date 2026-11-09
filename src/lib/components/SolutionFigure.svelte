<script lang="ts">
  import Figure from './Figure.svelte';
  import {Button} from '#lib/components/ui/button';
  import type SemiConverter from './SemiConverter.svelte';
  import type {Locale,Localized,Part} from '#lib/types';
  let {name,assetBase,locale,dark,size,caption,interaction,active=false}:{name:string;assetBase:string;locale:Locale;dark:boolean;size:[number,number,number];caption?:Localized;interaction?:Part['interaction'];active?:boolean}=$props();
  let Diagram=$state<typeof SemiConverter|undefined>(),failed=$state(false),retry=$state(0);
  $effect(()=>{
    retry;
    if(!active||interaction?.kind!=='semi-converter'||Diagram)return;
    let cancelled=false;failed=false;
    void import('./SemiConverter.svelte').then(module=>{if(!cancelled)Diagram=module.default;}).catch(()=>{if(!cancelled)failed=true;});
    return()=>{cancelled=true;};
  });
</script>
{#snippet staticFigure()}<Figure {assetBase} {size} {name} {locale} {dark} {caption}/>{/snippet}
{#if Diagram&&interaction}
  <Diagram asset={interaction.asset} {assetBase} {locale} {dark} {active} staticFigure={{name,size,caption}} fallback={staticFigure}/>
{:else}
  {#if failed}<p role="status">{locale==='zh'?'交互图暂不可用，完整静态图仍可阅读。':'The interactive diagram is unavailable; the full static diagram remains readable.'} <Button size="sm" variant="outline" onclick={()=>retry++}>{locale==='zh'?'重试交互图':'Retry interactive diagram'}</Button></p>{/if}
  {@render staticFigure()}
{/if}
