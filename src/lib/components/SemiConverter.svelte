<script lang="ts">
  import {onMount,untrack,type Snippet} from 'svelte';
  import {Button,buttonVariants} from '#lib/components/ui/button';
  import {Slider} from '#lib/components/ui/slider';
  import {RadioGroup} from 'bits-ui';
  import {tabsListVariants,tabsTriggerVariants} from '#lib/components/ui/tabs';
  import {cn} from '#lib/utils';
  import * as Field from '#lib/components/ui/field';
  import * as Alert from '#lib/components/ui/alert';
  import * as Tooltip from '#lib/components/ui/tooltip';
  import * as Popover from '#lib/components/ui/popover';
  import Play from '@lucide/svelte/icons/play';
  import Pause from '@lucide/svelte/icons/pause';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Expand from '@lucide/svelte/icons/expand';
  import Info from '@lucide/svelte/icons/info';
  import Figure from './Figure.svelte';
  import {CONDUCTION_INTERVALS,WAVE_KEYS,atCycleAngle} from '#lib/visualizations/semi-converter-model.mjs';
  import {parseConductionGeometry,pointOnRoute,validateConductionSprite,type ConductionGeometry,type RouteKey} from '#lib/visualizations/conduction-geometry';
  import {semiConverterCopy} from '#lib/visualizations/semi-converter-copy';
  import type {Locale,Localized} from '#lib/types';

  let {asset,assetBase,locale,dark,active=false,staticFigure,fallback}:{asset:string;assetBase:string;locale:Locale;dark:boolean;active?:boolean;staticFigure:{name:string;size:[number,number,number];caption?:Localized};fallback:Snippet}=$props();
  const id=$props.id();
  const copy=$derived(semiConverterCopy[locale]);
  const base=$derived(`${assetBase}/figures/${asset}`);
  const sprite=$derived(`${base}${dark?'-dark':''}.svg`);
  let root:HTMLDivElement;
  let mounted=$state(false),geometry=$state<ConductionGeometry|null>(null),loaded=$state(''),failed=$state(false),retry=$state(0);
  let theta=$state(0),playing=$state(false),reduced=$state(false),staticOpen=$state(false),helpOpen=$state(false),particlePhase=$state(0);
  let chartWidth=$state(640);
  let frame:number|undefined,lastTime:number|undefined;
  const values=$derived(atCycleAngle(theta));
  const sliderAngle=$derived(Math.round(theta*10)/10);
  const complete=$derived(theta===360);
  const interval=$derived(CONDUCTION_INTERVALS[values.index]);
  const stateCopy=$derived(copy.stages[values.index]);
  const ready=$derived(mounted&&geometry!==null&&loaded===sprite);
  const phaseLabel=$derived(`${theta.toFixed(1)}°`);
  const playLabel=$derived(playing?copy.pause:complete?copy.restart:reduced?copy.jump:copy.play);
  const width=$derived(Math.max(240,chartWidth)),left=68;
  const right=$derived(width-48);
  const cursor=$derived(left+(right-left)*theta/360);
  const samples=[...Array.from({length:721},(_,i)=>i*.5),29.999999,179.999999,209.999999,359.999999].sort((a,b)=>a-b);
  type WaveKey=Exclude<keyof ReturnType<typeof atCycleAngle>,'phase'|'index'>;
  const rows=$derived(WAVE_KEYS.map((name,index)=>{
    const key=name as WaveKey,cy=22+index*32;
    return {key,cy,trace:samples.map((angle,i)=>`${i?'L':'M'}${(left+(right-left)*angle/360).toFixed(3)},${(cy-atCycleAngle(angle)[key]*11).toFixed(3)}`).join(' ')};
  }));
  const markers=$derived(geometry?[0,1,2].map(i=>pointOnRoute(geometry!.routes[interval.route as RouteKey],particlePhase+i/3)):[]);
  const format=(n:number)=>Math.abs(n)<.0005?'0':`${n>0?'+':''}${n.toFixed(2)}`;

  function pause(){if(frame!==undefined)cancelAnimationFrame(frame);frame=undefined;lastTime=undefined;playing=false;}
  function seek(angle:number){pause();theta=Math.max(0,Math.min(360,angle));}
  // Keep native input precision independent of unquantized animation time.
  function scrub(angle:number){if(playing&&angle===sliderAngle)return;seek(angle);}
  function previous(){if(theta>=360){seek(210);return;}seek(theta>interval.start?interval.start:CONDUCTION_INTERVALS[Math.max(0,values.index-1)].start);}
  function animate(now:number){
    if(!playing)return;
    if(lastTime!==undefined){const dt=Math.min((now-lastTime)/1000,.08);theta=Math.min(360,theta+dt*30);particlePhase=(particlePhase+dt*.25)%1;}
    lastTime=now;
    if(complete){pause();return;}
    frame=requestAnimationFrame(animate);
  }
  function inView(){const r=root.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  function play(){
    if(playing){pause();return;}
    if(!ready||!active||staticOpen||!inView())return;
    helpOpen=false;
    if(complete){theta=0;if(reduced)return;}
    if(reduced){seek(360);return;}
    playing=true;lastTime=undefined;frame=requestAnimationFrame(animate);
  }
  $effect(()=>{locale;dark;pause();});
  $effect(()=>{if(!active||staticOpen||helpOpen)pause();});
  $effect(()=>{
    const target=sprite,geometryURL=`${base}.json`;retry;
    if(!mounted||!active||untrack(()=>loaded===target&&geometry!==null))return;
    const controller=new AbortController();let cancelled=false;
    failed=false;
    void Promise.all([fetch(geometryURL,{signal:controller.signal}),fetch(target,{signal:controller.signal})])
      .then(async([data,image])=>{if(!data.ok||!image.ok)throw new Error('Interaction asset unavailable');const parsed=parseConductionGeometry(await data.json());validateConductionSprite(await image.text(),parsed);return parsed;})
      .then(data=>{if(!cancelled){geometry=data;loaded=target;failed=false;}})
      .catch(()=>{if(!cancelled)failed=true;});
    return()=>{cancelled=true;controller.abort();};
  });
  onMount(()=>{
    mounted=true;
    const media=matchMedia('(prefers-reduced-motion: reduce)');reduced=media.matches;
    const motion=()=>{reduced=media.matches;pause();};
    const visibility=()=>{if(document.hidden)pause();};
    const modalFocus=(event:FocusEvent)=>{if(event.target instanceof Element&&event.target.closest('[role="dialog"],[role="alertdialog"]'))pause();};
    const observer=new IntersectionObserver(()=>{if(!inView())pause();});observer.observe(root);
    media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);document.addEventListener('focusin',modalFocus);window.addEventListener('pagehide',pause);
    return()=>{pause();observer.disconnect();media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('focusin',modalFocus);window.removeEventListener('pagehide',pause);};
  });
