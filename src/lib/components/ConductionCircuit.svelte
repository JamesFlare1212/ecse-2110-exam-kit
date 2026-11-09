<script lang="ts">
  import {currentMarkers,svgPath,type Measurement,type WaveKey,type ConverterValues} from '#lib/visualizations/conduction-measurements';
  import {conductionRoute,type ConductionGeometry} from '#lib/visualizations/conduction-geometry';
  import type {ConverterInterval} from '#lib/visualizations/converter-presentation';
  let {geometry,sprite,measurements,values,enabled,distance,label,interval}:{geometry:ConductionGeometry;sprite:string;measurements:Measurement[];values:ConverterValues;enabled:Record<WaveKey,boolean>;distance:number;label:string;interval:ConverterInterval}=$props();
  const id=$props.id();
  let circuitWidth=$state(360);
  const markerScale=$derived(Math.max(1,288/Math.max(1,circuitWidth)));
  const markers=$derived(currentMarkers(conductionRoute(geometry,interval.route),distance));
</script>

<svg bind:clientWidth={circuitWidth} class="conduction-circuit" viewBox={geometry.viewBox.join(' ')} role="img" aria-label={label}>
  <defs><marker id={`${id}-probe-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>
  {#each geometry.parts as part(part.id)}<use class="circuit-fragment" href={`${sprite}#${part.id}`} data-label={part.label} data-component={part.key} data-auxiliary={part.key==='field'?true:undefined} data-conducting={interval.active.includes(part.key)}/>{/each}
  <g aria-hidden="true">
    {#each measurements as m(m.key)}
      <g class="conduction-measurement" data-signal={m.key} data-enabled={enabled[m.key]} style={`--paint:var(${m.token})`}>
        {#if m.kind==='voltage'}
          {#each m.pins as pin,i}<path class="probe-line probe-lead" d={svgPath([pin,m.ends[i]])}/><circle class="probe-node" cx={pin[0]} cy={pin[1]} r="5"/>{/each}
          <path class="probe-line" d={svgPath(m.ends)}/>
          {#each m.ends as end,i}<text class="polarity" x={end[0]+7} y={end[1]+6}>{i===0?'+':'−'}</text>{/each}
        {:else}
          <circle class="probe-node" cx={m.point[0]} cy={m.point[1]} r="6"/>
          <path class="probe-flow" class:zero={Math.abs(values[m.key])<1e-8} data-flow={m.key} data-sign={Math.sign(values[m.key])} d={svgPath(values[m.key]<0?[...m.arrow].reverse():m.arrow)} marker-end={Math.abs(values[m.key])<1e-8?undefined:`url(#${id}-probe-arrow)`}/>
        {/if}
      </g>
    {/each}
  </g>
  <g data-flow-route={interval.route} aria-hidden="true">
    {#each markers as marker,i(i)}<path class="conduction-carrier" d="M -7 -5 L 7 0 L -7 5 Z" transform={`${marker.transform} scale(${markerScale})`} data-fraction={marker.fraction}/>{/each}
  </g>
</svg>

<style>
  .conduction-circuit{display:block;width:100%;max-width:360px;height:auto;margin-inline:auto}
  /* Neutral width/contrast encodes conduction independently of colored probes.
     Labels stay fully readable; no route line is drawn through R/L or the source. */
  .circuit-fragment{color:var(--foreground)}
  .circuit-fragment[data-label=false]{color:var(--muted-foreground);opacity:.55;--conduction-stroke-width:1.8}
  .circuit-fragment[data-label=false][data-conducting=true]{color:var(--foreground);opacity:1;--conduction-stroke-width:2.8}
  .circuit-fragment[data-auxiliary=true][data-label=false]{color:var(--foreground);opacity:.78;--conduction-stroke-width:1.8}
  .conduction-measurement{pointer-events:none}.conduction-measurement[data-enabled=false]{display:none}
  .probe-line{fill:none;stroke:var(--paint);stroke-width:1.8;vector-effect:non-scaling-stroke}.probe-lead{stroke-dasharray:3 4}
  .probe-node{fill:var(--card);stroke:var(--paint);stroke-width:1.8;vector-effect:non-scaling-stroke}
  .polarity{fill:var(--paint);font-size:19px;font-weight:700}.probe-flow{fill:none;stroke:var(--paint);stroke-width:2;vector-effect:non-scaling-stroke}.probe-flow.zero{stroke-dasharray:3 4}
  .conduction-carrier{fill:var(--foreground);stroke:var(--card);stroke-width:.9;stroke-linejoin:round;vector-effect:non-scaling-stroke;pointer-events:none}
</style>
