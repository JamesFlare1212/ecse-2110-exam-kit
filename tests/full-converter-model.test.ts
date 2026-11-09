import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {FULL_PROFILES, fullIntervals, atFullAngle, atFullCycleAngle, validateRippleData} from '../src/lib/visualizations/full-converter-model.mjs';

const raw=JSON.parse(readFileSync(new URL('../content/en/practice2_f26/assets/figures/p2-f26-q6-ripple.json',import.meta.url),'utf8'));
const ripple=validateRippleData(raw);
const profileKeys=Object.keys(FULL_PROFILES) as (keyof typeof FULL_PROFILES)[];
const mean=(values:readonly number[])=>values.reduce((a,b)=>a+b,0)/values.length;
const rms=(values:readonly number[])=>Math.sqrt(mean(values.map(v=>v*v)));
// Integrate each open switching segment separately: no firing-edge aliasing.
function cycleMean(key:keyof typeof FULL_PROFILES, f:(s:ReturnType<typeof atFullAngle>)=>number) {
  const n=20000;let integral=0;
  for(const interval of fullIntervals(FULL_PROFILES[key].alpha)) {
    let sum=0;
    for(let j=0;j<n;j++)sum+=f(atFullAngle(interval.start+(j+.5)*(interval.end-interval.start)/n,key,ripple));
    integral+=sum/n*(interval.end-interval.start)/360;
  }
  return integral;
}

