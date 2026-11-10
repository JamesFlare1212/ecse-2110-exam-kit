import {atCycleAngle} from './semi-converter-model.mjs';
import {pointOnRoute,type ConductionGeometry,type Point} from './conduction-geometry';
import {waveX} from './converter-wave-scale';

export type WaveKey='v'|'i'|'v0'|'i0'|'is1'|'is2'|'id1'|'id2'|'vs1'|'is3'|'is4';
export type SemiWaveKey=Exclude<WaveKey,'is3'|'is4'>;
export type ConverterValues=Record<WaveKey,number>&{phase:number;index:number};
export interface Signal {key:WaveKey;symbol:string;unit:string;token:string;dash:string;pattern:string;trace:string}
export type Measurement=Signal&({kind:'voltage';pins:Point[];ends:Point[]}|{kind:'current';point:Point;arrow:Point[]});
const samples=[...Array.from({length:721},(_,i)=>i*.5),29.999999,179.999999,209.999999,359.999999].sort((a,b)=>a-b);
export const svgPath=(points:Point[])=>points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
const signal=(key:SemiWaveKey,symbol:string,token:string,pattern='',dash=''):Signal&{key:SemiWaveKey}=>({key,symbol,token:`--measurement-${token}`,unit:key[0]==='v'?'Vₘ':'I₀',pattern,dash,trace:svgPath(samples.map(t=>[waveX(t),15-atCycleAngle(t)[key]*10]))});
const signals={
  v:signal('v','v','voltage'),i:signal('i','i','source-current'),
  v0:signal('v0','v₀','output-voltage'),i0:signal('i0','i₀','load-current'),
  is1:signal('is1','iₛ₁','thyristor-current'),is2:signal('is2','iₛ₂','thyristor-current','dashed','5 3'),
  id1:signal('id1','iᴅ₁','diode-current'),id2:signal('id2','iᴅ₂','diode-current','dashed','5 3'),
  vs1:signal('vs1','vₛ₁','thyristor-voltage','dashdot','8 2 2 2'),
};
export const defaultMeasurements:Record<WaveKey,boolean>={v:true,i:true,v0:true,i0:true,is1:false,is2:false,id1:false,id2:false,vs1:false,is3:false,is4:false};

/** Q4's existing equal-unit drawing coordinates, recovered from the owned sidecar.
 * Probes are annotations, never new connections. S1 voltage is anode minus cathode.
 */
export function conductionMeasurements(geometry:ConductionGeometry):(Measurement&{key:SemiWaveKey})[]{
  const [origin,terminal]=geometry.routes.positive,scale=(terminal[0]-origin[0])/2.8;
  const p=([x,y]:Point):Point=>[origin[0]+(x+1)*scale,origin[1]-(y-3.7)*scale];
  const voltage=(s:Signal&{key:SemiWaveKey},pins:Point[],ends:Point[]):Measurement&{key:SemiWaveKey}=>({...s,kind:'voltage',pins:pins.map(p),ends:ends.map(p)});
  const current=(s:Signal&{key:SemiWaveKey},point:Point,arrow:Point[]):Measurement&{key:SemiWaveKey}=>({...s,kind:'current',point:p(point),arrow:arrow.map(p)});
  return[
    voltage(signals.v,[[-1,3.7],[-1,2.3]],[[-.08,3.7],[-.08,2.3]]),
    current(signals.i,[.65,3.7],[[.15,3.4],[1.05,3.4]]),
    voltage(signals.v0,[[6.6,5.6],[6.6,.4]],[[7.65,5.6],[7.65,.4]]),
    current(signals.i0,[5.55,5.6],[[5.1,5.3],[6.05,5.3]]),
    current(signals.is1,[1.8,5.4],[[1.25,4.25],[1.25,5.15]]),
    current(signals.is2,[1.8,.65],[[1.25,.95],[1.25,1.85]]),
    current(signals.id1,[3.8,5.4],[[4.25,4.25],[4.25,5.15]]),
    current(signals.id2,[3.8,.65],[[4.25,.95],[4.25,1.85]]),
    voltage(signals.vs1,[[1.8,4.2],[1.8,5.2]],[[.92,4.2],[.92,5.2]]),
  ];
}
/** Constant screen-coordinate travel rate, not electron speed or another time model. */
export function currentMarkers(route:Point[],distance:number){
  const length=route.slice(1).reduce((sum,[x,y],i)=>sum+Math.hypot(x-route[i][0],y-route[i][1]),0);
  return[0,1,2,3].map(i=>{
    const fraction=(distance/length+i/4)%1,[x,y]=pointOnRoute(route,fraction),[nx,ny]=pointOnRoute(route,fraction+.001);
    return{fraction,transform:`translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${(Math.atan2(ny-y,nx-x)*180/Math.PI).toFixed(2)})`};
  });
}
