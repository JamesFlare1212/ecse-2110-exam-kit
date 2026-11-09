<script lang="ts">
  import {onDestroy,type Snippet} from 'svelte';
  import * as HoverCard from '#lib/components/ui/hover-card';
  import {Button} from '#lib/components/ui/button';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import {course,sourceName} from '../../../content/course';
  import type {PageReference} from '../../../content/text';
  import {useFormulaPreviews} from '#lib/formula-preview.svelte';
  import type {Locale,SourceDocument,SourceRef} from '#lib/types';
  let {reference,locale,documents,onsource,children}:{reference:PageReference;locale:Locale;documents:Record<string,SourceDocument>;onsource:(s:SourceRef)=>void;children:Snippet}=$props();
  const previews=useFormulaPreviews(),previewId=Symbol();
  const open=$derived(previews.active===previewId);
  const document=$derived(documents[reference.doc]);
  const href=$derived(`${document.pageBase}/${reference.page}.webp`);
  let trigger=$state<HTMLAnchorElement|null>(null);
  onDestroy(()=>previews.setOpen(previewId,false));
  function showSource(){trigger?.focus({preventScroll:true});previews.active=null;onsource({...reference,label:{zh:'文中资料引用',en:'Source cited in the text'}});}
</script>
<HoverCard.Root bind:open={()=>open,value=>previews.setOpen(previewId,value)} openDelay={180} closeDelay={160}>
  <HoverCard.Trigger bind:ref={trigger} {href} class="formula-link formula-link-inline page-source-link" data-page-source-link={reference.doc} data-source-page={reference.page} onclick={event=>{event.preventDefault();showSource();}}>{@render children()}</HoverCard.Trigger>
  <HoverCard.Content collisionPadding={12} hidden={!open} class="w-80 max-w-[calc(100vw-2rem)]">
    <div class="excerpt-heading"><strong>{sourceName(reference.doc,documents,course,locale)}</strong><span>PDF · {locale==='zh'?`第 ${reference.page} 页`:`Page ${reference.page}`}</span></div>
    <div class="original-excerpt"><img src={href} alt={`${document.title} · p.${reference.page}`} loading="lazy"/></div>
    <p class="excerpt-description">{locale==='zh'?'原始资料页':'Original source page'}</p>
    <Button size="sm" variant="secondary" onclick={showSource}><ArrowUpRight data-icon="inline-start" aria-hidden="true"/>{locale==='zh'?'打开原页':'Open original page'}</Button>
  </HoverCard.Content>
</HoverCard.Root>
