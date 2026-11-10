import {strict as assert} from 'node:assert';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
import {displayEquations} from '../content/text.ts';
if(!exams.some(e=>e.problems.some(q=>q.id==='p2-f26-q2'))){console.log('SKIP: cited generator question is not mounted');process.exit(0);}
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_URL||'http://127.0.0.1:4173',out='artifacts/page-links';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),checks=[];
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const armature=exams.flatMap(exam=>exam.problems).find(question=>question.id==='p2-f26-q3')?.parts[0];
const semiAverage=exams.flatMap(exam=>exam.problems).find(question=>question.id==='p2-f26-q4')?.parts.find(part=>part.label==='b');
try{
 for(const locale of ['zh','en'])for(const theme of ['light','dark'])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(`${base}/problems/p2-f26-q2/`);await p.waitForSelector('[data-study-ready=true]');await p.locator('[data-part=p2-f26-q2-a] .part-trigger').click();
  const link=p.locator('[data-part=p2-f26-q2-a] [data-page-source-link="lecture-02"]');
  assert.equal(await link.getAttribute('href'),'/pages/lecture-02/13.webp');assert.equal(await link.textContent(),locale==='zh'?'第 2 讲 PDF 第 13 页':'Lecture 2, PDF page 13');
  if(width===1440){await link.hover();const preview=p.locator('[data-slot=hover-card-content]:visible');await preview.waitFor();assert((await preview.locator('img').getAttribute('src')).endsWith('/lecture-02/13.webp'));}
  await link.click();const dialog=p.locator('.source-dialog');await dialog.waitFor();assert.equal(await dialog.locator('#source-page').inputValue(),'13');assert((await dialog.locator('.source-paper img').getAttribute('src')).endsWith('/lecture-02/13.webp'));
  await p.screenshot({path:`${out}/${locale}-${theme}-${width}.png`});await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await link.evaluate(e=>e===document.activeElement));
  await link.focus();await p.keyboard.press('Enter');await dialog.waitFor();assert.equal(await dialog.locator('#source-page').inputValue(),'13');await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push({locale,theme,width,page:13,result:'pass'});
  if(armature){
   await p.goto(`${base}/problems/p2-f26-q3/`);await p.waitForSelector('[data-study-ready=true]');
   if(locale==='zh'&&fontCSS)await p.addStyleTag({content:fontCSS});
   await p.evaluate(()=>document.fonts.ready);
   const part=p.locator('[data-part=p2-f26-q3-a]');await part.locator('.part-trigger').click();
   await p.waitForSelector('[data-interaction=full-converter][data-ready=true]');
   assert.deepEqual(await part.locator('.solution-body .math-display').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-math'))),displayEquations(armature.solution[locale]),'Render the complete authored KVL and average derivation in order');
   assert.equal(await part.locator('[data-page-source-link]').count(),3);
   await p.screenshot({path:`${out}/q3-kvl-${locale}-${theme}-${width}.png`,fullPage:true});
   const pages=[['lecture-11-12',24,'/pages/lecture-11-12/24.webp'],['p2-f26-sol',9,`/papers/${locale==='zh'?'zh-cn':'en'}/practice2_f26/pages/p2-f26-sol/9.webp`],['lecture-09',8,'/pages/lecture-09/8.webp']];
   for(const [doc,page,href] of pages){
    const citation=part.locator(`[data-page-source-link="${doc}"]`);assert.equal(await citation.getAttribute('href'),href);
    if(width===1440){await citation.hover();const preview=p.locator('[data-slot=hover-card-content]:visible');await preview.waitFor();assert.equal(await preview.locator('img').getAttribute('src'),href);}
    await citation.focus();await p.keyboard.press('Enter');await dialog.waitFor();
    assert.equal(await dialog.locator('#source-page').inputValue(),String(page));assert.equal(await dialog.locator('.source-paper img').getAttribute('src'),href);
    await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await citation.evaluate(node=>node===document.activeElement));
   }
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   checks.push({question:'p2-f26-q3',locale,theme,width,circuitPage:9,independentLocalePage:true,completeKVL:true,result:'pass'});
  }
  if(semiAverage){
   await p.goto(`${base}/problems/p2-f26-q4/`);await p.waitForSelector('[data-study-ready=true]');
   if(locale==='zh'&&fontCSS)await p.addStyleTag({content:fontCSS});await p.evaluate(()=>document.fonts.ready);
   const part=p.locator('[data-part=p2-f26-q4-b]');await part.locator('.part-trigger').click();
   assert.deepEqual(await part.locator('.solution-body .math-display').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-math'))),displayEquations(semiAverage.solution[locale]),'Preserve the sheet formula, factor-of-two adaptation and full current/PF calculation');
   const formula=part.locator('.formula-link-inline');assert.equal(await formula.count(),1);assert.equal(await formula.getAttribute('href'),'/pages/reference-exam2/2.webp');
   await part.screenshot({path:`${out}/q4-sheet-${locale}-${theme}-${width}.png`});
   if(width===1440){await formula.hover();const preview=p.locator('[data-slot=hover-card-content]:visible');await preview.waitFor();assert.equal(await preview.locator('.original-excerpt img').getAttribute('src'),'/excerpts/rectifier-controlled-half.webp');}
   await formula.focus();await p.keyboard.press('Enter');await dialog.waitFor();
   assert.equal(await dialog.locator('#source-page').inputValue(),'2');assert.equal(await dialog.locator('.source-paper img').getAttribute('src'),'/pages/reference-exam2/2.webp');assert.equal(await dialog.locator('[data-source-highlight]').count(),1);assert.equal(await dialog.locator('a[href$=".pdf"]').count(),0);
   await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await formula.evaluate(node=>node===document.activeElement));
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push({question:'p2-f26-q4',locale,theme,width,sheetPage:2,formula:'rectifier-controlled-half',twoPulses:true,result:'pass'});
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),p=await c.newPage();await p.goto(`${base}/problems/p2-f26-q2/`);const link=p.locator('[data-page-source-link="lecture-02"]');assert(await link.isVisible());assert.equal(await link.getAttribute('href'),'/pages/lecture-02/13.webp');if(armature){await p.goto(`${base}/problems/p2-f26-q3/`);const source=p.locator('[data-part=p2-f26-q3-a] [data-page-source-link="p2-f26-sol"]');assert(await source.isVisible());assert.equal(await source.getAttribute('href'),'/papers/zh-cn/practice2_f26/pages/p2-f26-sol/9.webp');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 if(semiAverage){await p.goto(`${base}/problems/p2-f26-q4/`);const source=p.locator('[data-part=p2-f26-q4-b] .formula-link-inline');assert(await source.isVisible());assert.equal(await source.getAttribute('href'),'/pages/reference-exam2/2.webp');}
 await c.close();checks.push({noJavaScript:true,result:'pass'});
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2));console.log('PASS',JSON.stringify(checks));
}finally{await browser.close();}
