<script lang="ts">
  import { Button } from '#lib/components/ui/button';
  import type { SourceDocument, SourceRef, Locale } from '#lib/types';
  let {stage,paper,doc,page,source,locale,onpage}: {
    stage:HTMLDivElement|undefined;
    paper:HTMLDivElement|undefined;
    doc:SourceDocument;
    page:number;
    source:SourceRef;
    locale:Locale;
    onpage:(page:number)=>void;
  }=$props();
  let thumbnails=$state<HTMLOListElement>();
  let viewport=$state({left:0,top:0,width:1,height:1});
  const region=$derived(page===source.page?source.region:undefined);

  // Only scroll the thumbnail rail, leaving the main PDF and dialog in place.
  $effect(()=>{
    const list=thumbnails, selector='#source-thumbnail-'+doc.id+'-'+page;
    if(!list)return;
    const revealCurrentPage=()=>{
      const active=list.querySelector<HTMLElement>(selector);
      if(!active||!list.clientHeight)return;
      const frame=list.getBoundingClientRect(), item=active.getBoundingClientRect();
      list.scrollTop+=item.top-frame.top-3;
    };
    const observer=new ResizeObserver(revealCurrentPage);
    observer.observe(list);
    revealCurrentPage();
    return()=>observer.disconnect();
  });

  function updateViewport(){
    if(!stage||!paper)return;
    const frame=stage.getBoundingClientRect(), sheet=paper.getBoundingClientRect();
    if(!sheet.width||!sheet.height)return;
    const left=Math.max(0,Math.min(1,(frame.left-sheet.left)/sheet.width));
    const top=Math.max(0,Math.min(1,(frame.top-sheet.top)/sheet.height));
    viewport={left,top,width:Math.min(1-left,stage.clientWidth/sheet.width),height:Math.min(1-top,stage.clientHeight/sheet.height)};
  }
  $effect(()=>{
    const scroller=stage, sheet=paper;
    if(!scroller||!sheet)return;
    const observer=new ResizeObserver(updateViewport);
    observer.observe(scroller);observer.observe(sheet);
    scroller.addEventListener('scroll',updateViewport,{passive:true});
    updateViewport();
    return()=>{observer.disconnect();scroller.removeEventListener('scroll',updateViewport);};
  });
  function locate(event:MouseEvent){
    if(!stage||!paper)return;
    const map=(event.currentTarget as HTMLElement).getBoundingClientRect();
    const frame=stage.getBoundingClientRect(), sheet=paper.getBoundingClientRect();
    const x=event.detail===0?0.5:Math.max(0,Math.min(1,(event.clientX-map.left)/map.width));
    const y=event.detail===0?(region?region[1]+region[3]/2:0.5):Math.max(0,Math.min(1,(event.clientY-map.top)/map.height));
    stage.scrollLeft+=sheet.left-frame.left+x*sheet.width-stage.clientWidth/2;
    stage.scrollTop+=sheet.top-frame.top+y*sheet.height-stage.clientHeight/2;
    updateViewport();
  }
  function selectPage(event:MouseEvent,number:number){
    if(number===page)locate(event);
    else onpage(number);
  }
  function mapKey(event:KeyboardEvent){
    if(!stage)return;
    const y=Math.max(80,stage.clientHeight/2), x=Math.max(80,stage.clientWidth/2);
    if(event.key==='ArrowDown')stage.scrollTop+=y;
    else if(event.key==='ArrowUp')stage.scrollTop-=y;
    else if(event.key==='ArrowRight')stage.scrollLeft+=x;
    else if(event.key==='ArrowLeft')stage.scrollLeft-=x;
    else if(event.key==='Home')stage.scrollTop=0;
    else if(event.key==='End')stage.scrollTop=stage.scrollHeight;
    else return;
    event.preventDefault();updateViewport();
  }
</script>

<aside class="source-overview" aria-label={locale==='zh'?'页面概览':'Page overview'}>
  <div class="source-overview-heading"><strong>{locale==='zh'?'页面概览':'Page overview'}</strong><span aria-live="polite">p.{page} / {doc.pages}</span></div>
  <ol class="source-thumbnail-list" bind:this={thumbnails}>
    {#each doc.sizes as size,index (doc.id+'-'+index)}
      {@const number=index+1}
      {@const active=number===page}
      {@const citation=number===source.page?source.region:undefined}
      <li id={'source-thumbnail-'+doc.id+'-'+number} class="source-thumbnail" data-thumbnail-page={number} data-current={active?'true':undefined}>
        <Button variant="outline" class="source-page-map" style={'aspect-ratio:'+size[0]+' / '+size[1]} tabindex={active?0:-1} onclick={(event)=>selectPage(event,number)} onkeydown={(event)=>{if(active)mapKey(event);}} aria-current={active?'page':undefined} aria-label={locale==='zh'?'第 '+number+' 页'+(active?'，当前页，点击定位，方向键滚动原页':'，点击切页'):'Page '+number+(active?', current page: click to locate or use arrow keys to scroll':': click to open')}>
          <img src={doc.pageBase+'/'+number+'.webp'} alt="" aria-hidden="true" draggable="false" loading="lazy" decoding="async"/>
          {#if citation}<span class="source-highlight source-map-highlight" data-source-map-highlight style:left={citation[0]*100+'%'} style:top={citation[1]*100+'%'} style:width={citation[2]*100+'%'} style:height={citation[3]*100+'%'}></span>{/if}
          {#if active}<span class="source-map-viewport" data-source-map-viewport style:left={viewport.left*100+'%'} style:top={viewport.top*100+'%'} style:width={viewport.width*100+'%'} style:height={viewport.height*100+'%'}></span>{/if}
        </Button>
        <div class="source-thumbnail-caption" aria-hidden="true"><span>{number}</span>{#if active}<span>{locale==='zh'?'当前页':'Current'}</span>{/if}</div>
      </li>
    {/each}
  </ol>
  <p class="source-map-hint">{locale==='zh'?'点击缩略图切页':'Click a thumbnail to open a page'}</p>
  <div class="source-map-legend"><span class="viewport-key"></span>{locale==='zh'?'当前视野':'Current view'}{#if source.region}<span class="citation-key"></span>{locale==='zh'?'引用位置':'Citation'}{/if}</div>
</aside>
