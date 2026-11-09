import {describe, expect, test} from 'bun:test';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {expectIndependentPageImages, expectPaperSourceMetadata} from './fixtures/paper-provenance';
import {readQuestionMarkdown} from '../content/markdown';
import {semanticMarkdown} from './fixtures/semantic-markdown';
import {displayEquations, formulaReferences} from '../content/text';
import {joinTranslations} from '../content/localization';
import {parseContent} from '../content/schema';
import type {Exam} from '../content/types';

const locales = ['en', 'zh-cn'] as const;
const base = (locale: string) => resolve('content', locale, 'practice1_f26');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const questions = Object.fromEntries(locales.map(locale => {
  const directory = base(locale);
  const sources = json(`${directory}/figure-sources.json`);
  return [locale, Array.from({length: 10}, (_, index) => {
    const path = `${directory}/questions/q${index+1}.md`;
    return readQuestionMarkdown(readFileSync(path, 'utf8'), path, sources);
  })];
}));
const sourcePages = [1, 3, 4, 5, 6, 8, 9, 10, 11, 13];
const partCounts = [3, 1, 1, 1, 1, 3, 4, 2, 2, 3];
const officialFormulaIds = new Set(['product-to-sum', 'three-phase-power', 'star', 'delta', 'delta-star', 'rms-peak', 'turns-ratio', 'transformer-efficiency', 'voltage-regulation']);
const final = (q: number, part: number) => locales.map(locale => displayEquations(questions[locale][q-1].parts[part-1].solution).at(-1)!);
function containsResult(q: number, part: number, ...values: string[]) {
  for (const equation of final(q, part)) for (const value of values) expect(equation).toContain(value);
}

