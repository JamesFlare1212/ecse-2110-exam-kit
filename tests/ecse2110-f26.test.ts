import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import katex from 'katex';
import { readQuestionMarkdown } from '../content/markdown';
import { displayEquations } from '../content/text';
import { joinTranslations } from '../content/localization';

const root = resolve(import.meta.dir, '..');
const dir = (locale: string) => resolve(root, 'content', locale, 'exam1_f26');
const read = (locale: string, name: string) => readFileSync(resolve(dir(locale), name), 'utf8');
const article = (locale: string, q: number) => readQuestionMarkdown(read(locale, `questions/q${q}.md`), `q${q}.md`, JSON.parse(read(locale, 'figure-sources.json')));
type C = { re: number; im: number };
const add = (a: C, b: C): C => ({ re: a.re+b.re, im: a.im+b.im });
const mul = (a: C, b: C): C => ({ re: a.re*b.re-a.im*b.im, im: a.re*b.im+a.im*b.re });
const mag = (a: C) => Math.hypot(a.re, a.im);
const angle = (a: C) => Math.atan2(a.im, a.re)*180/Math.PI;

// All inputs below come from visually inspected PDF pages, not from an answer JSON.
describe('ECSE 2110 Exam 1 Fall 2026 scientific regressions', () => {
  test('all six independent language articles pair, total 100 points, and render valid equations', () => {
    const expected = [10, 10, 10, 20, 25, 25];
    for (const locale of ['en', 'zh-cn']) {
      const questions = expected.map((points, i) => {
        const q = article(locale, i+1);
        expect(q.points).toBe(points);
        expect(q.id).toBe(`e1-f26-q${i+1}`);
        expect(q.parts.length).toBe([1, 1, 1, 2, 2, 3][i]);
        for (const part of q.parts) {
          const equations = displayEquations(part.solution);
          expect(equations.at(-1)).toContain('\\boxed{');
          expect(equations.slice(0,-1).every(equation => !equation.includes('\\boxed{'))).toBe(true);
          for (const equation of equations) expect(() => katex.renderToString(equation, { throwOnError: true, displayMode: true, strict: 'error' })).not.toThrow();
        }
        return q;
      });
      expect(questions.reduce((sum, q) => sum+q.points, 0)).toBe(100);
    }
    for (let q=1; q<=6; q++) expect(() => joinTranslations(article('en', q), article('zh-cn', q), `q${q}`)).not.toThrow();
  });

  test('Q1 distinguishes an explanatory even-strain model from a measured core law', () => {
    for (const locale of ['en', 'zh-cn']) {
      const s = article(locale, 1).parts[0].solution;
      expect(s).toContain('kB^2(t)');
      expect(s).toContain('f_{\\mathrm{hum}}\\approx2f');
    }
    for (const phase of [.2, .7, 1.3]) expect(Math.cos(phase)**2).toBeCloseTo(Math.cos(phase+Math.PI)**2, 12);
  });

  test('Q2 double-frequency expression reproduces instantaneous power with peak amplitudes', () => {
    const vm=170, im=12, tv=.4, ti=-.7;
    for (const wt of [0, .17, 1, 2.4, 5.8]) {
      const direct=vm*Math.cos(wt+tv)*im*Math.cos(wt+ti);
      const derived=vm*im/2*(Math.cos(tv-ti)+Math.cos(2*wt+tv+ti));
      expect(derived).toBeCloseTo(direct, 9);
    }
  });

  test('Q3 keeps the qualitative skin-effect caveat and does not prescribe a strand count', () => {
    expect(article('en', 3).parts[0].note).toContain('do not require assuming zero core current');
    expect(article('en', 3).figure).toBeUndefined();
    expect(article('zh-cn', 3).parts[0].note).toContain('不需要假定钢芯完全不导电');
  });

  test('Q4 adds capacitive Q negatively and includes the three-phase current factor', () => {
    const q2=-240*Math.tan(Math.acos(.8));
    const p=60+240+60, q=660+q2;
    expect(q2).toBeCloseTo(-180, 10);
    expect(q).toBeCloseTo(480, 10);
    expect(Math.hypot(p,q)).toBeCloseTo(600, 10);
    expect(p/Math.hypot(p,q)).toBeCloseTo(.6, 12);
    expect(Math.hypot(p,q)*1000/(Math.sqrt(3)*12470)).toBeCloseTo(27.7794836819, 9);
    expect(article('en',4).parts[0].solution).toContain('27.7795');
  });

  test('Q4 Y bank provides 210 kvar, not the remaining 270 kvar, at 60 Hz', () => {
    const qRemain=360e3*Math.tan(Math.acos(.8));
    const qBank=480e3-qRemain;
    const c=qBank/(2*Math.PI*60*12470**2);
    expect(qRemain).toBeCloseTo(270e3, 7);
    expect(qBank).toBeCloseTo(210e3, 7);
    expect(c*1e6).toBeCloseTo(3.5822448669, 9);
    expect(3*(2*Math.PI*60)*c*(12470/Math.sqrt(3))**2).toBeCloseTo(qBank, 7);
    expect(450e3/(Math.sqrt(3)*12470)).toBeCloseTo(20.8346127615, 9);
    for (const locale of ['en','zh-cn']) expect(article(locale,4).parts[1].solution).toContain('3.58224');
  });

  test('Q5 delta-to-Y, source power, and line drop conserve complex power', () => {
    const ry=18/3, load=1/(1/12+1/ry), vp=346.41/Math.sqrt(3);
    const current={ re: vp*load/(load**2+9), im: -vp*3/(load**2+9) };
    const vload=mul(current,{ re: load, im: 0 });
    const sourcePower={ re: 3*vp*current.re, im: -3*vp*current.im };
    expect(load).toBe(4);
    expect(mag(current)).toBeCloseTo(40, 4);
    expect(angle(current)).toBeCloseTo(-36.86989765, 7);
    expect(mag(vload)).toBeCloseTo(160, 3);
    expect(Math.sqrt(3)*mag(vload)).toBeCloseTo(277.128, 3);
    expect(angle(vload)+30).toBeCloseTo(-6.86989765, 7);
    expect(sourcePower.re).toBeCloseTo(19200, 1);
    expect(sourcePower.im).toBeCloseTo(14400, 1);
    const loadPower=3*mag(current)**2*load, lineQ=3*mag(current)**2*3;
    expect(sourcePower.re).toBeCloseTo(loadPower, 8);
    expect(sourcePower.im).toBeCloseTo(lineQ, 8);
    expect(article('en',5).parts[1].note).toContain('volts');
  });

  test('Q6 parameters reconstruct both measured tests on the correct winding sides', () => {
    const rc=220**2/650, ic=220/rc, xm=220/Math.sqrt(9.5**2-ic**2);
    const req=950/55**2, zeq=37.5/55, xeq=Math.sqrt(zeq**2-req**2);
    expect(rc).toBeCloseTo(74.46153846, 7);
    expect(xm).toBeCloseTo(24.36625776, 7);
    expect(Math.hypot(220/rc,220/xm)).toBeCloseTo(9.5, 10);
    expect(220**2/rc).toBeCloseTo(650, 9);
    expect(55*Math.hypot(req,xeq)).toBeCloseTo(37.5, 10);
    expect(55**2*req).toBeCloseTo(950, 9);
    expect(xeq).toBeCloseTo(.6051850049, 9);
    const zbLow=220**2/25000, zbHigh=440**2/25000;
    expect(zbLow).toBe(1.936);
    expect(zbHigh).toBe(7.744);
    expect(req/zbHigh).toBeCloseTo(req*(220/440)**2/zbLow, 12);
    expect(rc/zbLow).toBeCloseTo(38.46153846, 7);
    expect(xm/zbLow).toBeCloseTo(12.58587694, 7);
    expect(req/zbHigh).toBeCloseTo(.0405539239, 10);
    expect(xeq/zbHigh).toBeCloseTo(.0781488901, 10);
    expect(25000/440).not.toBe(55);
    expect((25000/440)**2*req).toBeCloseTo(1013.8480978, 6);
  });

  test('Q6 full-load phasor gives 8.00078 percent and the correct head-to-tail angles', () => {
    const req=950/55**2, xeq=Math.sqrt((37.5/55)**2-req**2), zb=440**2/25000;
    const i={ re: .8, im: -.6 };
    const dr=mul(i,{ re: req/zb, im: 0 }), dx=mul(i,{ re: 0, im: xeq/zb });
    const v=add({ re: 1, im: 0 },add(dr,dx));
    expect(v.re).toBeCloseTo(1.0793324732, 9);
    expect(v.im).toBeCloseTo(.0381867577, 9);
    expect((mag(v)-1)*100).toBeCloseTo(8.00077852, 7);
    expect(angle(v)).toBeCloseTo(2.026278165, 8);
    expect(angle(dr)).toBeCloseTo(-36.86989765, 7);
    expect(angle(dx)).toBeCloseTo(53.13010235, 7);
    for (const locale of ['en','zh-cn']) {
      const q=article(locale,6);
      expect(q.figure).toBeUndefined();
      expect(q.parts[2].figure).toBe('e1-f26-q6-phasor');
      expect(q.parts[1].solution).toContain('8.00078');
      expect(q.parts[0].solutionPage).toBe(14);
      expect(q.parts[2].solutionPage).toBe(15);
    }
  });

  test('both locales preserve separate, real PDFs with hash and 1-based crop provenance', () => {
    for (const locale of ['en','zh-cn']) {
      const docs=JSON.parse(read(locale,'documents.json'));
      expect(docs['e1-f26']).toBeUndefined();
      expect(docs['e1-f26-sol'].pages).toBe(15);
      for (const doc of Object.values(docs) as {pdf:string;sha256:string;sizes:number[][];pages:number}[]) {
        const path=resolve(dir(locale),'assets',doc.pdf);
        expect(statSync(path).isFile()).toBe(true);
        expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(doc.sha256);
        expect(doc.sizes).toHaveLength(doc.pages);
        expect(doc.sizes.every(size=>size[0]===612&&size[1]===792)).toBe(true);
      }
      const figures=JSON.parse(read(locale,'figure-sources.json')).figures;
      expect(Object.values(figures).map((f: any)=>f.page)).toEqual([3,5,7,9,12,14]);
      for (const f of Object.values(figures) as {region:number[]}[]) {
        const [x,y,w,h]=f.region;
        expect(x-.002).toBeGreaterThanOrEqual(0);
        expect(y-.002).toBeGreaterThanOrEqual(0);
        expect(x+w+.002).toBeLessThanOrEqual(1);
        expect(y+h+.002).toBeLessThanOrEqual(1);
      }
    }
    expect(statSync(resolve(dir('en'),'assets/sources/e1-f26-sol.pdf')).ino).not.toBe(statSync(resolve(dir('zh-cn'),'assets/sources/e1-f26-sol.pdf')).ino);
  });
});