describe('solution-only continuous-current full converter',()=>{
  test('profiles preserve actual givens, signed emf and exact Q5 acos angle',()=>{
    const q3=FULL_PROFILES['reversed-emf'],q5=FULL_PROFILES['ideal-drive'],q6=FULL_PROFILES['ripple-drive'];
    expect(q3).toEqual({alpha:60,voltageRms:120,frequency:60,current:(2*Math.SQRT2*120/Math.PI*Math.cos(Math.PI/3)+11),emf:-11,resistance:1,ripple:false});
    expect(q3.current).toBeCloseTo(65.018979,6);
    expect(q5.alpha).toBeCloseTo(59.397409,6);expect(q5.alpha).not.toBe(60);
    expect(q5.alpha).toBe(Math.acos(55*Math.PI/(2*Math.SQRT2*120))*180/Math.PI);
    expect(q5.current).toBe(5*746/110);expect(q5.resistance).toBe(0);expect(q5.emf).toBe(55);
    expect(q6.current).toBe(20);expect(q6.emf).toBeCloseTo(49.018979,6);expect(q6.resistance).toBe(.25);expect(q6.ripple).toBe(true);
  });
  test('three presentation intervals retain the two diagonal pairs, source and load; no field/freewheel',()=>{
    for(const key of profileKeys){
      const a=FULL_PROFILES[key].alpha, intervals=fullIntervals(a);
      expect(intervals.map(s=>[s.index,s.start,s.end,s.route])).toEqual([[0,0,a,'negative'],[1,a,180+a,'positive'],[2,180+a,360,'negative']]);
      expect(intervals[0].active).toEqual(['load','source','S3','S4','bottom-left']);
      expect(intervals[1].active).toEqual(['load','source','S1','S2','top-left']);
      expect(intervals[2].active).toEqual(intervals[0].active);
      for(const i of intervals){expect(i.active).not.toContain('field');expect(i.route).not.toBe('freewheel');}
    }
  });
  test('half-open firing boundaries are exact, including the non-rounded Q5 angle',()=>{
    for(const key of profileKeys){
      const a=FULL_PROFILES[key].alpha;
      for(const [angle,index] of [[0,0],[a-1e-8,0],[a,1],[180,1],[180+a-1e-8,1],[180+a,2],[359.999999,2]]){
        expect(atFullAngle(angle,key,ripple).index).toBe(index);
      }
      expect(atFullAngle(59.5,key,ripple).index).toBe(key==='ideal-drive'?1:0);
    }
  });
  test('KCL, on/off SCR instantaneous equality and instantaneous converter power across all profiles',()=>{
    for(const key of profileKeys)for(let angle=0;angle<=720;angle+=.37){
      const s=atFullAngle(angle,key,ripple);
      expect(s.i0).toBeGreaterThan(0);
      expect(s.is1+s.is3).toBe(s.i0);expect(s.is2+s.is4).toBe(s.i0);
      expect(s.is1).toBe(s.is2);expect(s.is3).toBe(s.is4);
      expect(s.i).toBe(s.is1-s.is4);expect(s.i).toBe(s.is2-s.is3);
      expect([s.is1,s.is2,s.is3,s.is4].filter(i=>i===s.i0)).toHaveLength(2);
      expect([s.is1,s.is2,s.is3,s.is4].filter(i=>i===0)).toHaveLength(2);
      expect(s.v0*s.i0).toBeCloseTo(s.v*s.i,13);
      expect(Math.abs(s.v0)).toBe(Math.abs(s.v));
    }
    // Unlike the semi-converter, full-converter output can be negative.
    expect(atFullAngle(30,'reversed-emf').v0).toBeLessThan(0);
    expect(atFullAngle(200,'ideal-drive').v0).toBeLessThan(0);
  });
  test('closed 360 endpoint retains final interval; physical helper actually wraps',()=>{
    for(const key of profileKeys){
      const end=atFullCycleAngle(360,key,ripple),periodic=atFullAngle(360,key,ripple);
      expect(end.phase).toBe(360);expect(end.index).toBe(2);expect(end.v).toBe(0);expect(end.v0).toBe(0);
      expect(end.i).toBe(-end.i0);expect(end.is3).toBe(end.i0);expect(end.is4).toBe(end.i0);
      expect(periodic.phase).toBe(0);expect(periodic.index).toBe(0);
      expect(end.i0).toBe(periodic.i0);
      expect(atFullCycleAngle(400,key,ripple)).toEqual(end);
      expect(atFullCycleAngle(-1,key,ripple)).toEqual(atFullCycleAngle(0,key,ripple));
      for(const angle of [0,15,90,195,270]){
        expect(atFullAngle(angle-360,key,ripple)).toEqual(atFullAngle(angle,key,ripple));
        expect(atFullAngle(angle+720,key,ripple)).toEqual(atFullAngle(angle,key,ripple));
      }
    }
  });
  test('Q3 imposed ripple-free current stays flat even when a Q6 table is supplied; average power balances',()=>{
    const p=FULL_PROFILES['reversed-emf'];
    for(let a=0;a<=360;a+=.1){expect(atFullCycleAngle(a,'reversed-emf').i0).toBe(1);expect(atFullCycleAngle(a,'reversed-emf',ripple).i0).toBe(1);}
    const power=cycleMean('reversed-emf',s=>s.v0*s.i0)*Math.SQRT2*p.voltageRms*p.current;
    expect(power).toBeCloseTo(3512.258858,4);
    expect(power+p.current*11).toBeCloseTo(p.current**2*p.resistance,4);
  });
  test('Q5 average output is 55V and each SCR RMS is I0/sqrt(2)',()=>{
    const p=FULL_PROFILES['ideal-drive'];
    expect(cycleMean('ideal-drive',s=>s.v0)*Math.SQRT2*120).toBeCloseTo(55,6);
    for(const device of ['is1','is2','is3','is4'] as const){
      expect(Math.sqrt(cycleMean('ideal-drive',s=>s[device]**2))*p.current).toBeCloseTo(p.current/Math.SQRT2,8);
    }
    expect(cycleMean('ideal-drive',s=>s.v*s.i)*Math.SQRT2*120*p.current).toBeCloseTo(55*p.current,5);
  });
});

