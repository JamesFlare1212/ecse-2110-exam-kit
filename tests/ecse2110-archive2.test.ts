import {describe, expect, test} from 'bun:test';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {expectIndependentPageImages, expectPaperSourceMetadata} from './fixtures/paper-provenance';
import {readQuestionMarkdown} from '../content/markdown';
import {joinTranslations} from '../content/localization';
import {displayEquations, formulaReferences} from '../content/text';
import {parseContent} from '../content/schema';
import type {Exam, InOneLanguage, SourceDocument} from '../content/types';

const base = resolve('content/en/exam2_s25');
const available = existsSync(resolve(base, 'paper.json'));
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
function archive(locale: 'en' | 'zh-cn') {
  const root = resolve('content', locale, 'exam2_s25');
  const resources = json(resolve(root, 'figure-sources.json'));
  const problems = Array.from({length: 7}, (_, i) => {
    const file = resolve(root, `questions/q${i+1}.md`);
    return readQuestionMarkdown(readFileSync(file, 'utf8'), file, resources);
  });
  return {...json(resolve(root, 'paper.json')), problems} as InOneLanguage<Exam>;
}
function datum(givens: string[], pattern: RegExp): number {
  const match = pattern.exec(givens.join(' '));
  if (!match) throw new Error(`Missing authored input matching ${pattern}`);
  return Number(match[1]);
}

