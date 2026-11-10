// The reader goes directly from the question to its subparts; no hidden overview.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
import {displayEquations} from '../content/text.ts';
const questions=exams.flatMap(exam=>exam.problems);
const question=questions.find(q=>q.id==='p2-f26-q3')??questions.find(q=>q.parts.length>1)??questions[0];
const next=questions.find(q=>q.id!==question.id);
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173',output='artifacts/reader-sections',checks=[];
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const retired='.problem-overview,#overview-title,.overview-prose,.overview-references,[data-problem-guide],.worked-solution,.solution-section-heading';
await mkdir(output,{recursive:true});
async function removed(page){
  assert.equal(await page.locator(retired).count(),0,'Retired elements must be absent, not hidden');
  for(const label of ['一步一步推导','先读懂这道题','WORK IT THROUGH','Before the derivation'])assert.equal(await page.getByText(label,{exact:true}).count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
}
try{
  for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    try{
      await context.addInitScript(({key,locale,theme,part})=>{
        if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,locale,theme,mode:'practice',notes:{[part]:'preserve legacy note'},revealed:{[part]:99}}));
      },{key:course.storageKey,locale,theme,part:question.parts[0].id});
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/problems/${question.id}/`);await page.waitForSelector('[data-study-ready=true]');
      if(locale==='zh'&&fontCSS){await page.addStyleTag({content:fontCSS});await page.evaluate(()=>document.fonts.ready);}
      await removed(page);
      const toggle=page.locator('[data-solution-toggle]'),parts=page.locator('.part-trigger');
      assert.equal(await toggle.count(),1);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('main').getByRole('heading',{level:2}).count(),question.parts.length,'Subparts are the next heading level after the problem title');
      await parts.first().click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('.part-trigger[aria-expanded=true]').count(),1);
      await toggle.click();assert.equal(await page.locator('.part-trigger[aria-expanded=true]').count(),0);
      assert.equal(await toggle.textContent(),locale==='zh'?'展开全部解答':'Reveal all solutions');
      await toggle.click();assert.equal(await page.locator('.part-trigger[aria-expanded=true]').count(),question.parts.length);
      assert.equal(await toggle.textContent(),locale==='zh'?'收起全部解答':'Collapse all solutions');
      for(const part of question.parts)assert.deepEqual(await page.locator(`[data-part="${part.id}"] .solution-body .math-display`).evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-math'))),displayEquations(part.solution[locale]),'Every authored part calculation stays intact');
      for(let index=0;index<question.parts.length;index++)await parts.nth(index).click();
      assert.equal(await toggle.getAttribute('aria-expanded'),'false','The global action follows individual accordion changes');
      await toggle.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${locale}-${theme}-${width}.png`});
      if(next){
        // A real anchor uses Astro's ClientRouter, including when navigation is in a Sheet.
        await page.evaluate(id=>{const link=document.createElement('a');link.href=`/problems/${id}/`;document.body.append(link);link.click();link.remove();},next.id);
        await page.waitForFunction(id=>document.querySelector('[data-study-ready=true]')?.dataset.problem===id,next.id);
        await removed(page);await page.goBack();
        await page.waitForFunction(id=>document.querySelector('[data-study-ready=true]')?.dataset.problem===id,question.id);
      }
      const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),course.storageKey);
      assert.equal(stored.notes[question.parts[0].id],'preserve legacy note');assert.equal(stored.revealed[question.parts[0].id],99);
      assert.deepEqual(errors,[]);checks.push({locale,theme,width,parts:question.parts.length,retiredMarkupAbsent:true,fullSolutionsPreserved:true});
    }finally{await context.close();}
  }
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:1000}});
  try{
    const page=await context.newPage();await page.goto(`${base}/problems/${question.id}/`);await removed(page);
    assert.equal(await page.locator('[data-solution-toggle]').isVisible(),false);
    assert.equal(await page.locator('.solution-body:visible').count(),question.parts.length);
    checks.push({noJavaScript:true,fullSolutionsPreserved:true});
  }finally{await context.close();}
  console.log(`PASS ${checks.length} direct question-to-subpart cases: removed overview, global/individual toggles, full solutions and legacy records`);
}finally{await writeFile(`${output}/report.json`,JSON.stringify({checks},null,2)+'\n');await browser.close();}