</script>

<div bind:this={root} class="solution-interaction" data-interaction="semi-converter" data-playing={playing} data-ready={ready} data-angle={theta.toFixed(2)} lang={locale==='zh'?'zh-CN':'en'}>
  {#if ready&&geometry}
    <section class="conduction-visualization" aria-labelledby={`${id}-title`}>
      <header class="conduction-heading">
        <div class="conduction-heading-title"><h4 id={`${id}-title`}>{copy.compactTitle}</h4><span class="conduction-meta">α = 30°</span></div>
        <div class="conduction-actions">
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'sm'})} data-static-diagram aria-label={copy.showStatic} aria-haspopup="dialog" onclick={()=>{pause();staticOpen=true;}}><Expand data-icon="inline-start" aria-hidden="true"/>{copy.fullPlot}</Tooltip.Trigger><Tooltip.Content>{copy.showStatic}</Tooltip.Content></Tooltip.Root>
          <Popover.Root bind:open={helpOpen}>
            <Popover.Trigger class={buttonVariants({variant:'ghost',size:'icon-sm'})} data-conduction-help aria-label={copy.help}><Info aria-hidden="true"/></Popover.Trigger>
            <Popover.Content align="end" class="conduction-help-popover w-80 max-w-[calc(100vw-32px)]" style="max-height:min(calc(var(--bits-popover-content-available-height,100dvh) - 8px),calc(100dvh - 24px));overflow:hidden;">
              <Popover.Header class="shrink-0"><Popover.Title>{copy.help}</Popover.Title><Popover.Description>{copy.phaseHelp}</Popover.Description></Popover.Header>
              <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scrolling of the bounded help region.) -->
              <div class="conduction-help-body" role="region" tabindex="0" aria-label={copy.help}>
                <h5>{copy.stageHeading} · {copy.pairs[values.index]}</h5><p>{stateCopy.explanation}</p><p>{stateCopy.path}</p><p>{complete?copy.endRelation:stateCopy.relation}</p>
                <p>{copy.history}</p><p>{copy.reverseNote}</p><p>{copy.assumptions}</p>
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
      </header>
      <RadioGroup.Root orientation="horizontal" value={String(values.index)} onValueChange={v=>seek(CONDUCTION_INTERVALS[Number(v)].start)} aria-label={copy.choose} class={cn(tabsListVariants(),'conduction-stages')}>
        {#each CONDUCTION_INTERVALS as item,i}
          <RadioGroup.Item value={String(i)} data-active={values.index===i?true:undefined} class={cn(tabsTriggerVariants(),'h-auto min-w-0 flex-col gap-0.5 px-1 py-1.5')} aria-label={`${copy.stages[i].short}, ${item.start}°–${item.end}°`} onclick={()=>{if(values.index===i)seek(item.start);}}><span class="conduction-stage-label">{copy.stageLabels[i]}</span><span class="conduction-interval">{item.start}–{item.end}°</span></RadioGroup.Item>
        {/each}
      </RadioGroup.Root>
      <div class="conduction-transport">
        <div class="conduction-controls">
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'icon-sm'})} disabled={theta<=0} aria-label={copy.previous} onclick={previous}><ArrowLeft aria-hidden="true"/></Tooltip.Trigger><Tooltip.Content>{copy.previous}</Tooltip.Content></Tooltip.Root>
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({size:'icon-sm'})} aria-label={playLabel} aria-pressed={playing} disabled={!active||staticOpen} onclick={play}>{#if playing}<Pause aria-hidden="true"/>{:else}<Play aria-hidden="true"/>{/if}</Tooltip.Trigger><Tooltip.Content>{playLabel}</Tooltip.Content></Tooltip.Root>
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'icon-sm'})} disabled={theta>=360} aria-label={copy.next} onclick={()=>seek(interval.end)}><ArrowRight aria-hidden="true"/></Tooltip.Trigger><Tooltip.Content>{copy.next}</Tooltip.Content></Tooltip.Root>
        </div>
        <Field.Field class="conduction-phase">
          <Field.Label for={`${id}-angle`} class="sr-only">{copy.angle} θ = ωt</Field.Label>
          <Slider type="single" id={`${id}-angle`} min={0} max={360} step={.1} value={sliderAngle} onValueChange={scrub} onpointerdowncapture={pause} onkeydowncapture={pause} thumbLabel={copy.angle} thumbValueText={`${phaseLabel}; ${complete?copy.completed:stateCopy.title}; ${copy.pairs[values.index]}`} thumbDescriptionId={`${id}-help`} class="min-h-8"/>
          <div class="conduction-boundaries" aria-hidden="true">{#each [0,30,180,210,360] as angle}<span style={`left:${angle/360*100}%`} data-boundary={angle} data-trigger={angle===30||angle===210?true:undefined}>{angle}°</span>{/each}</div>
        </Field.Field>
        <output for={`${id}-angle`} class="conduction-angle">θ = {phaseLabel}</output>
      </div>
      <p id={`${id}-help`} class="sr-only">{copy.phaseHelp}</p>
      <div class="conduction-state" aria-live="polite" aria-atomic="true"><strong>{copy.pairs[values.index]}</strong><p>{complete?copy.completed:copy.compactStates[values.index]}</p></div>
      <div class="conduction-panels">
        <div class="conduction-circuit-panel">
          <svg class="conduction-circuit" viewBox={geometry.viewBox.join(' ')} role="img" aria-label={`${copy.diagram}; ${copy.pairs[values.index]}`}>
            {#each geometry.parts as part(part.id)}<use href={`${sprite}#${part.id}`} color={part.label?(interval.active.includes(part.key)?'var(--foreground)':'var(--muted-foreground)'):(interval.active.includes(part.key)?'var(--formula)':'var(--muted-foreground)')} opacity={part.label||interval.active.includes(part.key)?1:.8} data-component={part.key} data-conducting={interval.active.includes(part.key)}/>{/each}
            {#if playing&&!reduced}{#each markers as [x,y],i(i)}<circle class="conduction-carrier" cx={x} cy={y} r="3.7" aria-hidden="true"/>{/each}{/if}
          </svg>
          <dl class="conduction-values"><div><dt><span class="sr-only">{copy.loadCurrent} </span>i₀ / I₀</dt><dd>{format(values.i0)}</dd></div><div><dt><span class="sr-only">{copy.sourceCurrent} </span>i / I₀</dt><dd>{format(values.i)}</dd></div><div><dt><span class="sr-only">{copy.loadVoltage} </span>v₀ / Vₘ</dt><dd>{format(values.v0)}</dd></div></dl>
        </div>
        <div class="conduction-wave-panel" bind:clientWidth={chartWidth}>
          <div class="conduction-wave-heading"><h5>{copy.waves}</h5><span class="conduction-key"><span class="key-history" aria-hidden="true"></span>{copy.elapsed}<span class="key-future" aria-hidden="true"></span>{copy.future}</span></div>
          <svg class="conduction-waves" viewBox={`0 0 ${width} 320`} role="img" aria-label={`${copy.waveAlt}; θ = ${phaseLabel}`}>
            <defs><clipPath id={`${id}-history`}><rect x={left} y="0" width={Math.max(0,cursor-left)} height="300"/></clipPath></defs>
            {#each [30,210] as angle}<line x1={left+(right-left)*angle/360} x2={left+(right-left)*angle/360} y1="4" y2="298" class="wave-trigger"/>{/each}
            {#each [0,180,360] as angle}<line x1={left+(right-left)*angle/360} x2={left+(right-left)*angle/360} y1="4" y2="298" class="wave-axis"/>{/each}
            {#each rows as row(row.key)}
              <line x1={left} x2={right} y1={row.cy} y2={row.cy} class="wave-axis"/>
              <text x={left-8} y={row.cy+4} text-anchor="end" class="wave-row-label">{row.key[0]}{#if row.key.length>1}<tspan baseline-shift="sub" font-size="10">{row.key.slice(1)}</tspan>{/if} / {row.key[0]==='v'?'V':'I'}<tspan baseline-shift="sub" font-size="10">{row.key[0]==='v'?'m':'0'}</tspan></text>
              <path d={row.trace} class="wave-reference"/><path d={row.trace} class="wave-trace" clip-path={`url(#${id}-history)`}/>
              <circle cx={cursor} cy={row.cy-values[row.key]*11} r="3.2" class="wave-dot"/>
              <text x={width-1} y={row.cy+4} text-anchor="end" class="wave-value">{format(values[row.key])}</text>
            {/each}
            <line x1={cursor} x2={cursor} y1="4" y2="298" class="wave-cursor"/>
            {#each [0,180,360] as angle}<text x={left+(right-left)*angle/360} y="315" text-anchor={angle===0?'start':angle===360?'end':'middle'}>{angle}°</text>{/each}
          </svg>
        </div>
      </div>
    </section>
  {:else}
    {#if failed}<Alert.Root class="conduction-load-error"><Info aria-hidden="true"/><Alert.Title>{copy.unavailable}</Alert.Title><Alert.Description><Button size="sm" variant="outline" onclick={()=>retry++}>{copy.retry}</Button></Alert.Description></Alert.Root>{/if}
    {@render fallback()}
  {/if}
  <Figure name={staticFigure.name} size={staticFigure.size} caption={staticFigure.caption} {assetBase} {locale} {dark} dialogOnly bind:zoom={staticOpen} detailTitle={copy.fullPlotTitle}/>
</div>

<style>
  .solution-interaction{container:conduction / inline-size;min-width:0;margin:8px 0}
  .conduction-visualization{display:flex;flex-direction:column;gap:10px;min-width:0;padding:12px;border:1px solid var(--border);border-radius:var(--radius-xl);background:var(--diagram)}
  h4,h5,p,dl{margin:0}h4{font-size:14px;font-weight:600;line-height:1.5}h5{font-size:12px;font-weight:600;line-height:1.6}
  .conduction-heading,.conduction-heading-title,.conduction-actions{display:flex;align-items:center;gap:8px;min-width:0}.conduction-heading{justify-content:space-between}.conduction-heading-title{flex-wrap:wrap;gap:4px 10px}.conduction-actions{flex-shrink:0;gap:2px}.conduction-meta{font-size:12px;color:var(--muted-foreground);white-space:nowrap}
  .conduction-visualization :global(.conduction-stages){display:grid;grid-template-columns:repeat(4,minmax(0,1fr));height:auto;gap:2px;width:100%}.conduction-stage-label{font-size:12px}.conduction-interval{font-size:11px;line-height:1.4;color:var(--muted-foreground);font-variant-numeric:tabular-nums}
  .conduction-transport{display:grid;grid-template-columns:auto minmax(56px,1fr) auto;align-items:center;gap:10px}.conduction-controls{display:flex;align-items:center;gap:2px}.conduction-visualization :global(.conduction-phase){min-width:0;gap:0}.conduction-angle{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;width:76px;min-width:76px;text-align:right}
  .conduction-boundaries{position:relative;pointer-events:none;height:12px;color:var(--muted-foreground);font-size:10px;line-height:12px;font-variant-numeric:tabular-nums}.conduction-boundaries > span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}.conduction-boundaries > span[data-trigger]{color:var(--foreground);font-weight:600}.conduction-boundaries > span:first-child{transform:none}.conduction-boundaries > span:last-child{transform:translateX(-100%)}.conduction-boundaries > span::before{content:'';position:absolute;top:-17px;left:50%;width:2px;height:4px;background:var(--muted-foreground)}.conduction-boundaries > span:first-child::before{left:0}.conduction-boundaries > span:last-child::before{left:auto;right:0}
  .conduction-state{display:flex;align-items:baseline;gap:10px;padding-block:2px;font-size:14px;line-height:1.65;min-height:26px}.conduction-state strong{white-space:nowrap;font-weight:600}.conduction-state p{min-width:0;color:var(--muted-foreground)}
  .conduction-panels{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0}.conduction-circuit-panel,.conduction-wave-panel{min-width:0}.conduction-circuit{display:block;width:100%;height:auto}.conduction-carrier{fill:var(--formula);stroke:var(--diagram);stroke-width:1.5;pointer-events:none}
  .conduction-values{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding-top:8px;border-top:1px solid var(--border);text-align:center}.conduction-values div{display:flex;align-items:baseline;justify-content:center;gap:6px;flex-wrap:wrap}.conduction-values dt{font-size:11px;color:var(--muted-foreground)}.conduction-values dd{margin:0;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}
  .conduction-wave-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}.conduction-key{display:inline-flex;gap:4px;align-items:center;font-size:12px;color:var(--muted-foreground)}.conduction-key span{display:block;width:16px;border-top:2px solid var(--formula)}.conduction-key .key-future{border-color:var(--muted-foreground)}
  .conduction-waves{width:100%;height:320px;display:block;overflow:visible}.conduction-waves text{font-family:var(--font-sans);fill:var(--muted-foreground);font-size:11px}.conduction-waves .wave-row-label{fill:var(--foreground);font-size:12px;font-weight:600}.conduction-waves .wave-value{fill:var(--foreground);font-variant-numeric:tabular-nums}.wave-axis{stroke:var(--border);stroke-width:1}.wave-trigger{stroke:var(--muted-foreground);stroke-width:1;stroke-dasharray:3 4;opacity:.6}.wave-reference{fill:none;stroke:var(--muted-foreground);stroke-width:1.5;opacity:.8}.wave-trace{fill:none;stroke:var(--formula);stroke-width:2}.wave-dot{fill:var(--formula);stroke:var(--diagram);stroke-width:1.5}.wave-cursor{stroke:var(--primary);stroke-width:1.2;stroke-dasharray:3 3}
  .conduction-help-body{display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.75;min-height:0;overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere}.conduction-help-body p{margin:0}.solution-interaction :global(.conduction-load-error){margin:8px 0}
  @container conduction (min-width:700px){.conduction-panels{grid-template-columns:minmax(0,.46fr) minmax(0,.54fr);gap:16px}.conduction-circuit-panel{align-self:center}}
  .conduction-help-body:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
  @container conduction (max-width:600px){.conduction-boundaries{height:24px}.conduction-boundaries > span{top:12px}.conduction-boundaries > span::before{top:-29px}.conduction-boundaries > span[data-trigger]{top:0}.conduction-boundaries > span[data-trigger]::before{top:-17px}}
  @container conduction (max-width:480px){.conduction-state{min-height:calc(3.3em + 4px)}}
  @container conduction (max-width:340px){.conduction-boundaries > span:not([data-trigger]){font-size:9px}.conduction-visualization{padding:10px;gap:8px}.conduction-transport{gap:6px}.conduction-heading-title{gap:2px 6px}.conduction-state{font-size:12px;gap:8px}.conduction-stage-label{font-size:11px}.conduction-heading :global([data-static-diagram]){padding-inline:6px}}
</style>