describe('Practice set 1 package, original prompts and diagram boundary', () => {
  test('passes the full bilingual content schema with real formula and lecture documents', () => {
    const en = {...json(`${base('en')}/paper.json`), problems: questions.en};
    const zh = {...json(`${base('zh-cn')}/paper.json`), problems: questions['zh-cn']};
    const paper = joinTranslations<Exam>(en, zh, 'practice1_f26');
    const formulas = json(resolve('content/formulas.json'));
    for (const locale of locales) {
      const local = json(`${base(locale)}/documents.json`);
      const documents = {...json(resolve('content/documents.json'))};
      for (const [id, entry] of Object.entries(local) as [string, {pdf: string; pageBase: string}][]) {
        documents[id] = {...entry, pdf: `/papers/${locale}/practice1_f26/${entry.pdf}`, pageBase: `/papers/${locale}/practice1_f26/${entry.pageBase}`};
      }
      expect(parseContent([paper], formulas, documents).exams[0].id).toBe('p1-f26');
    }
  });

  test('has ten editorial questions, all 21 requests, no invented points and independent translations', () => {
    for (const locale of locales) {
      const paper = json(`${base(locale)}/paper.json`);
      expect(paper).toMatchObject({id: 'p1-f26', number: 1, kind: 'practice', year: 2026, points: 0, doc: 'p1-f26-sol', solutionDoc: 'p1-f26-sol', questionsOnly: false});
      expect(paper.term).toBe(locale === 'en' ? 'Practice set 1 · Fall' : '练习题组 1 · 秋季');
      expect(questions[locale].map(q => q.parts.length)).toEqual(partCounts);
      expect(questions[locale].map(q => q.originalFigure.page)).toEqual(sourcePages);
      for (const [index, q] of questions[locale].entries()) {
        expect(q.id).toBe(`p1-f26-q${index+1}`);
        expect(q.title).not.toMatch(/^\d+\.\d+/);
        expect(q.statement).not.toMatch(/^\d+\.\d+/);
        expect(q.points).toBe(0);
        expect(q.guide).not.toContain('\\boxed');
        expect(q.parts.every(p => p.points === 0)).toBe(true);
        expect(q.parts.map(p => p.id)).toEqual(questions.en[index].parts.map(p => p.id));
        for (const part of q.parts) {
          const equations = displayEquations(part.solution);
          expect(equations.length).toBeGreaterThanOrEqual(2);
          expect(equations.slice(0, -1).join('\n')).not.toContain('\\boxed');
          expect(equations.at(-1)).toContain('\\boxed');
          for (const id of formulaReferences(part.solution)) expect(officialFormulaIds.has(id)).toBe(true);
          if (locale === 'zh-cn') expect(part.solution).toMatch(/[\u4e00-\u9fff]/);
        }
      }
    }
    expect(questions.en[0].parts.map(p => p.solutionPage)).toEqual([1, 2, 2]);
    expect(questions.en[6].parts.map(p => p.label)).toEqual(['a', 'b', 'c', 'd']);
  });

  test('preserves original English wording and requests while omitting textbook numbering', () => {
    const expectedStatements = [
      ['A single-phase load is supplied with a sinusoidal voltage', '$v(t)=200\\cos(377t)$', 'The resulting instantaneous power is', '$p(t)=800+1000\\cos(754t-36.87^\\circ)$'],
      ['An inductive load consisting of $R$ and $X$ in series feeding from a 2400-V rms supply absorbs 288 kW at a lagging power factor of 0.8. Determine $R$ and $X$.'],
      ['An inductive load consisting of $R$ and $X$ in parallel feeding from a 2400-V rms supply absorbs 288 kW at a lagging power factor of 0.8. Determine $R$ and $X$.'],
      ['Two loads connected in parallel are supplied from a single-phase 240-V rms source. The two loads draw a total real power of 400 kW at a power factor of 0.8 lagging. One of the loads draws 120 kW at a power factor of 0.96 leading. Find the complex power of the other load.'],
      ['Show that only 1-phase circuits have the double frequency component of power but not the balanced 3-phase circuits. Include detailed steps.'],
      ['A 440-V, 3-phase voltage feeds a balanced delta-connected 3-phase load with an impedance of $(25+j10)\\,\\Omega$/phase'],
      ['A three-phase, star connected load with a resistance of $30\\Omega$ and a reactance of $25\\Omega$ per phase, is fed by a 230 V, three-phase, 60 Hz source. Calculate'],
      ['5 kVA, 240/120 V, 60 Hz transformer has a core loss of 100 W at rated voltage and copper loss of 120 W at rated current. Calculate the efficiency for the following load condition:'],
      ['A 1-phase, 25 kVA, 220/440 V, 60 Hz transformer gave the following test results.', 'Open circuit test (440 V side open): 220 V, 9:5 A, 650W', 'Short-circuit test (220 V side shorted): 37:5 V, 55 A, 950W'],
      ['10 kVA, 2400/240 V, 60 Hz distribution transformer has the following characteristics:', 'Core loss at full voltage $=100\\,\\mathrm W$', 'Copper loss at half load $=60\\,\\mathrm W$'],
    ];
    expectedStatements.forEach((phrases, i) => phrases.forEach(phrase => expect(semanticMarkdown(questions.en[i].statement)).toContain(semanticMarkdown(phrase))));
    const prompts = [
      ['Find the complex power supplied to the load.', 'Find the instantaneous current $i(t)$ and the rms value of the current supplied to the load.', 'Find the load impedance.'],
      ['Determine $R$ and $X$.'], ['Determine $R$ and $X$.'], ['Find the complex power of the other load.'],
      [expectedStatements[4][0]],
      ['Calculate the line current and represent in phasor form', 'Calculate the power absorbed per phase and', 'Calculate the sum of all phase currents. Explain why this sum has such a value'],
      ['all line currents', 'power consumed and', 'power factor.', 'If a delta connected, balanced 3-phase capacitor bank, is added to the same supply in parallel to the given load, with the 15 micro Farad capacitance/phase, then calculate the new overall power factor of the circuit.'],
      ['It is delivering 5 kVA at rated voltage and a power factor of 0.8.', 'It is delivering 2 kVA at rated voltage and a power factor of 0.8.'],
      ['Determine the rated voltage and rated current for the high-voltage and low-voltage sides.', 'Derive an approximate equivalent circuit referred to the HV as well as LV side.'],
      ['Determine the efficiency of the transformer when it delivers full load at 0.8 power factor lagging.', 'Determine the per-unit rating at which the transformer efficiency is a maximum. Determine this efficiency if the load power factor is 0.9.', 'The transformer has the following load cycle:\n\nNo load for 6 hours\n\n$70\\%$ full load for 10 hours at 0.8 PF\n\n$90\\%$ full load for 8 hours at 0.9 PF\n\nDetermine the all-day efficiency of the transformer.'],
    ];
    prompts.forEach((expected, i) => expect(questions.en[i].parts.map(p => semanticMarkdown(p.prompt))).toEqual(expected.map(semanticMarkdown)));
  });

  test('only original series and parallel diagrams appear as prompt SVGs; circuit is solution-only', () => {
    for (const locale of locales) {
      const directory = base(locale);
      expect(questions[locale].filter(q => q.figure).map(q => q.figure)).toEqual(['p1-f26-q2', 'p1-f26-q3']);
      const svgNames = readdirSync(`${directory}/assets/figures`).filter(name => name.endsWith('.svg')).sort();
      expect(svgNames).toEqual(['p1-f26-q2-dark.svg', 'p1-f26-q2.svg', 'p1-f26-q3-dark.svg', 'p1-f26-q3.svg', 'p1-f26-q9-b-solution-dark.svg', 'p1-f26-q9-b-solution.svg']);
      for (const n of [1, 4, 5, 6, 7, 8, 9, 10]) {
        expect(readFileSync(`${directory}/questions/q${n}.md`, 'utf8')).toContain('figure: null');
      }
      expect(questions[locale][8].parts[1].figure).toBe('p1-f26-q9-b-solution');
      expect(questions[locale].flatMap(q => q.parts).filter(p => p.figure)).toHaveLength(1);
      expect(questions[locale].flatMap(q => q.parts).some(p => p.questionFigure)).toBe(false);
      const manifest = json(`${directory}/assets/figures/manifest.json`);
      expect(manifest.questionFigures).toEqual(['p1-f26-q2', 'p1-f26-q3']);
      expect(manifest.figures).toEqual(['p1-f26-q2', 'p1-f26-q3', 'p1-f26-q9-b-solution']);
      const sources = json(`${directory}/figure-sources.json`).figures;
      expect(Object.keys(sources)).toHaveLength(10);
      for (const source of Object.values(sources) as {doc: string; page: number; region: number[]}[]) {
        expect(source.doc).toBe('p1-f26-sol');
        expect(source.page).toBeGreaterThan(0); expect(source.page).toBeLessThanOrEqual(13);
        const [x, y, width, height] = source.region;
        expect(x).toBeGreaterThan(.002); expect(y).toBeGreaterThan(.002);
        expect(x+width+.002).toBeLessThanOrEqual(1); expect(y+height+.002).toBeLessThanOrEqual(1);
      }
    }
  });

  test('retains 13-page source provenance metadata and independent locale resources', () => {
    const expectedHash = 'b095acdc4c46ee4e96311a69aae79c8179f591646b8949914e711cf4132bfab8';
    for (const locale of locales) {
      const registry = json(`${base(locale)}/documents.json`);
      expect(Object.keys(registry)).toEqual(['p1-f26-sol']);
      const doc = registry['p1-f26-sol'];
      expect(doc.pages).toBe(13); expect(doc.sizes).toEqual(Array.from({length: 13}, () => [612, 792]));
      expect(doc.original).toBe('Exams/Exam1/Practice_Problems_-_Set1_-_ECSE_2110_-_Electrical_Energy_Systems.pdf');
      expect(doc.sha256).toBe(expectedHash);
      expectPaperSourceMetadata(doc, 'p1-f26-sol');
      expect(readFileSync(`${base(locale)}/extracted/p1-f26-sol.txt`, 'utf8')).toContain('--- PAGE 13 ---');
    }
    expectIndependentPageImages(locales.map(base), 'p1-f26-sol', 13);
  });
});

