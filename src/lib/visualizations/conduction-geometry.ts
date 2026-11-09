export const CONDUCTION_KEYS = ['load','source','S1','S2','D1','D2','top-left','bottom-left'] as const;
export const ROUTE_KEYS = ['freewheel','positive','negative'] as const;
export const FULL_CONDUCTION_KEYS = ['load','source','S1','S2','S3','S4','top-left','bottom-left','field'] as const;
export type ConductionKey = typeof CONDUCTION_KEYS[number] | typeof FULL_CONDUCTION_KEYS[number];
export type RouteKey = typeof ROUTE_KEYS[number];
export type Point = [number,number];
export type FullWaveKey='v'|'i'|'v0'|'i0'|'is1'|'is2'|'is3'|'is4';
export type ProbeGeometry={key:FullWaveKey}&({kind:'voltage';pins:Point[];ends:Point[]}|{kind:'current';point:Point;arrow:Point[]});
interface CircuitGeometry {
  viewBox: [number,number,number,number];
  parts: {id:string;key:ConductionKey;label:boolean}[];
}
export type ConductionGeometry=(CircuitGeometry&{version:1;routes:Record<RouteKey,Point[]>})
  |(CircuitGeometry&{version:2;topology:'full-converter';routes:Record<'positive'|'negative',Point[]>;probes:ProbeGeometry[]});
export function conductionRoute(geometry:ConductionGeometry,route:RouteKey):Point[]{
  if(route==='freewheel'){if(geometry.version!==1)throw new Error('Full converters have no diode-freewheel route');return geometry.routes.freewheel;}
  return geometry.routes[route];
}
const record = (v:unknown):v is Record<string,unknown> => Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const finite = (v:unknown):v is number => typeof v==='number'&&Number.isFinite(v);
/** JSON is geometry only, never interpreted as markup or executable code. */
export function parseConductionGeometry(raw:unknown):ConductionGeometry {
  const fail=():never=>{throw new Error('Invalid conduction geometry');};
  if(!record(raw)||(raw.version!==1&&raw.version!==2)) return fail();
  const full=raw.version===2;
  if(full&&raw.topology!=='full-converter')return fail();
  const box=raw.viewBox;
  if(!Array.isArray(box)||box.length!==4||!box.every(finite)||box[0]!==0||box[1]!==0||box[2]<=0||box[3]<=0||box[2]>8192||box[3]>8192)return fail();
  if(!Array.isArray(raw.parts)||raw.parts.length<8||raw.parts.length>256)return fail();
  const ids=new Set<string>(),keys=new Set<string>();
  for(const part of raw.parts){
    if(!record(part)||typeof part.id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(part.id)||ids.has(part.id)
      ||!(full?FULL_CONDUCTION_KEYS:CONDUCTION_KEYS).some(key=>key===part.key)||typeof part.label!=='boolean')return fail();
    ids.add(part.id);keys.add(part.key as string);
  }
  const required=full?FULL_CONDUCTION_KEYS.filter(key=>key!=='field'):CONDUCTION_KEYS;
  if(required.some(key=>!keys.has(key))||!record(raw.routes))return fail();
  const routes=full?['positive','negative'] as const:ROUTE_KEYS;
  if(Object.keys(raw.routes).some(key=>!routes.some(expected=>expected===key)))return fail();
  const point=(p:unknown):p is Point=>Array.isArray(p)&&p.length===2&&p.every(finite)&&p[0]>=-.01&&p[1]>=-.01&&p[0]<=box[2]+.01&&p[1]<=box[3]+.01;
  for(const key of routes){
    const points=raw.routes[key];
    if(!Array.isArray(points)||points.length<2||points.length>128)return fail();
    for(const p of points)if(!point(p))return fail();
    if(points.every(point=>point[0]===points[0][0]&&point[1]===points[0][1]))return fail();
    if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])>1e-6)return fail();
  }
  if(full){
    const expected=['v','i','v0','i0','is1','is2','is3','is4'],seen=new Set<string>();
    if(!Array.isArray(raw.probes)||raw.probes.length!==expected.length)return fail();
    for(const probe of raw.probes){
      if(!record(probe)||typeof probe.key!=='string'||!expected.includes(probe.key)||seen.has(probe.key))return fail();seen.add(probe.key);
      if(probe.kind==='voltage'){if(!['v','v0'].includes(probe.key)||!Array.isArray(probe.pins)||probe.pins.length!==2||!probe.pins.every(point)||!Array.isArray(probe.ends)||probe.ends.length!==2||!probe.ends.every(point))return fail();}
      else if(probe.kind==='current'){if(['v','v0'].includes(probe.key)||!point(probe.point)||!Array.isArray(probe.arrow)||probe.arrow.length!==2||!probe.arrow.every(point))return fail();}
      else return fail();
    }
  }
  return raw as unknown as ConductionGeometry;
}
/** Validate our checked-in SVG sprite without ever injecting it into the DOM. */
export function validateConductionSprite(svg:string,geometry:ConductionGeometry):void {
  if(!/<svg\b/.test(svg)||/<(?:script|foreignObject)\b/i.test(svg)||/\son[a-z]+\s*=/i.test(svg)
    ||/(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)/i.test(svg)||/url\(\s*["']?(?:https?:|\/\/)/i.test(svg)
    ||geometry.parts.some(part=>!new RegExp(`\\bid=["']${part.id}["']`).test(svg)))throw new Error('Invalid conduction sprite');
}
/** A visual conventional-current marker, not an electron or a physical speed. */
export function pointOnRoute(points:Point[],fraction:number):Point {
  const lengths=points.slice(1).map(([x,y],i)=>Math.hypot(x-points[i][0],y-points[i][1]));
  const total=lengths.reduce((a,b)=>a+b,0);
  if(!total)return points[0];
  let distance=((fraction%1)+1)%1*total;
  for(let i=0;i<lengths.length;i++){
    if(distance<=lengths[i]&&lengths[i]>0){const p=distance/lengths[i];return[points[i][0]+p*(points[i+1][0]-points[i][0]),points[i][1]+p*(points[i+1][1]-points[i][1])];}
    distance-=lengths[i];
  }
  return points.at(-1)!;
}
