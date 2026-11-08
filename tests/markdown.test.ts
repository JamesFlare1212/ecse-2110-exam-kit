import {describe,expect,test} from 'bun:test';
import {existsSync,readFileSync} from 'node:fs';
import {course} from '../content/course';
import {resolve} from 'node:path';
import {parseDocument} from 'yaml';
import {parseQuestionBody,readQuestionMarkdown} from '../content/markdown';
import {renderText} from '../src/lib/math';
import {displayEquations,formulaReferences,hasFormulaReference,parseText} from '../content/text';

const directory=resolve(import.meta.dir,'../content/en/exam1_f26');
const file=resolve(directory,'questions/q1.md');
const active=course.id==='ecse-2100'&&existsSync(file);
const resources=active?JSON.parse(readFileSync(resolve(directory,'figure-sources.json'),'utf8')):{figures:{}};
const source=active?readFileSync(file,'utf8'):'';
const read=(text:string,path=file)=>readQuestionMarkdown(text,path,resources);

// ECSE wording/parser regressions; template.test.ts also exercises independent course articles.
describe.skipIf(!active)('Natural Markdown question articles',()=>{
  test('derives defaults and stable part IDs while preserving original prose and equations',()=>{
    const problem=read(source);
    expect(problem.id).toBe('e1-f26-q1');
    expect(problem.number).toBe(1);
    expect(problem.figure).toBe(problem.id);
    expect(problem.parts[0].id).toBe('e1-f26-q1-ai');
    expect(problem.parts[0].sourcePage).toBe(2);
    expect(problem.parts.at(-1)?.questionFigure?.source.page).toBe(3);
    expect(problem.statement).toContain('$\\Delta z\\ll\\lambda$');
    expect(problem.guide).toContain('$60\\,\\mathrm m$');
    expect(displayEquations(problem.parts[0].solution)[0]).toBe('\\gamma=\\alpha+j\\beta');
    expect(formulaReferences(problem.parts[0].solution)).toEqual(['lossy-wave']);
    expect(problem.parts[0]).not.toHaveProperty('answer');
    expect(source).not.toMatch(/### Step|#### Explanation|#### Equation|### Answer/);
  });
  test('uses the AST so headings and boxed formulas inside code are ordinary content',()=>{
    const changed=source.replace('This problem connects','```text\n## Part fake\n\\boxed{fake}\n```\n\nThis problem connects');
    expect(read(changed).guide).toContain('## Part fake');
    expect(read(changed).parts).toHaveLength(4);
    expect(displayEquations('```tex\n\\boxed{fake}\n```')).toEqual([]);
  });
  test('allows consecutive paragraphs, lists, code and equations without step headings',()=>{
    const changed=source.replace('### Solution',()=>'### Solution\n\nA short paragraph.\n\n- First idea\n- Second idea\n\n```text\nnotes\n```\n\n$$\nx=1\n$$');
    const solution=read(changed).parts[0].solution;
    expect(solution).toContain('A short paragraph.');
    expect(solution).toContain('- Second idea');
    expect(displayEquations(solution)[0]).toBe('x=1');
    expect(displayEquations(solution).at(-1)).toContain('\\boxed{');
  });
  test('derives sources from real prose links while ignoring code and mathematical text',()=>{
    const prose='**Use [Gauss $E$](formula:gauss)** and [displacement](formula:constitutive). '
      +'`[code](formula:ignored)` and $[math](formula:ignored)$, then [Gauss again](formula:gauss).';
    expect(formulaReferences(prose)).toEqual(['gauss','constitutive']);
    expect(hasFormulaReference(parseText(prose))).toBe(true);
    expect(formulaReferences('```md\n[code](formula:ignored)\n```')).toEqual([]);
  });
  const cases:[string,(text:string)=>string,RegExp][]=[
    ['missing question',text=>text.replace('## Question','## Prompt'),/unknown section|missing section Question/],
    ['duplicate section',text=>text.replace('## Question','## Guide'),/duplicate section/],
    ['unknown part section',text=>text.replace('### Solution','### Result'),/unknown section|missing section Solution/],
    ['legacy step wrappers',text=>text.replace('### Solution','### Step 1'),/unknown section/],
    ['unboxed final result',text=>text.replace('\\boxed{','\\operatorname{'),/displayed boxed formula/],
    ['malformed inline formula link',text=>text.replace('formula:lossy-wave','formula:lossy-wave/invalid'),/formula:formula-id/],
    ['duplicate YAML property',text=>text.replace('title: Transmission Line Fundamentals','title: First\ntitle: Second'),/unique/],
    ['prose in frontmatter',text=>text.replace('title: Transmission Line Fundamentals','title: First\nstatement: forbidden'),/invalid frontmatter/],
    ['missing frontmatter',text=>text.replace(/^---/,''),/YAML frontmatter/],
  ];
  test.each(cases)('rejects %s with a source filename',(_name,change,error)=>{
    expect(()=>read(change(source),'exam/questions/q1.md')).toThrow(error);
    expect(()=>read(change(source),'exam/questions/q1.md')).toThrow('exam/questions/q1.md');
  });
  test('Astro and CLI use the same frontmatter schema, defaults and body parser',()=>{
    const match=/^---\n([\s\S]*?)\n---\n/.exec(source)!;
    expect(parseQuestionBody(parseDocument(match[1]).toJS(),source.slice(match[0].length),file,resources)).toEqual(read(source));
  });
  test('renders normal Markdown while escaping HTML and script URLs',()=>{
    const html=renderText('**Equation** with $\\alpha$ and *units*.\n\n- First\n- [Lecture](/sources/lecture-02.pdf)\n\n<script>alert(1)</script>');
    expect(html).toContain('<strong>Equation</strong>');expect(html).toContain('<em>units</em>');
    expect(html).toContain('katex');expect(html).toContain('role="listitem"');
    expect(html).toContain('href="/sources/lecture-02.pdf"');expect(html).not.toContain('<script>');
    expect(renderText('[Unsafe](javascript:alert%281%29)')).toBe('Unsafe');
    expect(renderText('[Unsafe](data:text/html,hello)')).toBe('Unsafe');
    expect(renderText('`a_b`')).toBe('<code>a_b</code>');
    expect(renderText('$$\\rho(r)=\\rho_0 a/r$$')).toContain('katex-display');
  });
});
