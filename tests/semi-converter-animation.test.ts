import {describe, expect, test} from 'bun:test';
import {atAngle, STAGES, ROWS} from '../scripts/samples/semi_converter_model.mjs';

describe('isolated half-controlled bridge step-animation model', () => {
  test('uses the original diode-leg order and exact half-open switching boundaries', () => {
    for (const [angle,index] of [[0,0],[29.999,0],[30,1],[179.999,1],[180,2],[209.999,2],[210,3],[359.999,3],[360,0],[720,0]]) {
      expect(atAngle(angle).index).toBe(index);
    }
    expect(STAGES.map(s => s.pair)).toEqual(['D₁ + D₂','S₁ + D₂','D₁ + D₂','S₂ + D₁']);
    expect(ROWS).toHaveLength(9);
  });
  test('device currents satisfy KCL and signed source power throughout a cycle', () => {
    for (let angle=0;angle<=720;angle+=.5) {
      const s=atAngle(angle);
      expect(s.is1+s.id1).toBe(s.i0);
      expect(s.is2+s.id2).toBe(s.i0);
      expect(s.i).toBe(s.is1-s.is2);
      expect(s.v0*s.i0).toBeCloseTo(s.v*s.i,12);
      expect(s.v0).toBeGreaterThanOrEqual(-1e-14);
      expect(s.vs1).toBeCloseTo(s.is1?0:s.v,12);
    }
  });
  test('S1 reverse voltage starts at 180 degrees, not at the 210 degree firing', () => {
    const s=atAngle(195);
    expect(s.index).toBe(2);expect(s.i).toBe(0);expect(s.id1).toBe(1);expect(s.id2).toBe(1);
    expect(s.vs1).toBeLessThan(0);expect(s.vs1).toBeCloseTo(Math.sin(195*Math.PI/180),12);
  });
  test('the average normalized voltage is (1+cos alpha)/pi, not the full-converter result', () => {
    const n=360000;let integral=0;
    for(let i=0;i<n;i++)integral+=atAngle((i+.5)*360/n).v0;
    expect(integral/n).toBeCloseTo((1+Math.cos(Math.PI/6))/Math.PI,6);
  });
  test('periodicity includes negative angles; nonfinite input is rejected', () => {
    for(const angle of [15,60,195,270]) expect(atAngle(angle-360)).toEqual(atAngle(angle));
    expect(()=>atAngle(NaN)).toThrow('finite');expect(()=>atAngle(Infinity)).toThrow('finite');
  });
});
