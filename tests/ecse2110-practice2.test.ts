import {describe, expect, test} from 'bun:test';
import {semanticMarkdown} from './fixtures/semantic-markdown';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {expectIndependentPageImages, expectPaperSourceMetadata} from './fixtures/paper-provenance';
import {readQuestionMarkdown} from '../content/markdown';
import {displayEquations, formulaReferences} from '../content/text';

const root = resolve(import.meta.dir, '..');
const directory = (locale: string) => resolve(root, 'content', locale, 'practice2_f26');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const article = (locale: string, n: number) => {
  const path = resolve(directory(locale), `questions/q${n}.md`);
  return readQuestionMarkdown(readFileSync(path, 'utf8'), path,
    json(resolve(directory(locale), 'figure-sources.json')));
};
const last = (locale: string, n: number, part: number) =>
  displayEquations(article(locale, n).parts[part].solution).at(-1)!;
const locales = ['en', 'zh-cn'];

describe('ECSE 2110 Practice Set 2', () => {
  test('packages six distinct prompts and 22 requests without inventing marks', () => {
    for (const locale of locales) {
      const paper = json(resolve(directory(locale), 'paper.json'));
      expect(paper).toMatchObject({id: 'p2-f26', number: 2, kind: 'practice', year: 2026,
        points: 0, doc: 'p2-f26-sol', solutionDoc: 'p2-f26-sol', questionsOnly: false});
      expect(readdirSync(resolve(directory(locale), 'questions')).sort())
        .toEqual(['q1.md', 'q2.md', 'q3.md', 'q4.md', 'q5.md', 'q6.md']);
      const questions = [1, 2, 3, 4, 5, 6].map(n => article(locale, n));
      expect(questions.map(q => q.parts.length)).toEqual([1, 3, 5, 4, 5, 4]);
      expect(questions.reduce((total, q) => total + q.parts.length, 0)).toBe(22);
      expect(questions.every(q => q.points === 0 && q.parts.every(p => p.points === 0))).toBe(true);
      expect(questions[4].parts.map(p => p.label)).toEqual(['a', 'b(i)', 'b(ii)', 'b(iii)', 'b(iv)']);
      expect(questions.map(q => q.originalFigure?.page)).toEqual([1, 2, 4, 5, 7, 9]);
      expect(questions[1].parts[2].solutionPage).toBe(3);
      expect(questions[4].parts[4].solutionPage).toBe(8);
      expect(questions[5].parts[3].solutionPage).toBe(10);
    }
  });

  test('uses only the two authentic prompt diagrams; requested drawings stay in solutions', () => {
    for (const locale of locales) {
      const questions = [1, 2, 3, 4, 5, 6].map(n => article(locale, n));
      expect(questions.filter(q => q.figure).map(q => q.id)).toEqual(['p2-f26-q4', 'p2-f26-q6']);
      expect(questions.every(q => q.parts.every(p => !p.questionFigure))).toBe(true);
      expect(questions[0].parts[0].figure).toBe('p2-f26-q1-armature');
      expect(questions[3].parts[0].figure).toBe('p2-f26-q4-waveforms');
      expect(questions[4].parts[0].figure).toBe('p2-f26-q5-circuit');
      expect(questions[4].parts[4].figure).toBe('p2-f26-q5-waveforms');
      expect(questions[5].parts[0].figure).toBe('p2-f26-q6-waveforms');
      const manifest = json(resolve(directory(locale), 'assets/figures/manifest.json'));
      const svgs = readdirSync(resolve(directory(locale), 'assets/figures')).filter(n => n.endsWith('.svg') && !(manifest.auxiliaryAssets ?? []).includes(n));
      expect(svgs.length).toBe(16); // eight mounted static figures, including the solution-only Q3 fallback; auxiliary sprites are separate
      for (const n of [1, 2, 3, 5]) expect(svgs).not.toContain(`p2-f26-q${n}.svg`);
      const sources = json(resolve(directory(locale), 'figure-sources.json')).figures;
      expect(Object.keys(sources).length).toBe(6); // prompt references survive figure:null
      for (const [id, s] of Object.entries(sources) as [string, any][]) {
        const [x, y, w, h] = s.region;
        expect(x - .002).toBeGreaterThanOrEqual(0);
        expect(y - .002).toBeGreaterThanOrEqual(0);
        expect(x + w + .002).toBeLessThanOrEqual(1);
        expect(y + h + .002).toBeLessThanOrEqual(1);
        if (id === 'p2-f26-q4' || id === 'p2-f26-q6') {
          expect(statSync(resolve(directory(locale), `assets/original-figures/${id}.webp`)).size).toBeGreaterThan(1000);
        }
      }
    }
  });

  test('retains ten-page source provenance metadata and independent locale page images', () => {
    for (const locale of locales) {
      const doc = json(resolve(directory(locale), 'documents.json'))['p2-f26-sol'];
      expect(doc.pages).toBe(10);
      expect(doc.sizes).toEqual(Array.from({length: 10}, () => [612, 792]));
      expectPaperSourceMetadata(doc, 'p2-f26-sol');
      expect(doc.sha256).toBe('5b823f8d4fdeaf2b421e58825cc58194def4fb49e68e50d4ec978af7081f5c36');
      expect(readdirSync(resolve(directory(locale), 'assets/pages/p2-f26-sol')).length).toBe(10);
      expect(readFileSync(resolve(directory(locale), 'extracted/p2-f26-sol.txt'), 'utf8')).toContain('Page 10 of 13');
    }
    expectIndependentPageImages(locales.map(directory), 'p2-f26-sol', 10);
  });

  test('preserves source givens, editorial numbering, ambiguities and complete independent solutions', () => {
    expect(article('en', 1).statement).toStartWith('A permanent magnet dc motor');
    expect(article('en', 3).statement).toContain('as shown in Fig. 10.21');
    expect(article('en', 6).statement).toContain('ripple current is $20\\%$');
    const allowed = new Set(['synchronous-speed', 'generated-voltage', 'generator-current', 'power-angle',
      'generator-reactive', 'mechanical-power', 'dc-emf', 'dc-torque', 'rectifier-half',
      'rectifier-controlled-half', 'rectifier-full', 'buck', 'boost']);
    for (let n = 1; n <= 6; n++) {
      const en = article('en', n), zh = article('zh-cn', n);
      expect(en.givens).toEqual(zh.givens);
      expect(en.parts.map(p => p.id)).toEqual(zh.parts.map(p => p.id));
      expect(en.statement).not.toBe(zh.statement);
      expect(en.guide).not.toBe(zh.guide);
      for (const q of [en, zh]) {
        expect(q.note).toBeTruthy();
        expect(q.title).not.toMatch(/^\d+\.\d+/);
        expect(q.statement).not.toMatch(/^\d+\.\d+/);
        expect(q.note).not.toContain('4.30');
        for (const part of q.parts) {
          const equations = displayEquations(part.solution);
          expect(equations.length).toBeGreaterThanOrEqual(2);
          expect(equations.at(-1)).toContain('\\boxed');
          expect(equations.slice(0, -1).every(e => !e.includes('\\boxed'))).toBe(true);
          expect(formulaReferences(part.solution).every(id => allowed.has(id))).toBe(true);
        }
      }
    }
    for (const locale of locales) {
      expect(semanticMarkdown(article(locale, 2).note!)).toContain(semanticMarkdown('60 kVA'));
      expect(article(locale, 4).parts[0].note).toBeTruthy();
      expect(article(locale, 5).parts[3].note).toContain('0.458333');
      expect(article(locale, 6).parts[3].note).toContain('1084.379579');
    }
  });

  test('explains armature KVL with motor polarities and a solution-only circuit in both languages', () => {
    const voltage = 200, resistance = .2, current = 25;
    const drop = current * resistance, backEmf = voltage - drop;
    expect(drop).toBe(5);
    expect(backEmf).toBe(195);
    // Clockwise: source rise, resistive drop, internal-emf drop, ideal return.
    expect(voltage - drop - backEmf).toBe(0);
    expect(voltage * current).toBe(current ** 2 * resistance + backEmf * current);
    for (const locale of locales) {
      const question = article(locale, 1), part = question.parts[0];
      expect(question.figure).toBeUndefined();
      expect(part.figure).toBe('p2-f26-q1-armature');
      expect(part.questionFigure).toBeUndefined();
      expect(formulaReferences(part.solution)).toEqual(['dc-torque', 'dc-emf']);
      expect(part.solution).toContain('+V-I_aR_a-E_a=0');
      expect(part.solution).toContain('I_aR_a&=25(0.2)=5');
      expect(part.solution).toContain('E_a&=200-5=195');
      expect(question.note).toContain(locale === 'en' ? 'no prompt diagram' : '原题没有图');
      for (const suffix of ['', '-dark']) {
        const svg = readFileSync(resolve(directory(locale), `assets/figures/${part.figure}${suffix}.svg`), 'utf8');
        for (const label of locale === 'en' ? ['DC supply', 'Back emf', 'Clockwise'] : ['直流电源', '反电动势', '顺时针'])
          expect(svg).toContain(`>${label}</text>`);
      }
      const review = json(resolve(directory(locale), 'extracted/source-review.json'));
      expect(review.questions[0].printedLabel).toBe('4.30'); // source provenance is not rewritten
    }
  });

  test('derives the lagging generator current angle and the 0.6 imaginary factor before substitution', () => {
    const theta = Math.acos(.8);
    expect(theta * 180 / Math.PI).toBeCloseTo(36.869898, 6);
    expect(Math.sqrt(1 - .8 ** 2)).toBeCloseTo(.6, 12);
    expect(Math.cos(-theta)).toBeCloseTo(.8, 12);
    expect(Math.sin(-theta)).toBeCloseTo(-.6, 12);
    for (const locale of locales) {
      const working = displayEquations(article(locale, 2).parts[0].solution)[1];
      expect(working).toContain('\\mathrm V,\\qquad |I_a|=');
      expect(working).toContain('\\theta&=\\cos^{-1}(0.8)\\approx36.869898^\\circ');
      expect(working).toContain('\\sin\\theta=\\sqrt{1-0.8^2}=0.6');
      const trigonometric = working.indexOf('499.870363[\\cos(-\\theta)+j\\sin(-\\theta)]');
      const rectangular = working.indexOf('499.870363(0.8-j0.6)');
      expect(trigonometric).toBeGreaterThan(working.indexOf('\\sqrt{1-0.8^2}=0.6'));
      expect(rectangular).toBeGreaterThan(trigonometric);
    }
  });

  test('PM motor calibration and unrounded generator phasors satisfy their governing equations', () => {
    const coupling = 10 / 10;
    const current = 25 / coupling;
    const omega = (200 - current * .2) / coupling;
    expect(omega * 60 / (2 * Math.PI)).toBeCloseTo(1862.112834, 5);
    const v = 69300 / Math.sqrt(3), rated = 60e6 / (3 * v);
    const er = v + 15 * rated * .6, ei = 15 * rated * .8;
    expect(Math.hypot(er, ei)).toBeCloseTo(44911.589099, 5);
    expect(Math.atan2(ei, er) * 180 / Math.PI).toBeCloseTo(7.675427510, 8);
    expect(3 * 36000 * v / 15).toBeCloseTo(288074690.3148557, 5);
    const delta = Math.asin(48e6 * 15 / (3 * 46000 * v));
    const ir = 46000 * Math.sin(delta) / 15;
    const ii = (v - 46000 * Math.cos(delta)) / 15;
    expect(3 * v * ir).toBeCloseTo(48e6, 6);
    expect(ii).toBeLessThan(0);
    expect(Math.hypot(ir, ii)).toBeCloseTo(546.935064, 6);
    expect(ir / Math.hypot(ir, ii)).toBeCloseTo(.731158626538, 10);
    for (const locale of locales) {
      expect(last(locale, 1, 0)).toContain('1862.11');
      expect(last(locale, 2, 0)).toContain('44.911589');
      expect(last(locale, 2, 1)).toContain('288.074690');
      expect(last(locale, 2, 2)).toContain('546.935064');
      expect(last(locale, 2, 2)).toContain('0.731159');
    }
  });

  test('reversed-emf full converter sends both source powers to armature heating', () => {
    const voltage = 2 * Math.sqrt(2) * 120 / Math.PI * Math.cos(Math.PI / 3);
    const current = voltage + 11;
    const machine = 11 * current, supply = voltage * current;
    expect(machine).toBeCloseTo(715.208768664, 8);
    expect(supply + machine).toBeCloseTo(current ** 2, 8);
    expect(voltage / 120).toBeCloseTo(.450158158079, 10);
    for (const locale of locales) {
      expect(last(locale, 3, 0)).toContain('65.018979');
      expect(last(locale, 3, 1)).toContain('715.208769');
      expect(last(locale, 3, 2)).toContain('3512.258858');
      expect(last(locale, 3, 3)).toContain('4227.467626');
      expect(last(locale, 3, 4)).toContain('0.450158');
    }
  });

  test('semi-converter integration includes freewheeling, RMS duty and correct diode paths', () => {
    const n = 120000, step = 2 * Math.PI / n, alpha = Math.PI / 2;
    const vm = Math.sqrt(2) * 208;
    let mean = 0, meanSquareDuty = 0;
    for (let k = 0; k < n; k++) {
      const t = (k + .5) * step;
      const positive = t >= alpha && t < Math.PI;
      const negative = t >= Math.PI + alpha;
      mean += (positive ? vm * Math.sin(t) : negative ? -vm * Math.sin(t) : 0) / n;
      meanSquareDuty += (positive || negative ? 1 : 0) / n;
    }
    const current = mean / 10, rms = current * Math.sqrt(meanSquareDuty);
    expect(mean).toBeCloseTo(93.632896880, 6);
    expect(current).toBeCloseTo(9.363289688, 7);
    expect(rms).toBeCloseTo(6.620845633, 7);
    expect(current ** 2 * 10 / (208 * rms)).toBeCloseTo(2 / Math.PI, 9);
    for (const locale of locales) {
      const solution = article(locale, 4).parts[0].solution;
      expect(solution).toContain('S_1,D_2');
      expect(solution).toContain('S_2,D_1');
      expect(solution).toContain('v_{s1}');
      expect(last(locale, 4, 1)).toContain('0.636620');
    }
  });

  test('ideal rated-current drive distinguishes true PF from displacement factor', () => {
    const current = 5 * 746 / 110;
    const cosine = 55 / (2 * Math.sqrt(2) * 120 / Math.PI);
    expect(Math.acos(cosine) * 180 / Math.PI).toBeCloseTo(59.397409173, 8);
    expect(current / Math.sqrt(2)).toBeCloseTo(23.977348126, 8);
    expect(55 / 120).toBeCloseTo(.458333333333, 10);
    expect(2 * Math.sqrt(2) / Math.PI * cosine).toBeCloseTo(55 / 120, 12);
    for (const locale of locales) {
      expect(last(locale, 5, 1)).toContain('59.397409');
      expect(last(locale, 5, 2)).toContain('23.977348');
      expect(last(locale, 5, 3)).toContain('0.458333');
    }
  });

  test('ripple heating uses total RMS current and preserves mean power conservation', () => {
    const voltage = 2 * Math.sqrt(2) * 120 / Math.PI * .5;
    const emf = voltage - .25 * 20;
    const rmsSquared = 20 ** 2 + (.2 * 20) ** 2;
    const copper = .25 * rmsSquared, developed = emf * 20;
    const realPower = copper + developed;
    expect(emf / .1).toBeCloseTo(490.189789694, 8);
    expect(copper).toBe(104);
    expect(developed).toBeCloseTo(980.379579389, 8);
    expect(realPower - voltage * 20).toBeCloseTo(4, 10);
    expect(realPower / (120 * Math.sqrt(rmsSquared))).toBeCloseTo(.443050691943, 10);
    for (const locale of locales) {
      expect(last(locale, 6, 1)).toContain('490.189790');
      expect(last(locale, 6, 2)).toContain('104.000000');
      expect(last(locale, 6, 2)).toContain('980.379579');
      expect(last(locale, 6, 3)).toContain('0.443051');
    }
  });
});