describe('Practice 1 independent scientific calculations and authored final results', () => {
  test('Q1: mean/ripple power, current amplitude and inductive impedance', () => {
    const P = 800, apparent = 1000, Q = Math.sqrt(apparent**2-P**2);
    const V = 200/Math.sqrt(2), I = apparent/V;
    expect(Q).toBe(600); expect(I).toBeCloseTo(7.0710678119, 8);
    expect(V/I).toBeCloseTo(20, 10);
    expect(V**2*P/apparent**2).toBeCloseTo(16, 10); expect(V**2*Q/apparent**2).toBeCloseTo(12, 10);
    containsResult(1, 1, '800+j600', '1000'); containsResult(1, 2, '10\\cos(377t-36.87', '7.07107'); containsResult(1, 3, '16+j12', '20');
    expect(questions.en[0].parts[0].note).toContain('typo');
  });

  test('Q2–Q3: series and parallel values reproduce the same 288+j216 kVA', () => {
    const voltage = 2400, P = 288000, pf = .8, I = P/(voltage*pf), Q = P*Math.tan(Math.acos(pf));
    expect(I).toBe(150); expect(Q).toBeCloseTo(216000, 7);
    expect(P/I**2).toBe(12.8); expect(Q/I**2).toBeCloseTo(9.6, 10);
    expect(voltage**2/P).toBe(20); expect(voltage**2/Q).toBeCloseTo(26.6666666667, 8);
    containsResult(2, 1, '12.8', '9.6'); containsResult(3, 1, '20', '26.6667');
  });

  test('Q4: subtracts negative reactive power of the leading load', () => {
    const totalQ = 400*Math.tan(Math.acos(.8)), leadingQ = -120*Math.tan(Math.acos(.96));
    expect(leadingQ).toBeCloseTo(-35, 10); expect(totalQ-leadingQ).toBeCloseTo(335, 10);
    containsResult(4, 1, '280+j335');
  });

  test('Q5: ripple cancels with peak normalization for arbitrary load angle', () => {
    const Vm = 200, Im = 10, phi = .61, expected = 3*Vm*Im/2*Math.cos(phi);
    const single = (phase: number) => Vm*Im*Math.cos(phase)*Math.cos(phase-phi);
    for (const t of [0, .3, 1.1, 3, 5.4]) {
      const total = [0, -2*Math.PI/3, 2*Math.PI/3].reduce((sum, shift) => sum+single(t+shift), 0);
      expect(total).toBeCloseTo(expected, 8);
    }
    expect(single(0)).not.toBeCloseTo(single(.3), 4);
    containsResult(5, 1, '\\frac{3V_mI_m}{2}', '3VI\\cos\\phi');
    expect(questions.en[4].parts[0].note).toContain('unbalanced');
  });

  test('Q6: delta branch subtraction, correct real power and balanced zero sum', () => {
    const magnitude = 440/Math.hypot(25, 10), phi = Math.atan2(10, 25);
    const currents = [0, -2*Math.PI/3, 2*Math.PI/3].map(shift => [magnitude*Math.cos(shift-phi), magnitude*Math.sin(shift-phi)]);
    const Ia = [currents[0][0]-currents[2][0], currents[0][1]-currents[2][1]];
    expect(Math.hypot(...Ia)).toBeCloseTo(28.3037709197, 8);
    expect(Math.atan2(Ia[1], Ia[0])*180/Math.PI).toBeCloseTo(-51.8014094864, 8);
    expect(currents.reduce((sum, current) => sum+current[0], 0)).toBeCloseTo(0, 10);
    expect(currents.reduce((sum, current) => sum+current[1], 0)).toBeCloseTo(0, 10);
    expect(440**2*25/(25**2+10**2)).toBeCloseTo(6675.8620689655, 7);
    containsResult(6, 1, '28.3038', '-51.8014', '-171.8014', '68.1986'); containsResult(6, 2, '6675.86'); containsResult(6, 3, '0\\,\\mathrm A');
    expect(questions.en[5].parts[1].note).toContain('apparent power');
  });

  test('Q7: load powers and slight leading overcompensation', () => {
    const I = 230/Math.sqrt(3)/Math.hypot(30, 25), P = 3*I**2*30, Q = 3*I**2*25;
    const Qc = -3*2*Math.PI*60*15e-6*230**2, net = Q+Qc;
    expect(I).toBeCloseTo(3.4004178464, 8); expect(P).toBeCloseTo(1040.6557377049, 7);
    expect(Q).toBeCloseTo(867.2131147541, 7); expect(Qc).toBeCloseTo(-897.4273574245, 7);
    expect(net).toBeLessThan(0); expect(P/Math.hypot(P, net)).toBeCloseTo(.999578784059, 10);
    containsResult(7, 1, '3.40042', '-39.8056', '-159.8056', '80.1944'); containsResult(7, 2, '1040.66'); containsResult(7, 3, '0.768221'); containsResult(7, 4, '0.999579');
    expect(questions.en[6].parts[3].solution).toContain('leading'); expect(questions['zh-cn'][6].parts[3].solution).toContain('超前');
  });

  test('Q8: copper losses follow load current squared', () => {
    expect(4000/(4000+100+120)*100).toBeCloseTo(94.7867298578, 8);
    expect(.4**2*120).toBeCloseTo(19.2, 10);
    expect(1600/(1600+100+19.2)*100).toBeCloseTo(93.0665425779, 8);
    containsResult(8, 1, '94.7867'); containsResult(8, 2, '93.0665');
  });

  test('Q9: measurements identify the proper referred shunt and series impedances', () => {
    const rc = 220**2/650, ic = 650/220, im = Math.sqrt(9.5**2-ic**2), xm = 220/im;
    const z = 37.5/55, r = 950/55**2, x = Math.sqrt(z**2-r**2);
    expect(25000/440).toBeCloseTo(56.8181818182, 8); expect(25000/220).toBeCloseTo(113.6363636364, 8);
    expect(rc).toBeCloseTo(74.4615384615, 8); expect(xm).toBeCloseTo(24.3662577643, 8);
    expect(r).toBeCloseTo(.3140495868, 8); expect(x).toBeCloseTo(.6051850049, 8);
    expect(4*rc).toBeCloseTo(297.8461538462, 8); expect(4*xm).toBeCloseTo(97.4650310573, 8);
    expect(r/4).toBeCloseTo(.0785123967, 8); expect(x/4).toBeCloseTo(.1512962512, 8);
    expect(55**2*r).toBeCloseTo(950, 10); expect(220**2/rc).toBeCloseTo(650, 10);
    containsResult(9, 1, '56.8182', '113.636'); containsResult(9, 2, '297.846', '97.4650', '0.314050', '0.605185', '74.4615', '24.3663', '0.0785124', '0.151296');
    expect(questions.en[8].parts[1].note).toContain('not a distinct additional question');
  });

  test('Q10: full-load efficiency, stationary maximum, and energy-weighted daily efficiency', () => {
    const cu = 60/.5**2, load = Math.sqrt(100/cu), eta = (x: number) => 9000*x/(9000*x+100+cu*x*x);
    expect(cu).toBe(240); expect(8000/(8000+100+cu)*100).toBeCloseTo(95.9232613909, 8);
    expect(load).toBeCloseTo(.6454972244, 8); expect(eta(load)*100).toBeCloseTo(96.6719222668, 8);
    expect(eta(load)).toBeGreaterThan(eta(load-.1)); expect(eta(load)).toBeGreaterThan(eta(load+.1));
    const output = 10*.7*.8*10+10*.9*.9*8, core = .1*24, copper = .240*(.7**2*10+.9**2*8);
    expect(output).toBeCloseTo(120.8, 10); expect(core).toBeCloseTo(2.4, 10); expect(copper).toBeCloseTo(2.7312, 10);
    expect(output/(output+core+copper)*100).toBeCloseTo(95.9253941835, 8);
    containsResult(10, 1, '95.9233'); containsResult(10, 2, '0.645497', '96.6719'); containsResult(10, 3, '95.9254');
  });
});
