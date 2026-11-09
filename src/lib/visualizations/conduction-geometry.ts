export const CONDUCTION_KEYS = ['load','source','S1','S2','D1','D2','top-left','bottom-left'] as const;
export const ROUTE_KEYS = ['freewheel','positive','negative'] as const;
export type ConductionKey = typeof CONDUCTION_KEYS[number];
export type RouteKey = typeof ROUTE_KEYS[number];
export type Point = [number,number];
export interface ConductionGeometry {
  version: 1;
  viewBox: [number,number,number,number];
  parts: {id:string;key:ConductionKey;label:boolean}[];
  routes: Record<RouteKey,Point[]>;
}
const record = (v:unknown):v is Record<string,unknown> => Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const finite = (v:unknown):v is number => typeof v==='number'&&Number.isFinite(v);
/** JSON is geometry only, never interpreted as markup or executable code. */
export function parseConductionGeometry(raw:unknown):ConductionGeometry {
  const fail=():never=>{throw new Error('Invalid conduction geometry');};
  if(!record(raw)||raw.version!==1) return fail();
  const box=raw.viewBox;
  if(!Array.isArray(box)||box.length!==4||!box.every(finite)||box[0]!==0||box[1]!==0||box[2]<=0||box[3]<=0||box[2]>8192||box[3]>8192)return fail();
  if(!Array.isArray(raw.parts)||raw.parts.length<8||raw.parts.length>256)return fail();
  const ids=new Set<string>(),keys=new Set<string>();
  for(const part of raw.parts){
    if(!record(part)||typeof part.id!=='string'||!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(part.id)||ids.has(part.id)
      ||!CONDUCTION_KEYS.includes(part.key as ConductionKey)||typeof part.label!=='boolean')return fail();
    ids.add(part.id);keys.add(part.key as string);
  }
  if(CONDUCTION_KEYS.some(key=>!keys.has(key))||!record(raw.routes))return fail();
  for(const key of ROUTE_KEYS){
    const points=raw.routes[key];
    if(!Array.isArray(points)||points.length<2||points.length>128)return fail();
    for(const point of points)if(!Array.isArray(point)||point.length!==2||!point.every(finite)
      ||point[0]<-.01||point[1]<-.01||point[0]>box[2]+.01||point[1]>box[3]+.01)return fail();
    if(points.every(point=>point[0]===points[0][0]&&point[1]===points[0][1]))return fail();
    if(Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])>1e-6)return fail();
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
