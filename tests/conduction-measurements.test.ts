import {describe,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {conductionMeasurements,currentMarkers,defaultMeasurements,svgPath} from '../src/lib/visualizations/conduction-measurements';
import {parseConductionGeometry,pointOnRoute} from '../src/lib/visualizations/conduction-geometry';
import {semiConverterCopy} from '../src/lib/visualizations/semi-converter-copy';
import {papers} from '../content/catalog.server';
const paper=papers.find(p=>p.exam.id==='p2-f26');
describe.skipIf(!paper)('linked conduction measurements',()=>{
  const geometry=()=>parseConductionGeometry(JSON.parse(readFileSync(`${paper!.directories.en}/assets/figures/p2-f26-q4-conduction.json`,'utf8')));
  test('nine stable measurement identities, four defaults and complete localized references',()=>{
    const rows=conductionMeasurements(geometry());
    expect(rows.map(m=>m.key)).toEqual(['v','i','v0','i0','is1','is2','id1','id2','vs1']);
    expect(Object.keys(defaultMeasurements).filter(key=>defaultMeasurements[key as keyof typeof defaultMeasurements])).toEqual(['v','i','v0','i0']);
    for(const m of rows){
      expect(m.trace.match(/\b[ML]/g)?.length).toBe(725);expect(m.trace).not.toMatch(/NaN|Infinity/);
      for(const locale of ['en','zh'] as const){expect(semiConverterCopy[locale].measurements[m.key].name.length).toBeGreaterThan(0);expect(semiConverterCopy[locale].measurements[m.key].reference.length).toBeGreaterThan(0);}
      const points=m.kind==='voltage'?[...m.pins,...m.ends]:[m.point,...m.arrow];
      for(const [x,y]of points){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThan(geometry().viewBox[2]);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThan(geometry().viewBox[3]);}
    }
  });
  test('voltage polarity, current references and paired styles follow the approved source',()=>{
    const rows=conductionMeasurements(geometry()),s1=rows.find(m=>m.key==='vs1')!,supply=rows.find(m=>m.key==='v')!,current=rows.find(m=>m.key==='i')!;
    if(s1.kind!=='voltage'||supply.kind!=='voltage'||current.kind!=='current')throw new Error('Wrong measurement kind');
    expect(s1.pins[0][1]).toBeGreaterThan(s1.pins[1][1]);expect(supply.pins[0][1]).toBeLessThan(supply.pins[1][1]);
    expect(current.arrow[0][0]).toBeLessThan(current.arrow[1][0]);expect(s1.dash).toBe('8 2 2 2');
    for(const pair of [['is1','is2'],['id1','id2']]){const [a,b]=pair.map(key=>rows.find(m=>m.key===key)!);expect(a.token).toBe(b.token);expect(a.dash).toBe('');expect(b.dash).toBe('5 3');}
    expect(svgPath([[1,2],[3,4]])).toBe('M1.000,2.000 L3.000,4.000');
  });
  test('four moving arrows stay on each original closed route with route-independent travel speed',()=>{
    for(const route of Object.values(geometry().routes))for(const distance of [0,90,135,9999]){
      const markers=currentMarkers(route,distance);expect(markers).toHaveLength(4);
      const length=route.slice(1).reduce((sum,[x,y],i)=>sum+Math.hypot(x-route[i][0],y-route[i][1]),0);
      expect(markers[0].fraction).toBeCloseTo((distance/length)%1,12);
      for(const marker of markers){const [x,y]=marker.transform.match(/-?\d+(?:\.\d+)?/g)!.map(Number),point=pointOnRoute(route,marker.fraction);expect(x).toBeCloseTo(point[0],2);expect(y).toBeCloseTo(point[1],2);expect(marker.transform).not.toMatch(/NaN|Infinity/);}
    }
  });
});
