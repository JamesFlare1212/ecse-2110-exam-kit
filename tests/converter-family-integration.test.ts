import {describe,expect,test} from 'bun:test';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {papers} from '../content/catalog.server';
import {questionMetadataSchema} from '../content/metadata';
import {conductionRoute,parseConductionGeometry,validateConductionSprite} from '../src/lib/visualizations/conduction-geometry';
import {converterCopy,converterIntervals,converterMeasurements,converterValues} from '../src/lib/visualizations/converter-presentation';
import {FULL_PROFILES,validateRippleData} from '../src/lib/visualizations/full-converter-model.mjs';
import {solutionFigures} from '../content/text';
import {semanticMarkdown} from './fixtures/semantic-markdown';
import type {FullConverterProfile} from '../content/types';
const paper=papers.find(p=>p.exam.id==='p2-f26');
const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const hash=(s:string)=>createHash('sha256').update(semanticMarkdown(s)).digest('hex');
describe.skipIf(!paper)('all comparable converter problems use the shared interaction',()=>{
 test('exactly Q3–Q6 are enhanced, while prompt diagrams, identities and required static fallbacks stay independent',()=>{
  const parts=paper!.exam.problems.flatMap(q=>q.parts).filter(p=>p.interaction);
  expect(parts.map(p=>p.id)).toEqual(['p2-f26-q3-a','p2-f26-q4-a','p2-f26-q5-biv','p2-f26-q6-a']);
  expect(parts.map(p=>p.interaction)).toEqual([
   {kind:'full-converter',asset:'p2-f26-q3-conduction',profile:'reversed-emf'},
   {kind:'semi-converter',asset:'p2-f26-q4-conduction'},
   {kind:'full-converter',asset:'p2-f26-q5-conduction',profile:'ideal-drive'},
   {kind:'full-converter',asset:'p2-f26-q6-conduction',profile:'ripple-drive',rippleAsset:'p2-f26-q6-ripple'},
  ]);
  for(const p of parts)for(const locale of ['en','zh'] as const){expect(p.figure).toBeTruthy();expect(solutionFigures(p.solution[locale])).toEqual([p.figure!]);}
  expect(paper!.exam.problems[2].figure).toBe('p2-f26-q3');
  expect(paper!.exam.problems[2].figureOriginal).toBe(false);
  expect(paper!.exam.problems[4].figure).toBeUndefined();
  expect(paper!.exam.problems[5].figure).toBe('p2-f26-q6');
 });
 test('Q3 retains its solution-only teaching figure and original solution prose and equations',()=>{
  const p=paper!.exam.problems[2].parts[0];
  const originals={en:'cd3497f899985ce5025d4afde064e54e31cf2687326265f2dbc49dc15acba0d5',zh:'59c280b66340eb4a4a794e6c036e7384c41064a13a6b639213ab0cb005262b81'};
  for(const locale of ['en','zh'] as const)expect(hash(p.solution[locale].replace(/^!\[[^\n]*\]\(figure:p2-f26-q3-circuit\)\s*$/m,''))).toBe(originals[locale]);
 });
 test('new full assets and representative data are local, separately owned, validated and topology-correct',()=>{
  for(const q of [3,5,6])for(const locale of ['en','zh'] as const){
   const directory=resolve(paper!.directories[locale],'assets/figures'),base=`p2-f26-q${q}-conduction`,geometry=parseConductionGeometry(json(resolve(directory,base+'.json')));
   expect(geometry.version).toBe(2);expect(Object.keys(geometry.routes).sort()).toEqual(['negative','positive']);
   expect(()=>conductionRoute(geometry,'freewheel')).toThrow('no diode-freewheel');
   for(const suffix of ['.svg','-dark.svg']){const path=resolve(directory,base+suffix);validateConductionSprite(readFileSync(path,'utf8'),geometry);expect(lstatSync(path).isSymbolicLink()).toBe(false);}
   const profile:FullConverterProfile=q===3?'reversed-emf':q===5?'ideal-drive':'ripple-drive';
   const curve=q===6?validateRippleData(json(resolve(directory,'p2-f26-q6-ripple.json'))):undefined;
   const measurements=converterMeasurements(geometry,profile,curve);expect(measurements.map(m=>m.key)).toEqual(['v','i','v0','i0','is1','is2','is3','is4']);
   expect(measurements.some(m=>m.key.startsWith('id'))).toBe(false);
   const intervals=converterIntervals(profile);expect(intervals).toHaveLength(3);expect(intervals.map(i=>i.route)).toEqual(['negative','positive','negative']);
   for(const theta of [0,30,FULL_PROFILES[profile].alpha,180,180+FULL_PROFILES[profile].alpha,359.9,360]){const values=converterValues(theta,profile,curve);expect(values.i0).toBeGreaterThan(0);expect(values.is1+values.is3).toBeCloseTo(values.i0);expect(values.is2+values.is4).toBeCloseTo(values.i0);}
   const copy=converterCopy(locale,profile);expect(copy.stages).toHaveLength(3);for(const m of measurements)expect(copy.measurements[m.key]?.reference.length).toBeGreaterThan(0);
  }
 });
 test('metadata rejects missing/unknown profiles, mismatched ripple settings and unsafe resource paths',()=>{
  const q=paper!.exam.problems[2],base={id:q.id,title:'Test',topic:'Test',points:0,givens:[],lectures:[{doc:'lecture-11-12',page:23,label:'Bridge'}]};
  const valid={kind:'full-converter',asset:'bridge',profile:'ideal-drive'};
  const accepts=(interaction:unknown)=>questionMetadataSchema.safeParse({...base,parts:{a:{figure:'circuit',interaction}}}).success;
  expect(accepts(valid)).toBe(true);
  for(const invalid of [{...valid,profile:undefined},{...valid,profile:'invented'},{...valid,asset:'../outside'},{...valid,rippleAsset:'data'},{...valid,profile:'ripple-drive'},{...valid,profile:'ripple-drive',rippleAsset:'../data'}])expect(accepts(invalid)).toBe(false);
  expect(accepts({...valid,profile:'ripple-drive',rippleAsset:'current-samples'})).toBe(true);
 });
 test('full geometry rejects extra/fake routes, unknown probes, unsafe IDs and off-page annotations',()=>{
  const base=json(resolve(paper!.directories.en,'assets/figures/p2-f26-q6-conduction.json'));
  for(const mutate of [(g:any)=>g.routes.freewheel=g.routes.positive,(g:any)=>g.probes[0].key='id1',(g:any)=>g.probes[0].pins[0][0]=Infinity,(g:any)=>g.probes[1].point[1]=-100,(g:any)=>g.parts[0].id='x" onload="evil',(g:any)=>g.parts=g.parts.filter((p:any)=>p.key!=='S4')]){const value=structuredClone(base);mutate(value);expect(()=>parseConductionGeometry(value)).toThrow();}
 });
});
