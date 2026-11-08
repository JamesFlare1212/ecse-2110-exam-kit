import { describe, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { loadContent, assetSource, stagePaperAssets } from '../content/papers.server';
import {displayEquations} from '../content/text';
import {course} from '../content/course';

const project = resolve(import.meta.dir, '..');
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'fieldnotes-papers-'));
  for (const name of ['course.json', 'documents.json', 'formulas.json']) cpSync(resolve(project, 'content', name), resolve(root, name));
  for(const locale of ['en','zh-cn'])mkdirSync(resolve(root,locale));
  function add(name: string, id: string, year: number) {
    const directories=[];
    for(const locale of ['en','zh-cn']){
    const directory = resolve(root, locale, name);
    mkdirSync(resolve(directory, 'assets/figures'), { recursive: true });
    const original = resolve(project, 'content',locale,'exam1_f25');
    const exam = JSON.parse(readFileSync(resolve(original, 'paper.json'), 'utf8').replaceAll('e1-f25', id));
    exam.year = year;
    writeFileSync(resolve(directory, 'paper.json'), JSON.stringify(exam));
    mkdirSync(resolve(directory, 'questions'));
    for (const question of ['q1', 'q2', 'q3', 'q4']) {
      writeFileSync(resolve(directory, 'questions', `${question}.md`), readFileSync(resolve(original, 'questions', `${question}.md`), 'utf8').replaceAll('e1-f25', id));
    }
    writeFileSync(resolve(directory, 'documents.json'), readFileSync(resolve(original, 'documents.json'), 'utf8').replaceAll('e1-f25', id));
    writeFileSync(resolve(directory, 'figure-sources.json'), readFileSync(resolve(original, 'figure-sources.json'), 'utf8').replaceAll('e1-f25', id));
    writeFileSync(resolve(directory, 'assets/figures/test.svg'), `<svg>${locale}</svg>`);
    directories.push(directory);
    }
    return directories;
  }
  return { root, add };
}

