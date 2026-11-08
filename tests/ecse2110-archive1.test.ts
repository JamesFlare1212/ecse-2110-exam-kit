import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expectIndependentPageImages, expectPaperSourceMetadata } from './fixtures/paper-provenance';
import { readQuestionMarkdown, type ArticleProblem } from '../content/markdown';
import { displayEquations, formulaReferences } from '../content/text';
import { joinTranslations } from '../content/localization';
import { parseContent } from '../content/schema';
import type { Exam, InOneLanguage, SourceDocument } from '../content/types';

type Complex = [number, number];
const add = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: Complex, b: Complex): Complex => mul(a, [b[0] / (b[0] ** 2 + b[1] ** 2), -b[1] / (b[0] ** 2 + b[1] ** 2)]);
const polar = (r: number, degrees: number): Complex => [r * Math.cos(degrees * Math.PI / 180), r * Math.sin(degrees * Math.PI / 180)];
const magnitude = (a: Complex) => Math.hypot(...a);
const angle = (a: Complex) => Math.atan2(a[1], a[0]) * 180 / Math.PI;
const sum = (values: Complex[]) => values.reduce(add, [0, 0]);
const closeComplex = (a: Complex, b: Complex) => { expect(a[0]).toBeCloseTo(b[0], 9); expect(a[1]).toBeCloseTo(b[1], 9); };
const root = resolve(import.meta.dir, '..');
const base = (locale: string) => resolve(import.meta.dir, '../content', locale, 'exam1_s25');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const local = (locale: string): InOneLanguage<Exam> => {
  const folder = base(locale);
  const sources = json(resolve(folder, 'figure-sources.json'));
  return { ...json(resolve(folder, 'paper.json')), problems: Array.from({ length: 6 }, (_, i) => {
    const path = resolve(folder, `questions/q${i + 1}.md`);
    return readQuestionMarkdown(readFileSync(path, 'utf8'), path, sources);
  }) };
};
const en = local('en'), zh = local('zh-cn');
const q = (number: number, locale = en) => locale.problems[number - 1] as ArticleProblem;
const final = (number: number, part: number, locale = en) => displayEquations(q(number, locale).parts[part].solution).at(-1)!;