describe('authoritative Q6 representative RL–emf table',()=>{
  test('8192 independent locale samples have mean20, RMS sqrt416 and ripple RMS4',()=>{
    const zh=validateRippleData(JSON.parse(readFileSync(new URL('../content/zh-cn/practice2_f26/assets/figures/p2-f26-q6-ripple.json',import.meta.url),'utf8')));
    expect(zh).toEqual(ripple);expect(ripple.values).toHaveLength(8192);
    expect(ripple.inductance).toBeCloseTo(.031173052126851786,12);
    expect(mean(ripple.values)).toBeCloseTo(20,10);expect(rms(ripple.values)).toBeCloseTo(Math.sqrt(416),10);
    expect(rms(ripple.values.map(i=>i-20))).toBeCloseTo(4,10);
    expect(Math.min(...ripple.values)).toBeGreaterThan(12);expect(Math.max(...ripple.values)).toBeGreaterThan(24);
  });
  test('interpolates the existing table, including its periodic seam, without flattening or a new sine',()=>{
    for(const k of [0,1,100,1365,4096,8191]){
      expect(atFullAngle(k*360/8192,'ripple-drive',ripple).i0*20).toBeCloseTo(ripple.values[k],12);
      expect(atFullAngle((k+.5)*360/8192,'ripple-drive',ripple).i0*20).toBeCloseTo((ripple.values[k]+ripple.values[(k+1)%8192])/2,12);
    }
    expect(atFullCycleAngle(360,'ripple-drive',ripple).i0*20).toBe(ripple.values[0]);
    expect(cycleMean('ripple-drive',s=>s.i0)*20).toBeCloseTo(20,6);
    expect(Math.sqrt(cycleMean('ripple-drive',s=>s.i0**2))*20).toBeCloseTo(Math.sqrt(416),5);
    expect(Math.sqrt(cycleMean('ripple-drive',s=>(s.i0*20-20)**2))).toBeCloseTo(4,5);
  });
  test('mean instantaneous power includes ripple heating, not product of averages; disclose sampling error',()=>{
    const p=FULL_PROFILES['ripple-drive'],vm=Math.SQRT2*p.voltageRms;
    const power=cycleMean('ripple-drive',s=>s.v0*s.i0)*vm*p.current;
    const product=cycleMean('ripple-drive',s=>s.v0)*vm*p.current;
    const analytic=p.emf*p.current+p.resistance*(20**2+4**2);
    expect(analytic).toBeCloseTo(1084.379579,6);expect(product).toBeCloseTo(1080.379579,5);
    // The authoritative FFT table samples discontinuous voltage on a finite
    // grid. Continuous analytic switching + linear i interpolation is within
    // 0.12 W (<0.012%), not exact. Never retune the original table to hide this.
    expect(Math.abs(power-analytic)).toBeLessThan(.12);
    expect(power-product).toBeGreaterThan(3.8);expect(power-product).toBeLessThan(4.1);
    expect(power).not.toBeCloseTo(product,0);
  });
  test('validation clones/freezes safe data and strips unexpected fields',()=>{
    const safe=validateRippleData({...raw,executable:'not retained'});
    expect(Object.isFrozen(safe)).toBe(true);expect(Object.isFrozen(safe.values)).toBe(true);
    expect(safe).not.toHaveProperty('executable');expect(safe.values).not.toBe(raw.values);
    expect(validateRippleData(safe)).toBe(safe);
    const copy=structuredClone(raw),owned=validateRippleData(copy);copy.values[0]=999;
    expect(owned.values[0]).toBe(raw.values[0]);
  });
  test('rejects malformed metadata, wrong statistics, nonfinite/unbounded/nonpositive samples',()=>{
    const bad=[null,[],{},'json',...[
      {version:2},{kind:'sine'},{period:180},{mean:21},{mean:NaN},{rippleRms:0},{rippleRms:Infinity},
      {inductance:0},{inductance:Infinity},{inductance:11},{values:[]},{values:Array(8192).fill(20)},
      {values:raw.values.slice(1)},
      ...[NaN,Infinity,0,-1,81,'20'].map(value=>({values:[value,...raw.values.slice(1)]})),
    ].map(overrides=>({...raw,...overrides}))];
    for(const data of bad)expect(()=>validateRippleData(data)).toThrow();
    expect(()=>atFullAngle(45,'ripple-drive')).toThrow('ripple');
    expect(()=>atFullCycleAngle(360,'ripple-drive',{...raw,mean:0})).toThrow();
  });
  test('rejects invalid angles, profiles and interval requests',()=>{
    for(const a of [NaN,Infinity,-Infinity]){
      expect(()=>atFullAngle(a,'ideal-drive')).toThrow('finite');expect(()=>atFullCycleAngle(a,'ideal-drive')).toThrow('finite');
    }
    for(const a of [NaN,0,180,-1,360])expect(()=>fullIntervals(a)).toThrow();
    // @ts-expect-error runtime validation is also required for untyped callers.
    expect(()=>atFullAngle(0,'unknown')).toThrow('profile');
    // @ts-expect-error inherited object properties are not profiles.
    expect(()=>atFullAngle(0,'toString')).toThrow('profile');
  });
});
