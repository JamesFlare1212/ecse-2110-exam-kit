import {strict as assert} from 'node:assert';
import {mkdir,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
if(!exams.some(e=>e.problems.some(q=>q.id==='p2-f26-q2'))){console.log('SKIP: cited generator question is not mounted');process.exit(0);}
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_URL||'http://127.0.0.1:4173',out='artifacts/page-links';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),checks=[];
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
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);checks.push({locale,theme,width,page:13,result:'pass'});await context.close();
 }
 const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),p=await c.newPage();await p.goto(`${base}/problems/p2-f26-q2/`);const link=p.locator('[data-page-source-link="lecture-02"]');assert(await link.isVisible());assert.equal(await link.getAttribute('href'),'/pages/lecture-02/13.webp');await c.close();checks.push({noJavaScript:true,result:'pass'});
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2));console.log('PASS',JSON.stringify(checks));
}finally{await browser.close();}
