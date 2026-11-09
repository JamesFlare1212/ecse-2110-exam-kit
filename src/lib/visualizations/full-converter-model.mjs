/** Solution-only, ideal four-SCR bridge with established continuous current.
 * Lecture 11–12, PDF p23: left S1/S4, right S3/S2. No freewheel state.
 * Q3's finite 25 mH does NOT override its imposed ripple-free idealization.
 * Q5 uses its exact acos firing angle, not the source's rounded 60 degrees.
 * Voltages are normalized by Vm=sqrt(2)*Vs; currents by mean load current I0.
 * These steady-state switching relationships are not a transient simulation.
 */
const VM = Math.SQRT2 * 120;
const V60 = 2 * VM / Math.PI * Math.cos(Math.PI / 3);
export const FULL_PROFILES = Object.freeze({
  'reversed-emf': Object.freeze({alpha:60,voltageRms:120,frequency:60,current:(V60+11)/1,emf:-11,resistance:1,ripple:false}),
  'ideal-drive': Object.freeze({alpha:Math.acos(55*Math.PI/(2*VM))*180/Math.PI,voltageRms:120,frequency:60,current:5*746/110,emf:55,resistance:0,ripple:false}),
  'ripple-drive': Object.freeze({alpha:60,voltageRms:120,frequency:60,current:20,emf:V60-.25*20,resistance:.25,ripple:true}),
});
/** @typedef {keyof typeof FULL_PROFILES} FullProfileKey */
/** @typedef {{version:1,kind:'representative-current',period:360,mean:20,rippleRms:4,inductance:number,values:readonly number[]}} RippleData */
/** @type {WeakSet<object>} */
const validated = new WeakSet();
const COUNT = 8192;
/** Validate a parsed local JSON dataset before interpolation. Return an immutable
 * owned copy, not the caller's mutable object. No markup or extra fields survive.
 * L is an illustrative model choice, NOT a given recovered from the question.
 * @param {unknown} raw
 * @returns {RippleData}
 */
export function validateRippleData(raw) {
  const fail = () => { throw new TypeError('Invalid representative ripple data'); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail();
  if (validated.has(raw)) return /** @type {RippleData} */ (raw);
  const r = /** @type {Record<string, unknown>} */ (raw);
  if (r.version!==1 || r.kind!=='representative-current' || r.period!==360
      || typeof r.mean!=='number' || !Number.isFinite(r.mean) || Math.abs(r.mean-20)>1e-9
      || typeof r.rippleRms!=='number' || !Number.isFinite(r.rippleRms) || Math.abs(r.rippleRms-4)>1e-9
      || typeof r.inductance!=='number' || !Number.isFinite(r.inductance) || r.inductance<1e-5 || r.inductance>10
      || !Array.isArray(r.values) || r.values.length!==COUNT) return fail();
  const values = [];
  let sum=0, rippleSquares=0;
  for (const value of r.values) {
    // Continuous positive current; a finite absolute bound also guards overlays
    // against pathological data. The authoritative range is about 12–25 A.
    if (typeof value!=='number' || !Number.isFinite(value) || value<=0 || value>80) return fail();
    values.push(value); sum+=value; rippleSquares+=(value-20)**2;
  }
  if (Math.abs(sum/COUNT-20)>1e-6 || Math.abs(Math.sqrt(rippleSquares/COUNT)-4)>1e-6) return fail();
  const safe = Object.freeze({version:/** @type {const} */(1),kind:/** @type {const} */('representative-current'),
    period:/** @type {const} */(360),mean:/** @type {const} */(20),rippleRms:/** @type {const} */(4),
    inductance:r.inductance,values:Object.freeze(values)});
  validated.add(safe);
  return safe;
}

/** Three presentation intervals, not three physical conducting pairs. The first
 * and last are the same negative pair on opposite sides of the display boundary.
 * The separately excited Q6 field is never part of the bridge-current route.
 * @param {number} alpha
 */
export function fullIntervals(alpha) {
  if (!Number.isFinite(alpha) || alpha<=0 || alpha>=180) throw new RangeError('Firing angle must be between 0 and 180 degrees');
  return [
    {index:0,start:0,end:alpha,route:'negative',active:['load','source','S3','S4','bottom-left']},
    {index:1,start:alpha,end:180+alpha,route:'positive',active:['load','source','S1','S2','top-left']},
    {index:2,start:180+alpha,end:360,route:'negative',active:['load','source','S3','S4','bottom-left']},
  ];
}

/** Periodic linear interpolation of the paper renderer's 8192-point FFT RL–emf
 * solution, NOT a new sine curve. Samples are at k*360/8192, without a duplicate
 * endpoint. Interpolation slightly reduces RMS (~1e-6 A). The sampled forcing
 * and analytic switching edges differ by at most one grid cell: integrated
 * analytic-v times interpolated-i differs from the analytic 1084.379579 W by
 * about 0.096 W (<0.01%). Do not present this numerical approximation as an
 * exact ODE solution, or replace power by the product of means (1080.379579 W).
 * @param {number} phase
 * @param {RippleData} data
 */
function rippleCurrent(phase, data) {
  const position = phase / 360 * COUNT;
  const left = Math.floor(position) % COUNT, fraction = position - Math.floor(position);
  return data.values[left]*(1-fraction) + data.values[(left+1)%COUNT]*fraction;
}
/** @param {number} phase @param {FullProfileKey} profileKey @param {unknown} rippleData @param {boolean} closedEnd */
function sample(phase, profileKey, rippleData, closedEnd=false) {
  if (!Object.hasOwn(FULL_PROFILES, profileKey)) throw new RangeError('Unknown full-converter profile');
  const profile = FULL_PROFILES[profileKey];
  const index = closedEnd ? 2 : phase<profile.alpha ? 0 : phase<180+profile.alpha ? 1 : 2;
  const positive = index===1;
  // End of the closed display is explicitly a left limit, not implicit modulo.
  const v = closedEnd ? 0 : Math.sin(phase*Math.PI/180);
  const i0 = profile.ripple ? rippleCurrent(closedEnd ? 0 : phase, validateRippleData(rippleData))/profile.current : 1;
  const is1 = positive ? i0 : 0, is2 = is1;
  const is3 = positive ? 0 : i0, is4 = is3;
  const i = positive ? i0 : -i0;
  return {phase,index,v,i,v0:closedEnd?0:(positive?v:-v),i0,is1,is2,is3,is4};
}
/** Physical periodic helper: phase in [0,360), including negative angles.
 * @param {number} angle @param {FullProfileKey} profileKey @param {unknown} [rippleData]
 */
export function atFullAngle(angle, profileKey, rippleData) {
  if (!Number.isFinite(angle)) throw new RangeError('Angle must be finite');
  // Avoid adding 360 to already-positive phases: it can move an exact firing
  // angle across its half-open boundary through floating-point roundoff.
  const remainder = angle % 360;
  return sample(remainder<0 ? remainder+360 : remainder===0 ? 0 : remainder, profileKey, rippleData);
}
/** Closed one-cycle display: clamp to [0,360], with final interval at 360 left
 * limit. The physical periodic helper intentionally returns index 0 at 360.
 * @param {number} angle @param {FullProfileKey} profileKey @param {unknown} [rippleData]
 */
export function atFullCycleAngle(angle, profileKey, rippleData) {
  if (!Number.isFinite(angle)) throw new RangeError('Angle must be finite');
  const phase = Math.max(0,Math.min(360,angle));
  return sample(phase,profileKey,rippleData,phase===360);
}