// This paper can be unplugged as a translated pair without losing saved state.
describe.skipIf(!available)('ECSE 2110 historical Exam 2 scientific archive', () => {
  test('preserves the conflicting source date, combined PDF and seven printed scores', () => {
    const en = archive('en'), zh = archive('zh-cn');
    const exam = joinTranslations<Exam>(en, zh, 'exam2_s25');
    expect(exam.id).toBe('e2-s25');
    expect(exam.year).toBe(2025);
    expect(exam.term).toEqual({en: 'Cover date · conflicting labels', zh: '封面日期 · 年份标注冲突'});
    expect(exam.doc).toBe('e2-s25-sol');
    expect(exam.solutionDoc).toBe(exam.doc);
    expect(exam.questionsOnly).toBe(false);
    expect(exam.problems.map(q => q.points)).toEqual([10, 10, 10, 10, 20, 20, 20]);
    expect(exam.problems.reduce((n, q) => n+q.points, 0)).toBe(100);
    expect(exam.problems.map(q => q.originalFigure.page)).toEqual([3, 5, 7, 9, 11, 13, 15]);
    expect(String(en.problems[0].note)).toContain('July 15, 2025');
    expect(String(en.problems[0].note)).toContain('Summer 2023');
    expect(String(zh.problems[0].note)).toContain('2025 年 7 月 15 日');
    expect(en.problems[6].statement).toContain('transformer');
    expect(en.problems[6].statement).not.toMatch(/induction motor/i);

    const docs = {...json(resolve('content/documents.json'))};
    for (const [id, value] of Object.entries(json(resolve(base, 'documents.json')))) {
      const doc = value as SourceDocument;
      docs[id] = {...doc, pdf: `/papers/en/exam2_s25/${doc.pdf}`, pageBase: `/papers/en/exam2_s25/${doc.pageBase}`};
    }
    expect(parseContent([exam], json(resolve('content/formulas.json')), docs).exams).toHaveLength(1);
  });

  test('retains source identity metadata, independent page images and measured question crops', () => {
    const expected = '41a823cb045c5124845717f8c78208baf604d8542509d2c1233be11604b21786';
    for (const locale of ['en', 'zh-cn'] as const) {
      const root = resolve('content', locale, 'exam2_s25');
      const doc = json(resolve(root, 'documents.json'))['e2-s25-sol'];
      expect(doc.pages).toBe(16);
      expect(doc.sizes).toEqual(Array.from({length:16}, () => [612, 792]));
      expect(doc.sha256).toBe(expected);
      expect(doc.original).toBe('Exams/Exam2/ECSE2110Test2Sol.pdf');
      expectPaperSourceMetadata(doc, 'e2-s25-sol');
      const crops = json(resolve(root, 'figure-sources.json')).figures;
      for (let q=1; q<=7; q++) {
        const crop = crops[`e2-s25-q${q}`];
        expect(crop.doc).toBe('e2-s25-sol');
        const [x,y,w,h] = crop.region;
        expect(x).toBeGreaterThan(.002);
        expect(y).toBeGreaterThan(.002);
        expect(x+w+.002).toBeLessThan(1);
        expect(y+h+.002).toBeLessThan(1);
        // Every original crop stops before the printed Answer/Solution heading.
        expect(y+h).toBeLessThan(q===5 ? 251.44/792 : q===6 ? 261.52/792 : q===7 ? 204.46/792 : .21);
      }
      for (let page=1; page<=16; page++) expect(existsSync(resolve(root, `assets/pages/e2-s25-sol/${page}.webp`))).toBe(true);
    }
    expectIndependentPageImages(['en', 'zh-cn'].map(locale => resolve('content', locale, 'exam2_s25')), 'e2-s25-sol', 16);
  });

  test('retains magnetic-locking conditions and the limited round-rotor stability model', () => {
    for (const locale of ['en','zh-cn'] as const) {
      const q = archive(locale).problems;
      expect(q[0].parts[0].solution).toContain('N_k I_{f,k}');
      expect(q[1].parts[0].solution).toContain('(n_s-n_r)');
      expect(q[1].parts[0].solution).toContain('120f');
      expect(q[2].parts[0].solution).toContain('|E_m\\sin\\theta|');
      expect(q[3].parts[0].solution).toContain('T_{\\max}\\cos\\delta');
      expect(q[3].parts[0].solution).toContain('T_L>T_{\\max}');
      expect(q[3].parts[0].figure).toBe('e2-s25-q4-power-angle');
      expect(q[3].note).toMatch(locale==='en' ? /Saliency and dynamic disturbances/ : /凸极效应和动态扰动/);
    }
  });

  test('distinguishes intended DC path sizing from physical wave-winding closure', () => {
    for (const locale of ['en','zh-cn'] as const) {
      const q = archive(locale).problems[4];
      const v1=datum(q.givens, /V_1=(\d+)/), v2=datum(q.givens, /V_2=(\d+)/);
      const poles=datum(q.givens, /P=(\d+)/), coilV=datum(q.givens, /E_c=(\d+)/), coilI=datum(q.givens, /I_c=(\d+)/);
      const lapCount=poles*v1/coilV, waveCount=2*v2/coilV;
      expect(lapCount).toBe(120);
      expect(waveCount).toBe(lapCount);
      const powers=[v1*poles*coilI/1000,v2*2*coilI/1000];
      expect(powers).toEqual([2.4,2.4]);
      expect(q.parts[1].solution).toContain(`C_1=C_2=${lapCount}`);
      expect(q.parts[2].solution).toContain(`${powers[0]}\\,\\mathrm{kW}`);
      const pitches=[(waveCount-1)/(poles/2),(waveCount+1)/(poles/2)];
      expect(pitches).toEqual([59.5,60.5]);
      expect(pitches.every(Number.isInteger)).toBe(false);
      expect(String(q.note)).toContain('59.5');
      expect(String(q.note)).toContain('60.5');
      expect(q.note).toMatch(locale==='en' ? /dummy coil is inactive/ : /虚线圈不参与发电/);
    }
  });

  test('uses the LV open-circuit test, HV short-circuit test and correct referral factor', () => {
    for (const locale of ['en','zh-cn'] as const) {
      const q=archive(locale).problems[5];
      const voc=datum(q.givens,/V_\{oc\}=(\d+)/), ioc=datum(q.givens,/I_\{oc\}=([\d.]+)/), poc=datum(q.givens,/P_\{oc\}=(\d+)/);
      const vsc=datum(q.givens,/V_\{sc\}=(\d+)/), isc=datum(q.givens,/I_\{sc\}=(\d+)/), psc=datum(q.givens,/P_\{sc\}=(\d+)/);
      const ratio=10, rcH=ratio**2*voc**2/poc;
      const xmH=ratio**2*voc/Math.sqrt(ioc**2-(poc/voc)**2);
      const req=psc/isc**2, zeq=vsc/isc, xeq=Math.sqrt(zeq**2-req**2);
      expect(rcH).toBe(2500);
      expect(xmH).toBeCloseTo(2236.0679775,7);
      expect(req).toBe(.18);
      expect(xeq).toBeCloseTo(.4664761516,10);
      expect(q.parts[0].solution).toContain('1000\\,\\mathrm A');
      expect(q.parts[1].solution).toContain('2236.07');
      expect(q.parts[1].solution).toContain('0.466476');
      expect(q.parts[1].figure).toBe('e2-s25-q6-equivalent');
      expect(q.parts[1].solutionPage).toBe(14);
      expect(String(q.parts[1].note)).toContain('2237');
    }
  });

  test('leading current makes regulation negative; phasor and first-order methods remain distinct', () => {
    const req=1800/100**2, xeq=Math.sqrt((50/100)**2-req**2), pf=.6;
    const sin=Math.sqrt(1-pf**2), ratedV=1000, ratedI=100;
    const realDrop=ratedI*(req*pf-xeq*sin), imagDrop=ratedI*(xeq*pf+req*sin);
    const firstOrder=100*realDrop/ratedV;
    const phasor=100*(Math.hypot(ratedV+realDrop,imagDrop)-ratedV)/ratedV;
    expect(firstOrder).toBeCloseTo(-2.6518092127,9);
    expect(phasor).toBeCloseTo(-2.5595661060,9);
    for (const locale of ['en','zh-cn'] as const) {
      const solution=archive(locale).problems[5].parts[2].solution;
      expect(solution).toContain(firstOrder.toFixed(3));
      expect(solution).toContain(phasor.toFixed(3));
      expect(solution).toContain('0.6+j0.8');
      expect(solution).toContain('(0.18)(0.6)-(0.466476)(0.8)');
    }
  });

  test('efficiency uses real output power and current-squared copper loss at partial load', () => {
    for (const locale of ['en','zh-cn'] as const) {
      const q=archive(locale).problems[6];
      const kva=datum(q.givens,/S_N=(\d+)/), core=datum(q.givens,/P_\{core\}=(\d+)/), copper=datum(q.givens,/P_\{cu,N\}=(\d+)/), pf=datum(q.givens,/\\mathrm\{PF\}=([\d.]+)/);
      const fullOutput=kva*1000*pf, partialOutput=2*1000*pf, partialCopper=(2/kva)**2*copper;
      expect(partialCopper).toBeCloseTo(19.2,10);
      const efficiency=[fullOutput/(fullOutput+core+copper)*100,partialOutput/(partialOutput+core+partialCopper)*100];
      expect(efficiency[0]).toBeCloseTo(94.7867298578,9);
      expect(efficiency[1]).toBeCloseTo(93.0665425779,9);
      q.parts.forEach((part,i) => expect(part.solution).toContain(`\\boxed{${efficiency[i].toFixed(2)}\\%}`));
      expect(q.parts[1].solution).toContain('1719.2');
      expect(q.parts[1].solution).toContain('19.2');
    }
  });

  test('every translated subpart has one final boxed result and no fictitious formula links', () => {
    for (const locale of ['en','zh-cn'] as const) for (const q of archive(locale).problems) {
      for (const part of q.parts) {
        const equations=displayEquations(part.solution);
        expect(equations.length).toBeGreaterThanOrEqual(2);
        expect(equations[0]).not.toContain('\\boxed');
        expect(equations.at(-1)).toContain('\\boxed');
        expect(part.solution.match(/\\boxed\{/g)).toHaveLength(1);
        for (const id of formulaReferences(part.solution)) {
          expect(json(resolve('content/formulas.json')).some((formula: {id: string}) => formula.id === id)).toBe(true);
        }
      }
    }
  });
});