// These regression fixtures deliberately reuse the shipped ECSE exam; generic migration coverage lives in template.test.ts.
describe.skipIf(course.id !== 'ecse-2100' || !existsSync(resolve(project, 'content/en/exam1_f25')))('Pluggable paper folders', () => {
  test('discovers added papers, scopes assets and removes unplugged staged assets without a registry edit', () => {
    const { root, add } = fixture();
    try {
      const first = add('exam1_f25', 'e1-f25', 2025);
      expect(loadContent(root).exams.map(exam => exam.id)).toEqual(['e1-f25']);
      const next = add('exam1_f27', 'e1-f27', 2027);
      const both = loadContent(root);
      expect(both.exams.map(exam => exam.id)).toEqual(['e1-f25', 'e1-f27']);
      expect(both.documents['e1-f27'].pdf).toBe('/papers/en/exam1_f27/sources/e1-f27.pdf');
      expect(both.documentsByLocale.zh['e1-f27'].pdf).toBe('/papers/zh-cn/exam1_f27/sources/e1-f27.pdf');
      expect(assetSource('/papers/en/exam1_f27/figures/test.svg', root)).toBe(resolve(next[0], 'assets/figures/test.svg'));
      const staged = resolve(root, 'public');
      stagePaperAssets(both.papers, staged);
      const unchanged=resolve(staged,'en/exam1_f27/figures/test.svg');
      utimesSync(unchanged,1,1);
      stagePaperAssets(both.papers,staged);
      expect(statSync(unchanged).mtimeMs).toBe(1000);
      const added=resolve(next[1],'assets/figures/added.svg');
      writeFileSync(added,'<svg>new Chinese asset</svg>');
      stagePaperAssets(both.papers,staged);
      expect(readFileSync(resolve(staged,'zh-cn/exam1_f27/figures/added.svg'),'utf8')).toContain('Chinese asset');
      expect(existsSync(resolve(staged,'en/exam1_f27/figures/added.svg'))).toBe(false);
      rmSync(added);stagePaperAssets(both.papers,staged);
      expect(existsSync(resolve(staged,'zh-cn/exam1_f27/figures/added.svg'))).toBe(false);
      for(const locale of ['en','zh-cn']){
        expect(readFileSync(resolve(staged,locale,'exam1_f27/figures/test.svg'),'utf8')).toBe(`<svg>${locale}</svg>`);
        expect(existsSync(resolve(staged,locale,'exam1_f27/paper.json'))).toBe(false);
        expect(existsSync(resolve(staged,locale,'exam1_f27/questions/q1.md'))).toBe(false);
      }
      first.forEach(directory=>rmSync(directory, { recursive: true }));
      const remaining = loadContent(root);
      stagePaperAssets(remaining.papers, staged);
      expect(remaining.exams.map(exam => exam.id)).toEqual(['e1-f27']);
      expect(existsSync(resolve(staged,'en','exam1_f25'))).toBe(false);
      expect(existsSync(resolve(staged,'zh-cn','exam1_f25'))).toBe(false);
      expect(existsSync(resolve(staged,'en','exam1_f27/figures/test.svg'))).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test('reports incomplete or misnamed papers instead of silently omitting them', () => {
    const { root, add } = fixture();
    try {
      mkdirSync(resolve(root, 'en/exam1_f27'));
      expect(() => loadContent(root)).toThrow('paper.json');
      rmSync(resolve(root, 'en/exam1_f27'), { recursive: true });
      add('exam1_f27', 'e1-f25', 2025);
      expect(() => loadContent(root)).toThrow('must match the paper folder');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test('rejects asset traversal outside a paper', () => {
    for(const path of ['/papers/en/exam1_f26/../paper.json','/papers/fr/exam1_f26/sources/a.pdf','/papers/en/not-a-paper/file'])expect(() => assetSource(path)).toThrow(/Invalid .*asset/);
  });

  test('pairs stable identities while each language independently edits prose, equations and layout',()=>{
    const {root,add}=fixture();
    try{
      const folders=add('exam1_f25','e1-f25',2025);
      const path=resolve(folders[1],'questions/q1.md');
      const original=readFileSync(path,'utf8');
      writeFileSync(path,original.replace('title: 有线电视连接','title: 中文标题独立编辑'));
      const translated=loadContent(root).exams[0].problems[0];
      expect(translated.title.zh).toBe('中文标题独立编辑');
      expect(translated.title.en).toBe('Cable TV Connection');
      writeFileSync(path,original.replace('### Solution',()=>'### Solution\n\n独立的中文说明。\n\n$$\nx=1\n$$'));
      const independent=loadContent(root).exams[0].problems[0].parts[0];
      expect(independent.solution.zh).toContain('独立的中文说明。');
      expect(independent.solution.en).not.toContain('x=1');
      expect(displayEquations(independent.solution.zh)).toHaveLength(displayEquations(independent.solution.en).length+1);
      const first=original.indexOf('## Part a\n'),second=original.indexOf('## Part b\n'),third=original.indexOf('## Part c\n');
      writeFileSync(path,original.slice(0,first)+original.slice(second,third)+original.slice(first,second)+original.slice(third));
      const reordered=loadContent(root).exams[0].problems[0];
      expect(reordered.parts.map(part=>part.label)).toEqual(['a','b','c','d','e']);
      expect(reordered.parts[0].prompt.zh).toBe(translated.parts[0].prompt.zh);
      expect(reordered.parts[1].solution.zh).toBe(translated.parts[1].solution.zh);
      writeFileSync(path,original.replace('points: 10','points: 11'));
      expect(()=>loadContent(root)).toThrow(/language files must agree/);
      rmSync(path);
      expect(()=>loadContent(root)).toThrow(/language files must/);
    }finally{rmSync(root,{recursive:true,force:true});}
  });
});
