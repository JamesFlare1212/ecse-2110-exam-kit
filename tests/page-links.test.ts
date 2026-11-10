import {describe,expect,test} from 'bun:test';
import {pageReferences,hasPageReference,parseText,formulaReferences} from '../content/text';
import {renderText} from '../src/lib/math';
import {exams,formulas,documents,documentsByLocale} from '../content/catalog.server';
import {parseContent} from '../content/schema';

const registry={'lecture-02':{pageBase:'/pages/lecture-02',pages:23},paper:{pageBase:'/papers/zh-cn/exam1_f26/pages/paper',pages:3}};
const link='[Lecture 2, PDF page 13](/pages/lecture-02/13.webp)';
describe('Inline original-page citations',()=>{
 test('recognizes authored links within mixed formula and emphasized text, not code/math',()=>{
  const body=`**Use [formula](formula:generator-current) and ${link}.**`;
  expect(pageReferences(body,registry)).toEqual([{doc:'lecture-02',page:13}]);
  expect(hasPageReference(parseText(body),registry)).toBe(true);
  expect(formulaReferences(body)).toEqual(['generator-current']);
  for(const body of [`\`${link}\``,`\`\`\`md\n${link}\n\`\`\``,`$${link}$`])expect(pageReferences(body,registry)).toEqual([]);
  expect(pageReferences(`${link} ${link}`,registry)).toHaveLength(1);
 });
 test('resolves independently owned paper-page paths and rejects unknown or invalid page destinations',()=>{
  expect(pageReferences('[Paper](/papers/zh-cn/exam1_f26/pages/paper/2.webp)',registry)).toEqual([{doc:'paper',page:2}]);
  for(const path of ['/pages/lecture-02/0.webp','/pages/lecture-02/24.webp','/pages/lecture-02/13.webp?bad','/pages/lecture-02/../13.webp','/pages/missing/1.webp'])
   expect(()=>pageReferences(`[Page](${path})`,registry)).toThrow(/source page/);
  expect(pageReferences('[Elsewhere](https://example.com/pages/lecture-02/13.webp)',registry)).toEqual([]);
 });
 test('ordinary local href is still a useful no-JS link, without enabling unsafe protocols',()=>{
  expect(renderText(link)).toContain('href="/pages/lecture-02/13.webp"');
  expect(renderText('[Bad](javascript:alert%281%29)')).not.toContain('href=');
 });
 test('the content validator rejects invalid inline page destinations',()=>{
  const id=Object.keys(documents)[0],doc=documents[id];
  const valid=structuredClone(exams);valid[0].problems[0].parts[0].solution.en=`[Page](${doc.pageBase}/1.webp)\n\n`+valid[0].problems[0].parts[0].solution.en;
  expect(()=>parseContent(valid,formulas,documents,documentsByLocale)).not.toThrow();
  const invalid=structuredClone(valid);invalid[0].problems[0].parts[0].solution.en=invalid[0].problems[0].parts[0].solution.en.replace(`${doc.pageBase}/1.webp`,`${doc.pageBase}/${doc.pages+1}.webp`);
  expect(()=>parseContent(invalid,formulas,documents,documentsByLocale)).toThrow('invalid source page');
 });
 test.skipIf(!exams.some(e=>e.id==='p2-f26'))('Q3 armature KVL cites each locale’s own circuit page, not a cross-language fallback',()=>{
  const part=exams.find(e=>e.id==='p2-f26')!.problems.find(q=>q.id==='p2-f26-q3')!.parts[0];
  for(const locale of ['en','zh'] as const){
   expect(pageReferences(part.solution[locale],documentsByLocale[locale])).toEqual([
    {doc:'lecture-11-12',page:24},{doc:'p2-f26-sol',page:9},{doc:'lecture-09',page:8}
   ]);
   expect(formulaReferences(part.solution[locale])).toEqual(['rectifier-full']);
  }
  expect(()=>parseContent(exams,formulas,documents,documentsByLocale)).not.toThrow();
  for(const locale of ['en','zh'] as const){
   const invalid=structuredClone(exams),q=invalid.find(e=>e.id==='p2-f26')!.problems.find(q=>q.id==='p2-f26-q3')!;
   const own=locale==='en'?'en':'zh-cn',other=locale==='en'?'zh-cn':'en';
   q.parts[0].solution[locale]=q.parts[0].solution[locale].replace(`/papers/${own}/`,`/papers/${other}/`);
   expect(()=>parseContent(invalid,formulas,documents,documentsByLocale)).toThrow('unknown source page');
  }
 });
 test.skipIf(!exams.some(e=>e.id==='p2-f26'))('both Q2(a) articles link the actual complex-power lecture page, without inventing a formula-sheet entry',()=>{
  const part=exams.find(e=>e.id==='p2-f26')!.problems.find(q=>q.id==='p2-f26-q2')!.parts[0];
  for(const locale of ['en','zh'] as const){expect(pageReferences(part.solution[locale],documents)).toEqual([{doc:'lecture-02',page:13}]);expect(formulaReferences(part.solution[locale])).toEqual(['generator-current']);}
  expect(formulas.every(f=>f.source.doc!=='lecture-02')).toBe(true);
 });
});
