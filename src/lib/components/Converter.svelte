<script lang="ts">
  import {onMount,untrack,type Snippet} from 'svelte';
  import {Button,buttonVariants} from '#lib/components/ui/button';
  import {Badge} from '#lib/components/ui/badge';
  import {Separator} from '#lib/components/ui/separator';
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
  import ConductionCircuit from './ConductionCircuit.svelte';
  import {defaultMeasurements,type WaveKey,type ConverterValues} from '#lib/visualizations/conduction-measurements';
  import {parseConductionGeometry,validateConductionSprite,type ConductionGeometry} from '#lib/visualizations/conduction-geometry';
  import {converterCopy,converterIntervals,converterValues,converterMeasurements,type RippleData} from '#lib/visualizations/converter-presentation';
  import {FULL_PROFILES,validateRippleData} from '#lib/visualizations/full-converter-model.mjs';
  import {WAVE_PLOT,waveX,wavePercent} from '#lib/visualizations/converter-wave-scale';
  import type {Locale,Localized,FullConverterProfile} from '#lib/types';

  let {kind='semi-converter',profile,rippleAsset,asset,assetBase,locale,dark,active=false,staticFigure,fallback}:{kind?:'semi-converter'|'full-converter';profile?:FullConverterProfile;rippleAsset?:string;asset:string;assetBase:string;locale:Locale;dark:boolean;active?:boolean;staticFigure:{name:string;size:[number,number,number];caption?:Localized};fallback:Snippet}=$props();
  const id=$props.id();
  const copy=$derived(converterCopy(locale,profile));
  const intervals=$derived(converterIntervals(profile));
  const alpha=$derived(profile?FULL_PROFILES[profile].alpha:30);
  const boundaries=$derived([0,alpha,180,180+alpha,360]);
  const angleText=(angle:number)=>Number.isInteger(angle)?String(angle):angle.toFixed(1);
  const resourceKey=$derived(`${sprite}|${profile??'semi'}|${rippleAsset??''}`);
  const base=$derived(`${assetBase}/figures/${asset}`);
  const sprite=$derived(`${base}${dark?'-dark':''}.svg`);
  let root:HTMLDivElement;
  let mounted=$state(false),geometry=$state.raw<ConductionGeometry|null>(null),loaded=$state(''),failed=$state(false),retry=$state(0);
  let ripple=$state.raw<RippleData|undefined>();
  const emptyValues:ConverterValues={phase:0,index:0,v:0,i:0,v0:0,i0:0,is1:0,is2:0,is3:0,is4:0,id1:0,id2:0,vs1:0};
  let theta=$state(0),playing=$state(false),reduced=$state(false),staticOpen=$state(false),helpOpen=$state(false),particleDistance=$state(0);
  let flowEnabled=$state(true),visible=$state(false),pageVisible=$state(true),pageAlive=$state(true),modalOpen=$state(false);
  const enabled=$state({...defaultMeasurements});
  let status=$state('');
  let frame:number|undefined,lastTime:number|undefined;
  const values=$derived(profile==='ripple-drive'&&!ripple?emptyValues:converterValues(theta,profile,ripple));
  const sliderAngle=$derived(Math.round(theta*10)/10);
  const complete=$derived(theta===360);
  const interval=$derived(intervals[values.index]);
  const stateCopy=$derived(copy.stages[values.index]);
  const ready=$derived(mounted&&geometry!==null&&loaded===resourceKey);
  const phaseLabel=$derived(`${theta.toFixed(1)}°`);
  const playLabel=$derived(playing?copy.pause:complete?copy.restart:reduced?copy.jump:copy.play);
  const measurements=$derived(geometry&&(profile!=='ripple-drive'||ripple)?converterMeasurements(geometry,profile,ripple):[]);
  const cursor=$derived(waveX(theta));
  const selectedCount=$derived(Object.values(enabled).filter(Boolean).length);
  const canAnimate=$derived(ready&&active&&visible&&pageVisible&&pageAlive&&!reduced&&!staticOpen&&!helpOpen&&!modalOpen);
  const flowRunning=$derived(canAnimate&&flowEnabled);
  const flowLabel=$derived(reduced?copy.reducedMotion:flowEnabled?copy.pauseFlow:copy.resumeFlow);
  const format=(n:number)=>Math.abs(n)<.0005?'0':`${n>0?'+':''}${n.toFixed(2)}`;

  function toggle(key:WaveKey){enabled[key]=!enabled[key];status=`${copy.measurements[key]!.name}: ${enabled[key]?copy.colored:copy.gray}`;}
  function stopClock(){if(frame!==undefined)cancelAnimationFrame(frame);frame=undefined;lastTime=undefined;}
  function pause(){playing=false;}
  function seek(angle:number){pause();theta=Math.max(0,Math.min(360,angle));}
  // Keep native input precision independent of unquantized animation time.
  function scrub(angle:number){if(angle===sliderAngle)return;seek(angle);}
  function previous(){if(theta>=360){seek(intervals.at(-1)!.start);return;}seek(theta>interval.start?interval.start:intervals[Math.max(0,values.index-1)].start);}
  function animate(now:number){
    frame=undefined;
    if(!canAnimate){pause();stopClock();return;}
    const dt=lastTime===undefined?0:Math.min((now-lastTime)/1000,.08);lastTime=now;
    // Separate state advances share one scheduler. A frozen angle still shows current direction.
    if(flowEnabled)particleDistance+=dt*90;
    if(playing){theta=Math.min(360,theta+dt*30);if(complete)pause();}
    if(playing||flowEnabled)frame=requestAnimationFrame(animate);else lastTime=undefined;
  }
  function inView(){const r=root.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
  function play(){
    if(playing){pause();return;}
    if(!ready||!active||staticOpen||!inView())return;
    helpOpen=false;
    if(complete){theta=0;if(reduced)return;}
    if(reduced){seek(360);return;}
    playing=true;
  }
  $effect(()=>{locale;dark;untrack(pause);});
  $effect(()=>{
    if(!canAnimate)pause();
    if(canAnimate&&(playing||flowEnabled))untrack(()=>{if(frame===undefined){lastTime=undefined;frame=requestAnimationFrame(animate);}});
    else untrack(stopClock);
  });
  $effect(()=>{
    const target=sprite,key=resourceKey,geometryURL=`${base}.json`,rippleURL=rippleAsset?`${assetBase}/figures/${rippleAsset}.json`:undefined;retry;
    if(!mounted||!active||untrack(()=>loaded===key&&geometry!==null))return;
    const controller=new AbortController();let cancelled=false;
    failed=false;
    void Promise.all([fetch(geometryURL,{signal:controller.signal}),fetch(target,{signal:controller.signal}),rippleURL?fetch(rippleURL,{signal:controller.signal}):Promise.resolve(null)])
      .then(async([data,image,curve])=>{
        if(!data.ok||!image.ok||(curve&&!curve.ok))throw new Error('Interaction asset unavailable');
        const parsed=parseConductionGeometry(await data.json()),current=curve?validateRippleData(await curve.json()):undefined;
        if((kind==='full-converter')!==(parsed.version===2))throw new Error('Wrong converter topology');
        validateConductionSprite(await image.text(),parsed);converterMeasurements(parsed,profile,current);
        return{parsed,current};
      })
      .then(({parsed,current})=>{if(!cancelled){geometry=parsed;ripple=current;loaded=key;failed=false;}})
      .catch(()=>{if(!cancelled)failed=true;});
    return()=>{cancelled=true;controller.abort();};
  });
  onMount(()=>{
    mounted=true;
    const media=matchMedia('(prefers-reduced-motion: reduce)');reduced=media.matches;
    const motion=()=>{reduced=media.matches;pause();};
    const visibility=()=>{pageVisible=!document.hidden;if(!pageVisible)pause();};visibility();
    const hide=()=>{pageAlive=false;pause();stopClock();},show=()=>{pageAlive=true;visibility();};
    const modals=()=>{modalOpen=Boolean(document.querySelector('[role="dialog"]:not([data-state="closed"]),[role="alertdialog"]:not([data-state="closed"])'));if(modalOpen)pause();};
    const modalObserver=new MutationObserver(modals);modalObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-state','role']});modals();
    const observer=new IntersectionObserver(()=>{visible=inView();if(!visible)pause();});observer.observe(root);
    media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
    return()=>{pageAlive=false;stopClock();observer.disconnect();modalObserver.disconnect();media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);};
  });
