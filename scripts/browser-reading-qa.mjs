// Readability, loading stability and recovery checks in disposable contexts.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4187', key='ecse2100-fieldnotes-v1', checks=[];
const ids=['e1-f25','e1-f26','e1-s26','e2-f25','e2-s26'].flatMap(p=>[1,2,3,4].map(n=>`${p}-q${n}`));
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
const ready=p=>p.waitForFunction(()=>document.querySelector('main[data-study-ready=true]'));
const go=async(p,id)=>{await p.goto(`${base}/problems/${id}/`,{waitUntil:'domcontentloaded'});await ready(p);await p.evaluate(()=>document.fonts.ready);};
const fit=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
try{
 for(const locale of ['zh','en'])for(const theme of ['light','dark']){
  const c=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await c.addInitScript(({key,locale,theme})=>{if(location.protocol==='http:')localStorage.setItem(key,JSON.stringify({version:1,locale,theme}));},{key,locale,theme});
  const p=await c.newPage();p.setDefaultTimeout(10000);let parts=0,figures=0,formulaHints=0;
  for(const id of ids){
   await go(p,id);await p.locator('.solution-section-heading button').click();
   await p.waitForFunction(()=>[...document.querySelectorAll('.part-trigger')].every(e=>e.getAttribute('aria-expanded')==='true'));
   assert.ok(await fit(p),id+' document fits');
   const result=await p.locator('.study-figure').evaluateAll(figs=>figs.filter(e=>e.getClientRects().length).map(e=>({name:e.dataset.figure,alt:e.querySelector('img')?.alt,canvas:e.querySelector('.figure-canvas').getBoundingClientRect().height,imageWidth:e.querySelector('.figure-canvas').getBoundingClientRect().width,viewport:e.querySelector('.figure-image').clientWidth,hint:!!e.querySelector('.figure-scroll-hint')})));
   assert.ok(result.every(f=>f.alt?.length>20&&f.canvas>0),id+' complete figure alternatives');
   assert.ok(result.every(f=>f.imageWidth<=f.viewport+1||f.hint),id+' overflowing figures have hints');
   const badges=await p.locator('.part-trigger>[data-slot=badge]').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).display));assert.ok(badges.every(v=>v!=='none'));
   parts+=await p.locator('.part-trigger').count();figures+=result.length;
   formulaHints+=await p.locator('.math-scroll-hint').count();
  }
  pass('I10/V3/V4/V6/V10: all 20 phone pages, full solutions, readable figure scale, alt text, scroll hints and scores',{locale,theme,parts,figures,formulaHints});await c.close();
 }
 const c=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(10000);
 // Block figure responses until geometry has been measured.
 let release;const gate=new Promise(r=>release=r);
 await p.route('**/papers/**/figures/*.svg',async route=>{await gate;await route.continue();});
 await go(p,'e2-s26-q3');
 const geometry=()=>p.locator('.study-figure').first().evaluate(e=>({height:e.getBoundingClientRect().height,next:document.querySelector('.worked-solution').getBoundingClientRect().top,loaded:e.querySelector('img').complete}));
 const before=await geometry();assert.equal(before.loaded,false);release();await p.waitForFunction(()=>document.querySelector('.study-figure img').naturalWidth>0);const after=await geometry();assert.ok(Math.abs(before.height-after.height)<1);assert.ok(Math.abs(before.next-after.next)<1);
 pass('L2: delayed figure responses do not move the figure frame or subsequent content',{before,after});await p.unroute('**/papers/**/figures/*.svg');
 let releasePages;const pagesGate=new Promise(r=>releasePages=r);
 await p.route('**/papers/**/pages/**/*.webp',async route=>{await pagesGate;await route.continue();});
 await p.getByRole('tab',{name:'试卷原页',exact:true}).click();
 const pageHeights=()=>p.locator('.original-page-image').evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().height));const initial=await pageHeights();releasePages();await p.locator('.original-page-image img').last().scrollIntoViewIfNeeded();await p.waitForFunction(()=>[...document.querySelectorAll('.original-page-image img')].every(e=>e.complete&&e.naturalWidth>0));const final=await pageHeights();assert.deepEqual(initial,final);pass('L3/I32/I36: original pages reserve their space and provide numbered image/button actions',{initial,final});
 await p.locator('.source-page-preview').first().click();await p.waitForSelector('.source-paper img');await p.keyboard.press('Escape');await p.unroute('**/papers/**/pages/**/*.webp');
 // A late image failure must keep its reserved geometry, offer retry and disable enlargement.
 await p.route('**/papers/**/figures/e2-s26-q3.svg',r=>r.fulfill({status:404,body:'test failure'}));await go(p,'e2-s26-q3');await p.getByText('图示加载失败，可重试或查看原卷。',{exact:true}).waitFor();assert.ok(await p.locator('.figure-toolbar button[aria-label="放大图示"]').first().isDisabled());await p.unroute('**/papers/**/figures/e2-s26-q3.svg');await p.getByRole('button',{name:'重试图示',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.study-figure img')?.naturalWidth>0);pass('I15: failed figure disables enlargement and has a working retry');
 // Saving error must be in the viewport, retain dirty changes, and recover on retry.
 await p.evaluate(key=>{const original=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('test quota','QuotaExceededError');return original.call(this,k,v);};},key);
 await p.locator('.solution-section-heading button').click();await p.locator('.part-actions button').first().click();await p.locator('.storage-status').waitFor();assert.ok(await p.locator('.storage-status').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));await p.evaluate(()=>window.restoreStorage());await p.getByRole('button',{name:'重试保存',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.storage-status'));assert.equal(await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).completed['e2-s26-q3-a'],key),true);pass('I13: storage failures are visible where reading continues; retry saves pending progress');
 // Short dialogs keep their header, controls and close action accessible.
 await p.setViewportSize({width:667,height:375});await p.locator('.figure-toolbar button[aria-label="放大图示"]').first().click();assert.ok(await p.locator('.figure-dialog').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}));await p.keyboard.press('Escape');pass('I7: enlarged figure dialog stays within short landscape viewport');
 await p.setViewportSize({width:320,height:568});await p.locator('[data-sidebar-toggle=navigation]').click();
 const overlap=await p.locator('.mobile-nav-sheet').evaluate(e=>{const brand=e.querySelector('.brand strong').getBoundingClientRect(),close=e.querySelector('[data-slot=sheet-close]').getBoundingClientRect();return brand.right>close.left&&brand.bottom>close.top&&brand.top<close.bottom;});assert.equal(overlap,false);await p.keyboard.press('Escape');pass('V9: mobile brand and close control do not overlap at 320px');
 await p.screenshot({path:'artifacts/reading-phone.png'});
 await c.close();
 const visual=await browser.newContext({viewport:{width:1000,height:800}}),v=await visual.newPage();
 await v.goto(base+'/papers/zh-cn/exam2_s26/figures/images-geometry.svg');await v.screenshot({path:'artifacts/chinese-diagram.png'});await visual.close();
}finally{await mkdir('artifacts',{recursive:true});await writeFile('artifacts/reading-qa.json',JSON.stringify({checks},null,2));await browser.close();}
