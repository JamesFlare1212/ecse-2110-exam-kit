/** Ideal half-controlled bridge at alpha=30 degrees and established constant
 * load current. Original topology: upper/lower left S1/S2, right D1/D2.
 * Values are normalized by Vm and I0; this is not a transient simulation.
 */
export const CONDUCTION_INTERVALS = [
  {start:0,end:30,active:['load','D1','D2'],route:'freewheel'},
  {start:30,end:180,active:['load','source','S1','D2','top-left'],route:'positive'},
  {start:180,end:210,active:['load','D1','D2'],route:'freewheel'},
  {start:210,end:360,active:['load','source','S2','D1','bottom-left'],route:'negative'},
];
export const WAVE_KEYS = ['v','i0','v0','is1','is2','id1','id2','i','vs1'];
/** @param {number} degrees */
export function atAngle(degrees) {
  if (!Number.isFinite(degrees)) throw new RangeError('Angle must be finite');
  const phase = ((degrees % 360)+360)%360;
  const index = phase<30?0:phase<180?1:phase<210?2:3;
  const v = Math.sin(phase*Math.PI/180);
  const is1 = Number(index===1), is2 = Number(index===3);
  const i = is1-is2;
  return {phase,index,v,i0:1,v0:i*v,is1,is2,id1:1-is1,id2:1-is2,i,vs1:is1?0:v};
}
/** One-cycle presentation: keep 360° at the last interval's left-hand limit.
 * The periodic physical model above still switches to freewheeling at 360°.
 * @param {number} degrees
 */
export function atCycleAngle(degrees) {
  if (!Number.isFinite(degrees)) throw new RangeError('Angle must be finite');
  const phase=Math.max(0,Math.min(360,degrees));
  if(phase===360)return {phase,index:3,v:0,i0:1,v0:0,is1:0,is2:1,id1:1,id2:0,i:-1,vs1:0};
  return atAngle(phase);
}
