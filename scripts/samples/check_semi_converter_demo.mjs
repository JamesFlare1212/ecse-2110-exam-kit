// Offline interaction/layout QA. No server or changes to the user's preview.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {strict as assert} from 'node:assert';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const html=await readFile(new URL('../../artifacts/semi-converter-animation/sample.html',import.meta.url),'utf8');
const output=new URL('../../artifacts/semi-converter-animation/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const checks=[];
try {
 for(const width of [390,728])for(const colorScheme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme,reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.setContent(html);await page.waitForSelector('#waves .cursor',{state:'attached'});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#waves .row-label').count(),9);
  for(const [index,pair,source]of [[0,'D₁ + D₂','0'],[1,'S₁ + D₂','+1.00'],[2,'D₁ + D₂','0'],[3,'S₂ + D₁','-1.00']]) {
   await page.locator(`.stage:has(input[value="${index}"])`).click();assert.equal(await page.locator('#pair').textContent(),pair);assert.equal(await page.locator('#source-current').textContent(),source);
   const active=await page.locator('#bridge .component.is-on').evaluateAll(es=>[...new Set(es.map(e=>e.dataset.part))]);
   const required=index===1?['S1','D2']:index===3?['S2','D1']:['D1','D2'];for(const p of required)assert(active.includes(p));
   for(const p of ['S1','S2','D1','D2'].filter(p=>!required.includes(p)))assert(!active.includes(p));
  }
  await page.locator('.stage:has(input[value="1"])').click();await page.locator('#play').click();await page.waitForTimeout(150);
  const a=await page.locator('#angle').inputValue(),position=await page.locator('.carrier').first().getAttribute('cx');
  assert(Number(a)>30&&Number(a)<180);assert.equal(await page.locator('.carrier:not([hidden])').count(),3);
  await page.waitForTimeout(150);assert.notEqual(await page.locator('.carrier').first().getAttribute('cx'),position);
  await page.locator('#play').click();const paused=await page.locator('#angle').inputValue();await page.waitForTimeout(100);assert.equal(await page.locator('#angle').inputValue(),paused);assert.equal(await page.locator('.carrier:not([hidden])').count(),0);
  // One frame from 180 degrees must stop at that boundary, with S1 off.
  await page.locator('#angle').evaluate(e=>{e.value='179.5';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#play').getAttribute('aria-pressed')==='false');assert.equal(await page.locator('#angle').inputValue(),'180');assert.equal(await page.locator('#pair').textContent(),'D₁ + D₂');
  await page.locator('#angle').evaluate(e=>{e.value='195';e.dispatchEvent(new Event('input',{bubbles:true}));});assert((await page.locator('#waves .value').last().textContent()).startsWith('-'));
  // Native radio keyboard navigation and native range keyboard access.
  await page.locator('[name=stage]:checked').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#pair').textContent(),'S₂ + D₁');
  await page.locator('#angle').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#angle').inputValue(),'210.5');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
  await page.screenshot({path:new URL(`sample-${colorScheme}-${width}.png`,output).pathname,fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);checks.push({width,colorScheme,result:'pass',rows:9,networkRequests:0});await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();await page.setContent(html);await page.waitForSelector('#waves .cursor',{state:'attached'});await page.locator('#play').click();assert.equal(await page.locator('#angle').inputValue(),'30');assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('.carrier:not([hidden])').count(),0);checks.push({reducedMotion:true,result:'pass'});await context.close();
 await writeFile(new URL('report.json',output),JSON.stringify({checks},null,2));console.log('PASS',JSON.stringify(checks));
} finally {await browser.close();}
