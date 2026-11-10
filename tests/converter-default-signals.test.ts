import {expect,test} from 'bun:test';
import {exams} from '../content/catalog.server';
import {converterInteractionSchema} from '../content/metadata';
import {joinTranslations} from '../content/localization';
import {createMeasurementSelection} from '../src/lib/visualizations/conduction-measurements';
import type {ConverterSignal} from '../content/types';

const expected:Record<string,ConverterSignal[]>={
 'p2-f26-q3-a':['i0'],
 'p2-f26-q4-a':['i0','v0','is1','is2','id1','id2','i','vs1'],
 'p2-f26-q5-biv':['v','i','v0','i0'],
 'p2-f26-q6-a':['v','i','v0','i0'],
};

test.skipIf(!exams.some(exam=>exam.id==='p2-f26'))('every enhanced part focuses the quantities its own printed question requests',()=>{
 const parts=exams.flatMap(exam=>exam.problems.flatMap(problem=>problem.parts)).filter(part=>part.interaction);
 expect(parts.map(part=>part.id)).toEqual(Object.keys(expected));
 for(const part of parts){
  expect(part.interaction!.defaultSignals).toEqual(expected[part.id]);
  expect(Object.entries(createMeasurementSelection(part.interaction!.defaultSignals)).filter(([,enabled])=>enabled).map(([key])=>key).sort()).toEqual([...expected[part.id]].sort());
 }
});

test('initial signal selections are independent and never reintroduce a generic four-wave default',()=>{
 const semi=createMeasurementSelection(expected['p2-f26-q4-a']),motor=createMeasurementSelection(['i0']);
 expect(semi.v).toBe(false);expect(semi.vs1).toBe(true);expect(motor.vs1).toBe(false);
 semi.i0=false;expect(motor.i0).toBe(true);expect(createMeasurementSelection(['i0']).i0).toBe(true);
});

test('metadata requires unique, nonempty, topology-correct defaults in both locales',()=>{
 const semi={kind:'semi-converter',asset:'bridge',defaultSignals:['i0']};
 const full={kind:'full-converter',asset:'bridge',profile:'ideal-drive',defaultSignals:['v','i','v0','i0']};
 for(const entry of [semi,full]){
  expect(converterInteractionSchema.safeParse(entry).success).toBe(true);
  for(const defaults of [undefined,[],['i0','i0'],['invented'],['__proto__']])expect(converterInteractionSchema.safeParse({...entry,defaultSignals:defaults}).success).toBe(false);
 }
 expect(converterInteractionSchema.safeParse({...semi,defaultSignals:['is3']}).success).toBe(false);
 expect(converterInteractionSchema.safeParse({...full,defaultSignals:['id1']}).success).toBe(false);
 expect(()=>joinTranslations({interaction:semi},{interaction:{...semi,defaultSignals:['v']}},'part')).toThrow('agree');
});
