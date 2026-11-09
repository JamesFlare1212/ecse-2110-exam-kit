import {describe,expect,test} from 'bun:test';
import {readFileSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {exams,papers} from '../content/catalog.server';
import {readQuestionMarkdown} from '../content/markdown';
import {joinTranslations} from '../content/localization';
import {parseConductionGeometry,validateConductionSprite,pointOnRoute} from '../src/lib/visualizations/conduction-geometry';
import {CONDUCTION_INTERVALS,WAVE_KEYS,atAngle,atCycleAngle} from '../src/lib/visualizations/semi-converter-model.mjs';
import {semiConverterCopy} from '../src/lib/visualizations/semi-converter-copy';
import {solutionFigures} from '../content/text';
import {readTemplate} from './fixtures/template';

const p2=papers.find(p=>p.exam.id==='p2-f26')!;
const load=(locale:'en'|'zh')=>JSON.parse(readFileSync(resolve(p2.directories[locale],'assets/figures/p2-f26-q4-conduction.json'),'utf8'));

describe.skipIf(!p2)('production semi-converter progressive enhancement',()=>{
  test('only the opted-in solution figure is enhanced, with a full authored static fallback',()=>{
    const opted=exams.flatMap(e=>e.problems.flatMap(q=>q.parts)).filter(p=>p.interaction);
    expect(opted.map(p=>p.id)).toEqual(['p2-f26-q4-a']);
    expect(opted[0].interaction).toEqual({kind:'semi-converter',asset:'p2-f26-q4-conduction'});
    for(const locale of ['en','zh'] as const)expect(solutionFigures(opted[0].solution[locale])).toEqual([opted[0].figure!]);
  });
  test('metadata rejects unsupported models, unsafe asset paths and missing static figures',()=>{
    const source=readTemplate('question.en.md'),resources=JSON.parse(readTemplate('figure-sources.json'));
    const withFigure=source.replace('    points: 4','    points: 4\n    figure: e1-f00-q1-circuit\n    interaction: {kind: semi-converter, asset: e1-f00-q1-conduction}');
    expect(readQuestionMarkdown(withFigure,'test.md',resources).parts[0].interaction?.kind).toBe('semi-converter');
    expect(()=>readQuestionMarkdown(withFigure.replace('    figure: e1-f00-q1-circuit\n',''),'test.md',resources)).toThrow('static fallback');
    expect(()=>readQuestionMarkdown(withFigure.replace('kind: semi-converter','kind: arbitrary-html'),'test.md',resources)).toThrow('frontmatter');
    expect(()=>readQuestionMarkdown(withFigure.replace('asset: e1-f00-q1-conduction','asset: ../outside'),'test.md',resources)).toThrow('frontmatter');
    expect(()=>joinTranslations({interaction:{kind:'semi-converter',asset:'a'}},{interaction:{kind:'semi-converter',asset:'b'}},'part')).toThrow('agree');
  });
  test('both languages own complete validated geometry and both theme sprites',()=>{
    for(const locale of ['en','zh'] as const){
      const geometry=parseConductionGeometry(load(locale));expect(geometry.parts.length).toBeGreaterThan(40);
      for(const suffix of ['','-dark'])validateConductionSprite(readFileSync(resolve(p2.directories[locale],`assets/figures/p2-f26-q4-conduction${suffix}.svg`),'utf8'),geometry);
      for(const points of Object.values(geometry.routes))for(const fraction of [0,.1,.5,.99,1,-.25]){
        const point=pointOnRoute(points,fraction);expect(point.every(Number.isFinite)).toBe(true);expect(point[0]).toBeGreaterThanOrEqual(0);expect(point[1]).toBeGreaterThanOrEqual(0);
      }
    }
    expect(load('en')).toEqual(load('zh'));
    for(const suffix of ['.json','.svg','-dark.svg']){
      const files=(['en','zh'] as const).map(locale=>lstatSync(resolve(p2.directories[locale],`assets/figures/p2-f26-q4-conduction${suffix}`)));
      expect(files.every(file=>!file.isSymbolicLink())).toBe(true);expect(files[0].ino).not.toBe(files[1].ino);
    }
  });
  test('geometry and sprite cannot smuggle code, remote URLs, invalid fragments or nonfinite coordinates',()=>{
    const raw=load('en'),geometry=parseConductionGeometry(raw);
    for(const mutate of [
      (v:any)=>v.parts[0].id='x" onload="alert(1)',
      (v:any)=>v.parts[0].key='unregistered',
      (v:any)=>v.parts[0].label='true',
      (v:any)=>v.parts.push(v.parts[0]),
      (v:any)=>v.routes.freewheel[0][0]=Infinity,
      (v:any)=>v.routes.negative=[],
      (v:any)=>v.routes.negative.pop(),
    ]){const value=structuredClone(raw);mutate(value);expect(()=>parseConductionGeometry(value)).toThrow();}
    const svg=readFileSync(resolve(p2.directories.en,'assets/figures/p2-f26-q4-conduction.svg'),'utf8');
    for(const addition of ['<script>alert(1)</script>','<foreignObject/>','<g onload="x"/>','<use href="https://example.com/x.svg"/>'])
      expect(()=>validateConductionSprite(svg.replace('</svg>',addition+'</svg>'),geometry)).toThrow();
    expect(()=>validateConductionSprite('<svg></svg>',geometry)).toThrow();
  });
  test('arbitrary angles cover four intervals without wrapping the cycle-complete view',()=>{
    for(const [index,angle]of [0,30,180,210,360].entries()){
      expect(atCycleAngle(angle).index).toBe(Math.min(index,3));
    }
    for(const angle of [0,15.3,29.9,30,95.7,179.9,180,195.4,209.9,210,270.1,359.999])expect(atCycleAngle(angle)).toEqual(atAngle(angle));
    expect(atCycleAngle(360)).toEqual({phase:360,index:3,v:0,i0:1,v0:0,is1:0,is2:1,id1:1,id2:0,i:-1,vs1:0});
    expect(atAngle(360).index).toBe(0); // Actual periodic switching is unchanged.
    expect(atCycleAngle(-1)).toEqual(atCycleAngle(0));expect(atCycleAngle(361)).toEqual(atCycleAngle(360));
    for(const angle of [NaN,Infinity,-Infinity])expect(()=>atCycleAngle(angle)).toThrow('finite');
  });
  test('the production arithmetic and translated stage order remain in sync with the approved sample',()=>{
    expect(WAVE_KEYS).toEqual(['v','i0','v0','is1','is2','id1','id2','i','vs1']);
    for(const locale of ['en','zh'] as const){
      expect(semiConverterCopy[locale].stages).toHaveLength(4);expect(semiConverterCopy[locale].pairs).toEqual(['D₁ + D₂','S₁ + D₂','D₁ + D₂','S₂ + D₁']);
    }
    expect(CONDUCTION_INTERVALS.map(s=>[s.start,s.end])).toEqual([[0,30],[30,180],[180,210],[210,360]]);
    expect(atAngle(195).vs1).toBeLessThan(0);expect(atAngle(195).i).toBe(0);
  });
});
