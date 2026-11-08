// Regression checks use disposable browser contexts and synthetic learning records.
// PLAYWRIGHT_MODULE may point to an isolated Playwright install; no user profile is opened.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4187', key='ecse2100-fieldnotes-v1';
const checks=[], errors=[];
const ids=['e1-f25','e1-f26','e1-s26','e2-f25','e2-s26'].flatMap(p=>[1,2,3,4].map(n=>`${p}-q${n}`));
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
const ready=p=>p.waitForFunction(()=>document.querySelector('main[data-study-ready=true]'));
const stored=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const goto=async(p,id)=>{await p.goto(`${base}/problems/${id}/`);await ready(p);};
const newContext=async(options={})=>{const c=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce',...options});c.on('page',p=>{p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));});return c;};
const within=async(locator,viewport)=>locator.evaluate((e,v)=>{const r=e.getBoundingClientRect();return r.top>=-1&&r.bottom<=v.height+1&&r.left>=-1&&r.right<=v.width+1;},viewport);
try {
  for(const locale of ['zh','en']){
    const c=await newContext({viewport:{width:375,height:812}});
    await c.addInitScript(({key,locale})=>{if(location.protocol==='http:')localStorage.setItem(key,JSON.stringify({version:1,locale}));},{key,locale});
    await c.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue());
    const p=await c.newPage();await p.goto(`${base}/problems/e2-s26-q3/`);
    assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).visibility),'visible');
    await p.locator('#problem-title').waitFor({state:'visible'});
    await p.waitForTimeout(5200);assert.ok((await p.locator('#startup-status').innerText()).includes('not ready'));
    pass('I1/I30: failed scripts preserve readable static content and visible recovery',{locale});await c.close();
  }
  const c=await newContext(),p=await c.newPage();
  await goto(p,'e2-s26-q3');
  const note='x'.repeat(19999)+'😀TAIL';
  const legacy={version:1,locale:'zh',notes:{'e9-f99-q1':note,'e2-s26-q3':note},mode:'practice',revealed:{'e9-f99-q1-a':999},completed:{'e9-f99-q1-a':true},bookmarks:{'e9-f99-q1':true}};
  await p.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:legacy});await p.reload();await ready(p);
  let saved=await stored(p);assert.deepEqual(saved.notes,legacy.notes);assert.deepEqual(saved.revealed,legacy.revealed);assert.equal(saved.mode,'practice');
  pass('I41/C10: long Unicode notes and retired/unplugged records survive startup');
  for(const raw of ['{','null','[]','{"version":2,"notes":{"keep":"unchanged"}}']){
    await p.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await p.reload();await ready(p);
    await p.locator('.problem-title-row button').click();await p.waitForTimeout(100);
    assert.equal(await p.evaluate(key=>localStorage.getItem(key),key),raw);assert.ok(await p.locator('.storage-status').isVisible());
  }
  pass('I24: invalid/unsupported records remain byte-for-byte intact');
  // Replace only this test context's synthetic record before checking cross-tab updates.
  await p.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,locale:'zh'})),key);await p.reload();await ready(p);
  const q=await c.newPage();await goto(q,'e2-s26-q4');
  await Promise.all([p.locator('.problem-title-row button').click(),q.locator('.problem-title-row button').click()]);
  await p.waitForFunction(key=>{const d=JSON.parse(localStorage.getItem(key));return d.bookmarks?.['e2-s26-q3']&&d.bookmarks?.['e2-s26-q4'];},key);
  await p.locator('.solution-section-heading button').click();await q.locator('.solution-section-heading button').click();
  await Promise.all([p.locator('[data-part="e2-s26-q3-a"] .part-actions button').first().click(),q.locator('[data-part="e2-s26-q4-a"] .part-actions button').first().click()]);
  await p.waitForFunction(key=>{const d=JSON.parse(localStorage.getItem(key));return d.completed?.['e2-s26-q3-a']&&d.completed?.['e2-s26-q4-a'];},key);
  await p.locator('.problem-title-row button').click();await q.getByRole('button',{name:'Switch to English',exact:true}).click();
  await p.waitForFunction(key=>{const d=JSON.parse(localStorage.getItem(key));return d.bookmarks?.['e2-s26-q3']===false&&d.bookmarks?.['e2-s26-q4']&&d.locale==='en';},key);
  await q.reload();await ready(q);saved=await stored(q);assert.equal(saved.completed['e2-s26-q3-a'],true);assert.equal(saved.completed['e2-s26-q4-a'],true);
  pass('I23: concurrent tab updates, undo, preferences and reload preserve independent progress');await q.close();
  // Browser navigation in saved English must remain visible on every destination.
  for(const id of ids){await goto(p,id);assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.ok(await p.locator('#problem-title').isVisible());assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).visibility),'visible');}
  await goto(p,'e2-s26-q3');await p.locator('a.question-link[href="/problems/e2-s26-q4/"]').first().click();await p.waitForURL('**/problems/e2-s26-q4/');assert.ok(await p.locator('#problem-title').isVisible());
  pass('I1: all 20 saved-English destinations and client navigation remain visible');
  // Source high-page -> short document, input, scaling, citation and recovery.
  for(const viewport of [{width:1280,height:800},{width:375,height:812},{width:667,height:375}]){
    await p.setViewportSize(viewport);await goto(p,'e2-s26-q3');
    await p.getByRole('button',{name:'Lecture 10',exact:true}).click();await p.locator('.source-paper img').waitFor();await p.keyboard.press('Escape');
    await p.locator('.solution-section-heading button').click();
    await p.locator('[data-part="e2-s26-q3-a"] .formula-link').first().click();
    assert.equal(await p.locator('#source-page').inputValue(),'4');
    await p.locator('#source-page').fill('');await p.locator('#source-page').press('Tab');assert.equal(await p.locator('#source-page').inputValue(),'4');
    for(const control of ['.source-toolbar','.source-footer','[data-slot="dialog-close"]'])assert.ok(await within(p.locator('.source-dialog '+control).first(),viewport),control+' fits '+JSON.stringify(viewport));
    const before=await p.locator('.source-paper').evaluate(e=>e.getBoundingClientRect().width);
    await p.getByRole('button',{name:'Zoom out',exact:true}).click();
    await p.waitForFunction(()=>document.querySelector('.zoom-label')?.textContent==='80%');
    await p.waitForFunction(before=>document.querySelector('.source-paper').getBoundingClientRect().width<before-5,before);
    const after=await p.locator('.source-paper').evaluate(e=>e.getBoundingClientRect().width);
    assert.ok(after<before-5,`zoom ${before} -> ${after}`);
    assert.equal(await p.locator('[data-source-highlight]').getAttribute('aria-label'),'Cited region');
    await p.keyboard.press('Escape');assert.ok(await p.locator('[data-part="e2-s26-q3-a"] .formula-link').first().evaluate(e=>e===document.activeElement));
    pass('I3/I4/I12/I16/I31: source transitions, empty input, actual scaling, labels and short viewport',{viewport});
  }
  await p.setViewportSize({width:375,height:812});await goto(p,'e2-s26-q3');
  await p.getByRole('button',{name:'Search problems and formulas',exact:true}).click();
  assert.equal(await p.locator('.search-result').count(),20);
  await p.locator('#global-search').fill('reflection');assert.ok(await p.locator('.search-result[href*="#"]').count()>1);
  const results=p.locator('.search-results');await results.evaluate(e=>e.scrollTop=e.scrollHeight);await p.locator('#global-search').fill('Gauss');await p.waitForTimeout(80);assert.equal(await results.evaluate(e=>e.scrollTop),0);
  await p.locator('#global-search').fill('50 Ω');assert.ok(await p.locator('.search-result').count()>0);
  await p.locator('#global-search').fill('发生器端反射系数');const result=p.locator('.search-result[href*="#"]').first();const href=await result.getAttribute('href');assert.ok(href.includes('#'));await result.click();await p.waitForURL('**'+href);await p.waitForTimeout(100);assert.ok(await p.locator('.part-trigger:focus').count());
  const target=await p.locator('.part-trigger:focus').evaluate(e=>e.closest('[data-part]').dataset.part);assert.equal('#'+target,new URL(p.url()).hash);await p.reload();await ready(p);await p.waitForSelector('.part-trigger:focus');
  pass('I2/I5/I14/I20/I25/I26: complete search, visible mathematics, per-part links, reset, focus and deep reload');
  for(const locale of ['zh','en'])for(const reducedMotion of ['reduce','no-preference']){
    const context=await newContext({viewport:{width:375,height:812},reducedMotion});
    await context.addInitScript(({key,locale})=>{if(location.protocol==='http:')localStorage.setItem(key,JSON.stringify({version:1,locale}));},{key,locale});
    const page=await context.newPage();await page.goto(`${base}${href}`);await ready(page);await page.waitForSelector('.part-trigger:focus');
    assert.equal(await page.locator('.part-trigger:focus').evaluate(e=>e.closest('[data-part]').dataset.part),target);
    await context.close();
  }
  pass('I26/C5: direct part links focus correctly in both languages and motion preferences');
  await p.setViewportSize({width:667,height:375});await p.getByRole('button',{name:'Search problems and formulas',exact:true}).click();assert.ok(await within(p.locator('.search-hint'),{width:667,height:375}));await p.keyboard.press('Escape');
  await p.setViewportSize({width:375,height:812});await goto(p,'e2-s26-q3');
  await p.locator('[data-sidebar-toggle="navigation"]').click();await p.locator('#mobile-exam-navigation').getByRole('button',{name:/Crib sheet/}).first().click();await p.waitForSelector('.library-dialog');await p.waitForTimeout(250);assert.ok(await p.locator('.library-dialog').evaluate(e=>e.contains(document.activeElement)));
  await p.keyboard.press('Control+b');assert.equal(await p.locator('#mobile-exam-navigation').isVisible(),false);assert.ok(await p.locator('.library-dialog').evaluate(e=>e.contains(document.activeElement)));await p.keyboard.press('Escape');
  pass('I9/I21: sheet-to-library focus stays inside modal; shortcuts do not open background panels');
  await p.locator('[data-sidebar-toggle="references"]').click();await p.locator('#mobile-reference-sidebar').getByRole('tab',{name:'Lecture notes',exact:true}).click();await p.keyboard.press('Escape');await p.locator('[data-sidebar-toggle="references"]').click();assert.equal(await p.locator('#mobile-reference-sidebar [role=tab][aria-selected=true]').innerText(),'Lecture notes');await p.keyboard.press('Escape');
  pass('I28: mobile sheets retain their internal tab state');
  await goto(p,'e1-f26-q3');const group=p.locator('.figure-version').first();await group.getByRole('radio').first().focus();await p.keyboard.press('ArrowRight');assert.equal(await group.getByRole('radio').nth(1).getAttribute('aria-checked'),'true');await p.locator('.figure-toolbar button[aria-label="Enlarge figure"]').first().click();await p.waitForSelector('.figure-dialog');await p.locator('.figure-enlarged').focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);assert.ok(await p.locator('.figure-enlarged').evaluate(e=>e.scrollLeft>0));await p.keyboard.press('Escape');
  pass('I11/I40: native radio arrows select image versions; enlarged images scroll by keyboard');
  await c.close();
  assert.deepEqual(errors,[],'No unexpected browser exceptions');
} finally {
  await mkdir('artifacts',{recursive:true});await writeFile('artifacts/repairs-qa.json',JSON.stringify({checks,errors},null,2));await browser.close();
}
