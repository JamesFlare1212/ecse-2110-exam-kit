import {describe,expect,test} from 'bun:test';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {readQuestionMarkdown} from '../content/markdown';
import {parseText,displayEquations,formulaReferences,solutionFigures,type TextNode} from '../content/text';
import {renderText} from '../src/lib/math';
import {semanticMarkdown} from './fixtures/semantic-markdown';
import baseline from './fixtures/typography-preservation.json';
import {course} from '../content/course';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const textHash=(s:string|undefined)=>s?sha(semanticMarkdown(s)):null;
const active=course.id==='ecse-2110';
const article=(file:string)=>readQuestionMarkdown(readFileSync(file,'utf8'),file,JSON.parse(readFileSync(resolve(dirname(dirname(file)),'figure-sources.json'),'utf8')));

describe('Authored math and compact Markdown flow',()=>{
 test('multiple blocks use a shared rhythm rather than blank break elements plus KaTeX margins',()=>{
  const html=renderText('Voltage:\n\n$$\nv(t)=200\\cos(377t)\n$$\n\nPower:\n\n$$\np(t)=800\n$$');
  expect(html).toContain('class="markdown-flow"');expect(html.match(/markdown-math/g)).toHaveLength(2);expect(html).not.toContain('<br><br>');
  expect(html.match(/katex-display/g)).toHaveLength(2);
 });
 test('inline fragments remain inline, lists remain semantic and no runtime unit guessing occurs',()=>{
  expect(renderText('A $10\\,\\mathrm A$ current.')).not.toContain('markdown-flow');
  expect(renderText('- First\n- Second').match(/role="listitem"/g)).toHaveLength(2);
  expect(renderText('25 N · m')).toBe('25 N · m'); // author Markdown, never silently rewrite text
  expect(renderText('<script>x</script>')).not.toContain('<script>');
 });
});

describe.skipIf(!active)('ECSE presentation-only preservation',()=>{
 test('all 78 article question wordings, prompt facts, givens, IDs, sources, displays and links are unchanged',()=>{
  for(const [file,old]of Object.entries(baseline)){
   if(!existsSync(file))continue;
   const q=article(file);expect({id:q.id,number:q.number,points:q.points,givens:q.givens,originalFigure:q.originalFigure,lectures:q.lectures}).toEqual({id:old.id,number:old.number,points:old.points,givens:old.givens,originalFigure:old.originalFigure,lectures:old.lectures});
   expect(sha(semanticMarkdown(q.statement)),file).toBe(old.statement);expect(sha(JSON.stringify(displayEquations(q.statement))),file).toBe(old.questionEquations);
   expect({guide:textHash(q.guide),note:textHash(q.note),caption:textHash(q.figureCaption)},file).toEqual({guide:old.guide,note:old.note,caption:old.caption});
   expect(q.parts.map(p=>({id:p.id,label:p.label,points:p.points,sourcePage:p.sourcePage,solutionPage:p.solutionPage,...(p.figure?{figure:p.figure}:{}),prompt:sha(semanticMarkdown(p.prompt)),displayed:sha(JSON.stringify(displayEquations(p.solution))),formulas:formulaReferences(p.solution),figures:solutionFigures(p.solution),solutionText:textHash(p.solution),note:textHash(p.note),caption:textHash(p.figureCaption)})),file).toEqual(old.parts);
  }
 });
 test('physical quantities no longer leak into ordinary text nodes anywhere in the articles',()=>{
  const quantity=/(?<![\w.])\d+(?:[.:]\d+)?(?:\/\d+(?:[.:]\d+)?)?\s*(?:-\s*)?(?:N\s*[·⋅.]\s*m|MVA|kVA|kvar|kW|kV|mA|mH|Hz|VA|W|V|A|rpm|hp|volts?|amperes?|watts?|hours?)(?=$|[\s,.;:!?)，。；：、）])/g;
  for(const file of Object.keys(baseline)){
   if(!existsSync(file))continue;
   const q=article(file),bodies=[q.statement,q.guide,q.note,q.figureCaption,...q.parts.flatMap(p=>[p.prompt,p.solution,p.note,p.figureCaption])];
   for(const body of bodies){if(!body)continue;function visit(node:TextNode){if(node.type==='text')expect([...node.value.matchAll(quantity)],`${file}: ${node.value}`).toHaveLength(0);if('children'in node)node.children.forEach(visit);}visit(parseText(body));}
  }
 });
 test('loads, transformer measurements and characteristics use actual authored lists in both locales',()=>{
  for(const locale of ['en','zh-cn'])for(const [paper,n,count]of [['exam1_f26',4,3],['exam1_f26',6,2],['exam2_s25',6,2],['practice1_f26',9,2],['practice1_f26',10,2]] as const){
   const file=`content/${locale}/${paper}/questions/q${n}.md`;if(!existsSync(file))continue;
   const q=article(file),list=parseText(q.statement).children.find(node=>node.type==='list');expect(list?.type==='list'?list.children.length:0).toBe(count);
  }
 });
 test('transcription anomalies remain as printed rather than silently becoming corrected givens',()=>{
  for(const locale of ['en','zh-cn']){const file=`content/${locale}/practice1_f26/questions/q9.md`;if(!existsSync(file))continue;const q=article(file);expect(q.statement).toContain('9{:}5');expect(q.statement).toContain('37{:}5');expect(q.parts[1].solution).toContain('9.5');expect(q.parts[1].note).toBeTruthy();}
 });
});
