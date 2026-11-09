// Reading must not wait for fonts or hydration. Run against a production build.
import assert from 'node:assert/strict';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {loadContent} from '../content/papers.server.ts';
import {checkHoverContrast} from './browser-hover-qa.mjs';
import {checkStudyUX} from './browser-study-ux-qa.mjs';
import {checkNavigationStability} from './browser-navigation-qa.mjs';
import {checkFigureSegments} from './browser-figure-qa.mjs';
import {originalFigureSample,sourceReadingSample} from './browser-samples.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM?{executablePath:process.env.QA_CHROMIUM}:{}),args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173',checks=[];
const ids=(await readdir(new URL('../build/problems/',import.meta.url))).sort();
const sampleId=ids.includes(course.defaultProblemId)?course.defaultProblemId:ids[0];
assert.ok(sampleId,'At least one complete paper is required');
const {exams}=loadContent();
const figureSample=originalFigureSample(exams);
const sourceSample=sourceReadingSample(exams)??sampleId;
const pass=(name,data={})=>{checks.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
const ready=p=>p.waitForFunction(()=>document.querySelector('[data-study-ready=true]'));
async function context(locale,width){
 const c=await browser.newContext({viewport:{width,height:812},reducedMotion:'reduce'});
 await c.addInitScript(({locale,storageKey})=>{
  if(location.protocol==='http:')localStorage.setItem(storageKey,JSON.stringify({version:1,locale}));
  window.readingAt=null;window.layoutShifts=[];
  const visible=selector=>{const node=document.querySelector(selector);if(!node)return false;const style=getComputedStyle(node);return node.getClientRects().length>0&&style.visibility==='visible'&&style.opacity!=='0';};
  const measure=()=>{if(visible('#problem-title')&&visible('[data-original-statement]'))window.readingAt=performance.now();else requestAnimationFrame(measure);};
  requestAnimationFrame(measure);
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.layoutShifts.push({at:e.startTime,value:e.value,sources:e.sources.map(source=>{const node=source.node?.nodeType===Node.TEXT_NODE?source.node.parentElement:source.node;return {tag:node?.tagName,id:node?.id,text:node?.textContent?.slice(0,100),previous:source.previousRect.toJSON(),current:source.currentRect.toJSON()};})});}).observe({type:'layout-shift',buffered:true});
 },{locale,storageKey:course.storageKey});
 return c;
}
async function readable(p){
 await p.waitForFunction(()=>window.readingAt!==null,null,{timeout:2000});
 const elapsed=await p.evaluate(()=>window.readingAt-performance.getEntriesByType('navigation')[0].responseStart);
 assert.ok(elapsed<2000,`Reading took ${elapsed}ms after the HTML response`);
 return Math.round(elapsed);
}
async function fontPayload(page){
 return page.evaluate(()=>{
  const networkFontBytes=performance.getEntriesByType('resource').filter(e=>/\.woff2?(?:\?|$)/.test(e.name)).reduce((sum,e)=>sum+e.decodedBodySize,0);
  const embedded=new Set();
  const scan=rules=>{for(const rule of rules){
   if(rule.type===CSSRule.FONT_FACE_RULE){for(const match of rule.style.getPropertyValue('src').matchAll(/url\(["']?(data:[^"')]+)["']?\)/g))embedded.add(match[1]);}
   else if(rule.cssRules)scan(rule.cssRules);
  }};
  for(const sheet of document.styleSheets)scan(sheet.cssRules);
  const inlineFontBytes=[...embedded].reduce((sum,url)=>sum+atob(url.split(',')[1]).length,0);
  return {networkFontBytes,inlineFontBytes,fontBytes:networkFontBytes+inlineFontBytes};
 });
}
async function screenshotWithoutWaitingForFonts(page,path){
 const session=await page.context().newCDPSession(page);
 try{const {data}=await session.send('Page.captureScreenshot',{format:'png'});await writeFile(path,Buffer.from(data,'base64'));}
 finally{await session.detach();}
}
try{
 await checkHoverContrast(browser,base,sampleId,pass);
 await checkStudyUX(browser,base,sourceSample,pass);
 if(figureSample)await checkFigureSegments(browser,base,figureSample,pass);
 else pass('No printed prompt diagrams in this corpus; figure-version checks are not applicable');
 await checkNavigationStability(browser,base,pass);
 for(const locale of ['zh','en'])for(const width of [375,1280]){
  let maxReadingMs=0,maxCLS=0;
  // Each destination gets an empty cache, rather than warming fonts across pages.
  for(const id of ids){
   const c=await context(locale,width),p=await c.newPage();
   try{
    await p.goto(`${base}/problems/${id}/`,{waitUntil:'commit'});
    maxReadingMs=Math.max(maxReadingMs,await readable(p));await ready(p);
    assert.equal(await p.locator('.search-button, #global-search, #formula-search, .search-dialog').count(),0);
    assert.equal(await p.locator('html').getAttribute('lang'),locale==='zh'?'zh-CN':'en');
    await p.evaluate(()=>document.fonts.ready);
    maxCLS=Math.max(maxCLS,await p.evaluate(()=>window.layoutShifts.reduce((sum,e)=>sum+e.value,0)));
   }finally{await c.close();}
  }
  // Report initial locale/layout shifts separately from time to readable content.
  pass('Cold pages expose their question promptly',{locale,width,pages:ids.length,maxReadingMs,maxCLS});
 }
 for(const locale of ['zh','en'])for(const width of [375,1280]){
  const c=await context(locale,width),p=await c.newPage();
  let releaseFonts,releaseScripts;
  const fonts=new Promise(resolve=>releaseFonts=resolve),scripts=new Promise(resolve=>releaseScripts=resolve);
  const fontRequests=[];
  p.on('request',r=>{if(r.resourceType()==='font')fontRequests.push(r.url());});
  await c.route('**/*',async route=>{
   if(route.request().resourceType()==='font')await fonts;
   if(route.request().resourceType()==='script')await scripts;
   await route.continue().catch(()=>{});
  });
  try{
   await p.goto(`${base}/problems/${sampleId}/`,{waitUntil:'commit'});
   const readingMs=await readable(p);
   assert.equal(await p.locator('main').getAttribute('data-study-ready'),'false');
   assert.ok(await p.locator('#problem-title').isVisible());
   releaseScripts();await ready(p);
   // Study controls work while every independently fetched font stays pending.
   await p.locator('.solution-section-heading button').click();
   assert.equal(await p.locator('.part-trigger[aria-expanded=true]').count(),await p.locator('.part-trigger').count());
   await p.waitForTimeout(3100);
   assert.ok(await p.locator('[data-original-statement]').isVisible());
   assert.equal(await p.locator('#startup-status').isVisible(),false);
   assert.ok(fontRequests.length>0,'The test actually held a font request');
   assert.ok(fontRequests.every(url=>!url.includes('noto-sans-sc')),'No CJK webfont payload in either locale');
   assert.ok(fontRequests.every(url=>!/(KaTeX_Main-Regular|KaTeX_Math-Italic)\./.test(url)),'Critical formula faces must not wait on separate font requests');
   const criticalFonts=await p.evaluate(()=>[...document.fonts].filter(face=>face.status!=='unloaded'&&(face.weight==='normal'||face.weight==='400')&&((face.family.includes('KaTeX_Main')&&face.style==='normal')||(face.family.includes('KaTeX_Math')&&face.style==='italic'))).map(face=>({family:face.family,status:face.status})));
   assert.ok(criticalFonts.every(face=>face.status==='loaded'),'Used critical formula faces must already be available while other fonts are held');
   const output=process.env.QA_FONT_ARTIFACTS??'artifacts/font-loading';await mkdir(output,{recursive:true});
   await screenshotWithoutWaitingForFonts(p,`${output}/${locale}-${width}-before.png`);
   const releaseAt=await p.evaluate(()=>performance.now());
   releaseFonts();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);
   const shifts=await p.evaluate(at=>window.layoutShifts.filter(e=>e.at>=at),releaseAt);
   const fontCLS=shifts.reduce((sum,e)=>sum+e.value,0),payload=await fontPayload(p);
   await screenshotWithoutWaitingForFonts(p,`${output}/${locale}-${width}-after.png`);
   // Persist diagnostics before asserting, so CI retains the failing case too.
   await writeFile(`${output}/${locale}-${width}.json`,JSON.stringify({locale,width,readingMs,fontCLS,...payload,criticalFonts,fontRequests,shifts},null,2));
   assert.ok(fontCLS<=0.1,`Late font swap shifts the page: ${fontCLS}`);
   assert.ok(payload.fontBytes<=200*1024,`Reading fonts exceeded 200 KiB (including embedded faces): ${payload.fontBytes}`);
   pass('Delayed fonts and scripts do not block reading; font transfer and late shifts stay bounded',{locale,width,readingMs,...payload,fontCLS});
  }finally{releaseScripts();releaseFonts();await c.close();}
 }
 const c=await context('zh',1280),p=await c.newPage();
 try{
  for(const id of ids){const response=await p.request.get(`${base}/problems/${id}`);assert.equal(response.status(),200);assert.ok((await response.text()).includes(`data-problem="${id}"`));}
  pass('All discovered no-slash destinations resolve',{pages:ids.length});
  await p.goto(`${base}/problems/${sampleId}/`);await ready(p);
  const intercepted=await p.evaluate(()=>['ctrlKey','metaKey'].map(modifier=>{
   const event=new KeyboardEvent('keydown',{key:'k',[modifier]:true,bubbles:true,cancelable:true});
   window.dispatchEvent(event);return event.defaultPrevented;
  }));
  assert.deepEqual(intercepted,[false,false]);
  assert.equal(await p.locator('[role=dialog]:visible').count(),0);
  pass('Retired search shortcuts do not intercept browser keys or open dialogs');
  const destination=p.locator('#exam-navigation a.question-link:visible').last();
  const href=await destination.getAttribute('href');
  await destination.focus();
  await p.keyboard.press('Enter');await p.waitForURL(`**${href}`);
  // URL completion precedes the async selection's tick/focus work; wait for
  // the actual observable outcome rather than racing the navigation promise.
  await p.waitForFunction(()=>{const e=document.getElementById('problem-title');return e===document.activeElement&&e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none';});
  pass('Keyboard question navigation retains visible heading focus');
 }finally{await c.close();}
}finally{await mkdir('artifacts',{recursive:true});await writeFile('artifacts/startup-qa.json',JSON.stringify({checks},null,2));await browser.close();}
