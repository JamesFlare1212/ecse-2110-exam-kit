import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {WAVE_PLOT,waveX,wavePercent} from '../src/lib/visualizations/converter-wave-scale';
import {FULL_PROFILES} from '../src/lib/visualizations/full-converter-model.mjs';

test('wave coordinates preserve the original curve domain and give the ruler the same inset',()=>{
 expect(WAVE_PLOT).toEqual({width:320,height:30,start:5,end:315});
 expect(waveX(0)).toBe(5);expect(waveX(180)).toBe(160);expect(waveX(360)).toBe(315);
 expect(wavePercent(0)).toBe(1.5625);expect(wavePercent(180)).toBe(50);expect(wavePercent(360)).toBe(98.4375);
 for(const alpha of [30,...Object.values(FULL_PROFILES).map(profile=>profile.alpha)]){
  for(const angle of [0,alpha,180,180+alpha,360,59,123.4,359.9]){
   expect(waveX(angle)).toBe(5+310*angle/360);
   expect(wavePercent(angle)/100*WAVE_PLOT.width).toBeCloseTo(waveX(angle),12);
  }
 }
 expect(waveX(FULL_PROFILES['ideal-drive'].alpha)).not.toBe(waveX(60));
});

test('curves, live cursor, guide lines and numeric ruler consume one scale without hardcoded firing marks',()=>{
 const read=(path:string)=>readFileSync(path,'utf8'),component=read('src/lib/components/Converter.svelte');
 expect(component).toContain('const cursor=$derived(waveX(theta))');
 expect(component).toContain('x1={waveX(angle)} x2={waveX(angle)}');
 expect(component).toContain('data-wave-boundary={angle}');
 expect(component).toContain('left:${wavePercent(angle)}%');
 expect(component).toContain('data-wave-angle={angle}');
 expect(component).not.toContain('{#each [30,210]');
 for(const path of ['src/lib/visualizations/conduction-measurements.ts','src/lib/visualizations/converter-presentation.ts']){
  const source=read(path);expect(source).toContain('waveX(t)');expect(source).not.toContain('5+310*t/360');
 }
 const css=read('src/styles/converter.css');
 expect(css).toContain('.conduction-waves .conduction-wave-row,.conduction-wave-axis { display:grid; grid-template-columns:');
 expect(css).not.toContain('margin:3px 48px 0 82px');
});