</script>

<div bind:this={root} class="solution-interaction" data-interaction={kind} data-profile={profile} data-playing={playing} data-flow-running={flowRunning} data-ready={ready} data-angle={theta.toFixed(2)} lang={locale==='zh'?'zh-CN':'en'}>
  {#if ready&&geometry}
    <section class="conduction-visualization" aria-labelledby={`${id}-title`}>
      <header class="conduction-heading">
        <div class="conduction-heading-title"><h4 id={`${id}-title`}>{copy.compactTitle}</h4><span class="conduction-meta">α = {Number.isInteger(alpha)?alpha:alpha.toFixed(4)}°</span></div>
        <div class="conduction-actions">
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'sm'})} data-static-diagram aria-label={copy.showStatic} aria-haspopup="dialog" onclick={()=>{pause();staticOpen=true;}}><Expand data-icon="inline-start" aria-hidden="true"/>{copy.fullPlot}</Tooltip.Trigger><Tooltip.Content>{copy.showStatic}</Tooltip.Content></Tooltip.Root>
          <Popover.Root bind:open={helpOpen}>
            <Popover.Trigger class={buttonVariants({variant:'ghost',size:'icon-sm'})} data-conduction-help aria-label={copy.help}><Info aria-hidden="true"/></Popover.Trigger>
            <Popover.Content align="end" class="conduction-help-popover w-96 max-w-[calc(100vw-32px)]" style="max-height:min(calc(var(--bits-popover-content-available-height,100dvh) - 8px),calc(100dvh - 24px));overflow:hidden;">
              <Popover.Header class="shrink-0"><Popover.Title>{copy.help}</Popover.Title><Popover.Description>{copy.phaseHelp}</Popover.Description></Popover.Header>
              <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scrolling of the bounded help region.) -->
              <div class="conduction-help-body" role="region" tabindex="0" aria-label={copy.help}>
                <section class="conduction-help-stage" aria-labelledby={`${id}-help-stage`}>
                  <div class="conduction-help-stage-heading"><h5 id={`${id}-help-stage`}>{copy.stageHeading}</h5><Badge variant="outline">{copy.pairs[values.index]}</Badge></div>
                  <p>{stateCopy.explanation}</p>
                  <dl class="conduction-help-facts">
                    <div><dt>{copy.pathHeading}</dt><dd><ol class="conduction-help-route">{#each stateCopy.path.split(' → ') as node,i}<li>{#if i>0}<ArrowRight aria-hidden="true"/>{/if}<span>{node}</span></li>{/each}</ol></dd></div>
                    <div><dt>{copy.relationHeading}</dt><dd class="conduction-help-relation">{complete?copy.endRelation:stateCopy.relation}</dd></div>
                  </dl>
                </section>
                <Separator class="my-1 shrink-0"/>
                <p>{copy.history}</p><p>{copy.measurementHelp}</p><p>{copy.flowHelp}</p><p>{copy.polarityHelp}</p><p>{copy.reverseNote}</p><p>{copy.assumptions}</p>
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
      </header>
      <RadioGroup.Root orientation="horizontal" value={String(values.index)} onValueChange={v=>seek(intervals[Number(v)].start)} aria-label={copy.choose} class={cn(tabsListVariants(),'conduction-stages')} style={`grid-template-columns:repeat(${intervals.length},minmax(0,1fr))`}>
        {#each intervals as item,i}
          <RadioGroup.Item value={String(i)} data-active={values.index===i?true:undefined} class={cn(tabsTriggerVariants(),'h-auto min-w-0 flex-col gap-0.5 px-1 py-1.5')} aria-label={`${copy.stages[i].short}, ${item.start}°–${item.end}°`} onclick={()=>{if(values.index===i)seek(item.start);}}><span class="conduction-stage-label">{copy.stageLabels[i]}</span><span class="conduction-interval">{angleText(item.start)}–{angleText(item.end)}°</span></RadioGroup.Item>
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
          <Slider type="single" id={`${id}-angle`} min={0} max={360} step={.1} thumbPositioning="exact" value={sliderAngle} onValueChange={scrub} onpointerdowncapture={pause} onkeydowncapture={pause} thumbLabel={copy.angle} thumbValueText={`${phaseLabel}; ${complete?copy.completed:stateCopy.title}; ${copy.pairs[values.index]}`} thumbDescriptionId={`${id}-help`} class="h-8"/>
          <div class="conduction-boundaries" aria-hidden="true">{#each boundaries as angle}<span style={`left:${angle/360*100}%`} data-boundary={angle} data-trigger={angle===alpha||angle===180+alpha?true:undefined}>{angleText(angle)}°</span>{/each}</div>
        </Field.Field>
        <output for={`${id}-angle`} class="conduction-angle">θ = {phaseLabel}</output>
      </div>
      <p id={`${id}-help`} class="sr-only">{copy.phaseHelp}</p>
      <div class="conduction-state" aria-live="polite" aria-atomic="true"><strong>{copy.pairs[values.index]}</strong><p>{complete?copy.completed:copy.compactStates[values.index]}</p></div>
      <div class="conduction-panels">
        <section class="conduction-circuit-panel conduction-pane" aria-label={copy.diagram}>
          <div class="conduction-panel-heading"><h5>{copy.circuit}</h5>
            <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'xs'})} data-flow-toggle aria-label={flowLabel} aria-pressed={flowEnabled&&!reduced} disabled={reduced} onclick={()=>flowEnabled=!flowEnabled}>{#if flowEnabled&&!reduced}<Pause data-icon="inline-start" aria-hidden="true"/>{:else}<Play data-icon="inline-start" aria-hidden="true"/>{/if}<span class="conduction-flow-label">{copy.currentFlow}</span></Tooltip.Trigger><Tooltip.Content>{flowLabel}</Tooltip.Content></Tooltip.Root>
          </div>
          <ConductionCircuit {geometry} {sprite} {measurements} {values} {enabled} {interval} distance={particleDistance} label={`${copy.diagram}; ${copy.pairs[values.index]}`}/>
        </section>
        <section class="conduction-wave-panel conduction-pane" aria-labelledby={`${id}-waves`}>
          <div class="conduction-panel-heading"><h5 id={`${id}-waves`}>{copy.waves}</h5><span class="conduction-count">{selectedCount} / {measurements.length}</span></div>
          <p class="conduction-wave-help" id={`${id}-wave-help`}>{copy.waveHelp}</p>
          <div class="conduction-waves">
            {#each measurements as m(m.key)}
              <Tooltip.Root>
                <Tooltip.Trigger onclick={()=>toggle(m.key)}>
                  {#snippet child({props})}
                    <Button {...props} data-slot="button" variant="ghost" size="sm" class="conduction-wave-row active:not-aria-[haspopup]:translate-y-0" data-signal={m.key} aria-pressed={enabled[m.key]} aria-label={`${copy.measurements[m.key]!.name} ${m.symbol} / ${m.unit}`} aria-describedby={[props['aria-describedby'],`${id}-wave-help ${id}-${m.key}-reference ${id}-${m.key}-value`].filter(Boolean).join(' ')} style={`--paint:var(${enabled[m.key]?m.token:'--conduction-off'})`}>
                      <span class="wave-row-label"><span class="wave-swatch" data-pattern={m.pattern} aria-hidden="true"></span>{m.symbol}/{m.unit}</span>
                      <svg class="conduction-wave-plot size-auto" viewBox={`0 0 ${WAVE_PLOT.width} ${WAVE_PLOT.height}`} preserveAspectRatio="none" aria-hidden="true">
                        <defs><clipPath id={`${id}-${m.key}-history`}><rect x={WAVE_PLOT.start} y="0" width={Math.max(0,cursor-WAVE_PLOT.start)} height={WAVE_PLOT.height}/></clipPath></defs>
                        <line x1={WAVE_PLOT.start} x2={WAVE_PLOT.end} y1="15" y2="15" class="wave-axis"/>
                        {#each boundaries as angle}<line x1={waveX(angle)} x2={waveX(angle)} y1="1" y2="29" class="wave-grid" data-wave-boundary={angle} data-trigger={angle===alpha||angle===180+alpha?true:undefined}/>{/each}
                        <path d={m.trace} class="wave-reference" stroke-dasharray={m.dash}/><path d={m.trace} class="wave-trace" clip-path={`url(#${id}-${m.key}-history)`} stroke-dasharray={m.dash}/>
                        <path d={`M ${cursor} 1 L ${cursor} 29`} class="wave-cursor"/>
                        <circle cx={cursor} cy={15-values[m.key]*10} r="2.5" class="wave-dot"/>
                      </svg>
                      <span class="wave-value" id={`${id}-${m.key}-value`}>{format(values[m.key])}</span>
                      <span class="sr-only" id={`${id}-${m.key}-reference`}>{copy.measurements[m.key]!.reference}</span>
                    </Button>
                  {/snippet}
                </Tooltip.Trigger>
                <Tooltip.Content>{copy.measurements[m.key]!.reference}</Tooltip.Content>
              </Tooltip.Root>
            {/each}
          </div>
          <div class="conduction-wave-axis" aria-hidden="true">
            <span class="conduction-wave-axis-label">θ = ωt</span>
            <div class="conduction-wave-scale" style={`--wave-start:${wavePercent(0)}%;--wave-end:${wavePercent(360)}%`}>
              {#each boundaries as angle}<span style={`left:${wavePercent(angle)}%`} data-wave-angle={angle} data-trigger={angle===alpha||angle===180+alpha?true:undefined}>{angleText(angle)}°</span>{/each}
            </div>
          </div>
        </section>
      </div>
      <p class="conduction-note">{copy.measurementNote}</p>
      <p class="sr-only" role="status" aria-live="polite">{status}</p>
    </section>
  {:else}
    {#if failed}<Alert.Root class="conduction-load-error"><Info aria-hidden="true"/><Alert.Title>{copy.unavailable}</Alert.Title><Alert.Description><Button size="sm" variant="outline" onclick={()=>retry++}>{copy.retry}</Button></Alert.Description></Alert.Root>{/if}
    {@render fallback()}
  {/if}
  <Figure name={staticFigure.name} size={staticFigure.size} caption={staticFigure.caption} {assetBase} {locale} {dark} dialogOnly bind:zoom={staticOpen} detailTitle={copy.fullPlotTitle}/>
</div>

<!-- Styles are statically owned by src/styles/converter.css, not this lazy module. -->