// Recompute source-specific physics, then tie it to each locale's authored result.
describe('ECSE 2110 historical Exam 1', () => {
  test('preserves conflicting cover labels, all printed scores, and combined-PDF provenance', () => {
    expect(en.id).toBe('e1-s25'); expect(en.year).toBe(2025);
    expect(en.term).toBe('Cover date · conflicting labels'); expect(zh.term).toBe('封面日期 · 年份标注冲突');
    expect(en.problems.map(p => p.points)).toEqual([10, 20, 20, 20, 20, 30]);
    expect(en.points).toBe(120); expect(en.doc).toBe('e1-s25-sol');
    expect(en.solutionDoc).toBe(en.doc); expect(en.questionsOnly).toBe(false);
    expect(q(1).note).toContain('June 16, 2025'); expect(q(1).note).toContain('Summer 2024');
    expect(q(1).note).toContain('100 points'); expect(q(1, zh).note).toContain('120');
    for (const locale of ['en', 'zh-cn']) {
      const doc = json(resolve(base(locale), 'documents.json'))['e1-s25-sol'];
      expect(doc.pages).toBe(14); expect(doc.sizes).toEqual(Array.from({ length: 14 }, () => [612, 792]));
      expectPaperSourceMetadata(doc, 'e1-s25-sol');
      expect(doc.sha256).toBe('c73b0b4384f86d048146ec6f74d33824677673b5af89d7b6c068aeccf3634cce');
    }
    expectIndependentPageImages(['en', 'zh-cn'].map(base), 'e1-s25-sol', 14);
  });

  test('pairs complete independent solutions, valid lecture pages, and measured source regions', () => {
    const exam = joinTranslations<Exam>(en, zh, 'exam1_s25');
    const sourceDocs = json(resolve(base('en'), 'documents.json')) as Record<string, SourceDocument>;
    const docs = { ...json(resolve(import.meta.dir, '../content/documents.json')), ...Object.fromEntries(Object.entries(sourceDocs).map(([id, doc]) => [id, { ...doc, pdf: `/papers/en/exam1_s25/${doc.pdf}`, pageBase: `/papers/en/exam1_s25/${doc.pageBase}` }])) } as Record<string, SourceDocument>;
    expect(parseContent([exam], json(resolve(root, 'content/formulas.json')), docs).exams[0].problems).toHaveLength(6);
    expect(en.problems.map(p => p.parts.length)).toEqual([1, 1, 1, 3, 2, 2]);
    for (const locale of [en, zh]) for (const problem of locale.problems) {
      expect(problem.guide.length).toBeGreaterThan(40);
      for (const part of problem.parts) {
        const equations = displayEquations(part.solution);
        expect(equations.length).toBeGreaterThanOrEqual(2);
        expect(equations.at(-1)).toContain('\\boxed{');
        for (const id of formulaReferences(part.solution)) {
          expect(json(resolve(root, 'content/formulas.json')).some((formula: {id: string}) => formula.id === id)).toBe(true);
        }
      }
    }
    const regions = json(resolve(base('en'), 'figure-sources.json')).figures;
    expect(Object.values(regions).map((s: any) => s.page)).toEqual([3, 5, 7, 9, 11, 13]);
    // q6 crop ends before "Answer:" and contains the original circuit, not the answer thumbnail.
    expect(regions['e1-s25-q6'].region[1]).toBeCloseTo(189 / 792, 5);
    expect(regions['e1-s25-q6'].region[1] + regions['e1-s25-q6'].region[3]).toBeLessThan(358 / 792);
    expect(q(5).parts[1].solutionPage).toBe(12);
  });

  test('hysteresis loss can be positive below saturation', () => {
    // Dimensionless example: B=.4 sin(t), H=sin(t+.2), saturation threshold B=1.
    const count = 10000, dt = 2 * Math.PI / count;
    let loopEnergy = 0;
    for (let i = 0; i < count; i++) {
      const t = (i + .5) * dt;
      loopEnergy += Math.sin(t + .2) * .4 * Math.cos(t) * dt;
    }
    expect(loopEnergy).toBeCloseTo(Math.PI * .4 * Math.sin(.2), 10);
    expect(loopEnergy).toBeGreaterThan(0);
    expect(q(1).parts[0].note).toContain('Saturation is not required');
    expect(q(1, zh).parts[0].note).toContain('并非必要条件');
  });

  test('instantaneous sinusoidal power equals a DC term plus a twice-frequency term', () => {
    const vm = 140, im = 9, tv = .7, ti = -.3;
    for (const t of [0, .001, .003, .01, .019]) {
      const w = 2 * Math.PI * 60;
      const product = vm * Math.cos(w * t + tv) * im * Math.cos(w * t + ti);
      const expanded = vm * im / 2 * (Math.cos(tv - ti) + Math.cos(2 * w * t + tv + ti));
      expect(product).toBeCloseTo(expanded, 9);
    }
    for (const locale of [en, zh]) expect(final(2, 0, locale)).toContain('2\\omega t+\\theta_v+\\theta_i');
  });

  test('balanced delta/Y transformation gives identical currents even for arbitrary terminal voltages', () => {
    const zd: Complex = [3, 4], zy = div(zd, [3, 0]);
    const voltages: Complex[] = [[110, 10], [-30, -80], [15, 25]];
    const neutral = div(sum(voltages), [3, 0]);
    for (let k = 0; k < 3; k++) {
      const star = div(sub(voltages[k], neutral), zy);
      const delta = sum([0, 1, 2].filter(j => j !== k).map(j => div(sub(voltages[k], voltages[j]), zd)));
      closeComplex(star, delta);
    }
    for (const locale of [en, zh]) expect(final(3, 0, locale)).toContain('Z_Y=\\frac{Z_\\Delta}{3}');
  });

  test('440 V delta yields the correct branch, line, and per-phase power values', () => {
    const voltage = Number(/V_L=(\d+)/.exec(q(4).givens[0])![1]);
    const impedance: Complex = [2, 15];
    const branches = [0, -120, 120].map(deg => div(polar(voltage, deg), impedance));
    const line = sub(branches[0], branches[2]);
    expect(magnitude(branches[0])).toBeCloseTo(29.0760184200, 8);
    expect(magnitude(line)).toBeCloseTo(50.3611411853, 7);
    expect(angle(line)).toBeCloseTo(-112.405356631, 7);
    expect(mul([voltage, 0], [branches[0][0], -branches[0][1]])[0]).toBeCloseTo(1690.829694323, 8);
    closeComplex(sum(branches), [0, 0]);
    for (const locale of [en, zh]) {
      expect(final(4, 0, locale)).toContain('50.3611\\angle-112.4054');
      expect(final(4, 1, locale)).toContain('1690.83');
    }
  });

  test('parallel-load correction requires 35 kvar and 47.37 microfarads', () => {
    const p = 125 * .28 + 10 + 15, reactive = 125 * Math.sqrt(1 - .28 ** 2) - 40;
    const apparent = Math.hypot(p, reactive), targetQ = p * Math.tan(Math.acos(.8));
    const qc = targetQ - reactive, capacitance = -qc * 1000 / (2 * Math.PI * 60 * 1400 ** 2);
    expect(p).toBe(60); expect(reactive).toBe(80); expect(apparent).toBe(100);
    expect(p / apparent).toBe(.6); expect(qc).toBeCloseTo(-35, 10);
    expect(capacitance * 1e6).toBeCloseTo(47.3675425869, 8);
    expect(reactive - 2 * Math.PI * 60 * capacitance * 1400 ** 2 / 1000).toBeCloseTo(targetQ, 10);
    for (const locale of [en, zh]) {
      expect(final(5, 0, locale)).toContain('100\\,\\mathrm{kVA}');
      expect(final(5, 1, locale)).toContain('47.37');
    }
  });

  test('floating neutral keeps printed -j5 and kV, satisfies KCL and voltage reconstruction', () => {
    expect(q(6).givens[2]).toContain('Z_b=-j5');
    const voltages = [90, -30, 210].map(deg => polar(100, deg)); // kV
    const impedances: Complex[] = [[5, 0], [0, -5], [3, 4]];
    const ys = impedances.map(z => div([1, 0], z));
    const neutral = div(sum(voltages.map((v, k) => mul(v, ys[k]))), sum(ys));
    const currents = voltages.map((v, k) => div(sub(v, neutral), impedances[k])); // kA
    expect(magnitude(neutral)).toBeCloseTo(142.4842902148, 8);
    expect(angle(neutral)).toBeCloseTo(93.3985955550, 8);
    closeComplex(sum(currents), [0, 0]);
    currents.forEach((current, k) => closeComplex(add(mul(current, impedances[k]), neutral), voltages[k]));
    const expected = [[8.6140185063, -78.6900675260], [42.8897010018, 26.3099324740], [41.5028310855, -165.2551187031]];
    currents.forEach((current, k) => { expect(magnitude(current)).toBeCloseTo(expected[k][0], 8); expect(angle(current)).toBeCloseTo(expected[k][1], 8); });
    // Complex-power conservation holds despite the displaced neutral.
    const conjugate = (a: Complex): Complex => [a[0], -a[1]];
    closeComplex(sum(voltages.map((v, k) => mul(v, conjugate(currents[k])))), sum(currents.map((i, k) => mul(mul(i, conjugate(i)), impedances[k]))));
    for (const locale of [en, zh]) {
      expect(final(6, 0, locale)).toContain('142.4843\\angle93.3986');
      expect(final(6, 0, locale)).toContain('\\mathrm{kV}');
      expect(final(6, 1, locale)).toContain('\\mathrm{kA}');
    }
  });
});
