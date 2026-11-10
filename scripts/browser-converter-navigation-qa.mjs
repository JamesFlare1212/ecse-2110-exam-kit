// Run against BOTH `astro dev` and the built preview: runtime-injected CSS has
// a different lifetime from production styles when the study island persists.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';

const paper=exams.find(exam=>exam.problems.some(problem=>problem.parts.some(part=>part.interaction?.kind==='semi-converter')));
if(!paper){console.log('SKIP: no converter family mounted');process.exit(0);}
const examples=paper.problems.flatMap(problem=>problem.parts.filter(part=>part.interaction).map(part=>({problem:problem.id,part:part.id})));
const semi=examples.find(entry=>paper.problems.find(problem=>problem.id===entry.problem).parts.find(part=>part.id===entry.part).interaction.kind==='semi-converter');
const full=examples.find(entry=>entry!==semi),plain=paper.problems.find(problem=>!problem.parts.some(part=>part.interaction));
assert(semi&&full&&plain,'Exercise enhanced and ordinary destinations in the same paper');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const output=process.env.QA_STYLE_ARTIFACTS??'artifacts/converter-navigation';
await mkdir(output,{recursive:true});
const checks=[];
async function selected(page,id){
  await page.waitForFunction(id=>document.querySelector('[data-study-ready=true]')?.dataset.problem===id,id);
  assert(await page.evaluate(()=>window.__styleAuditIsland===document.querySelector('astro-island')),'Navigation must preserve the live island, not silently reload it');
}
async function visit(page,id){
  const toggle=page.locator('[data-sidebar-toggle=navigation]');
  if(await toggle.getAttribute('aria-controls')==='mobile-exam-navigation')await toggle.click();
  await page.locator(`a.question-link[href="/problems/${id}/"]:visible`).click();
  await selected(page,id);
}
async function reveal(page,entry){
  const trigger=page.locator(`[data-part="${entry.part}"] .part-trigger`);
  if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();
  await page.waitForSelector('[data-interaction][data-ready=true]');
  const state=await page.locator('[data-interaction]').evaluate(root=>{
    const card=root.querySelector('.conduction-visualization'),circuit=root.querySelector('.conduction-circuit');
    const style=getComputedStyle(card),probe=getComputedStyle(root.querySelector('.probe-line'));
    return {problem:document.querySelector('main').dataset.problem,display:style.display,padding:style.paddingLeft,
      circuitWidth:circuit.getBoundingClientRect().width,transport:getComputedStyle(root.querySelector('.conduction-transport')).display,
      boundaries:getComputedStyle(root.querySelector('.conduction-boundaries')).position,
      phase:getComputedStyle(root.querySelector('.conduction-phase')).position,phaseIsolation:getComputedStyle(root.querySelector('.conduction-phase')).isolation,probeFill:probe.fill,
      probeStroke:probe.stroke,probeVectorEffect:probe.vectorEffect,
      overflow:document.documentElement.scrollWidth-innerWidth,
      styles:[...document.querySelectorAll('style[data-vite-dev-id],link[rel=stylesheet]')].map(node=>node.dataset.viteDevId??node.getAttribute('href'))};
  });
  assert.equal(state.display,'flex',`Converter layout CSS disappeared: ${JSON.stringify(state)}`);
  assert.equal(state.padding,'12px');
  assert.equal(state.transport,'grid');assert.equal(state.boundaries,'absolute');
  assert.equal(state.phase,'relative');assert.equal(state.phaseIsolation,'isolate','The tick/handle stack must retain its local positioned anchor');
  assert(state.circuitWidth<=360.5,'Circuit must keep its readable width, not fill the article');
  assert.equal(state.probeFill,'none');assert.notEqual(state.probeStroke,'none');assert.equal(state.probeVectorEffect,'non-scaling-stroke','Circuit child CSS must survive too');
  assert(state.overflow<=1,'No page-wide overflow');
  return state;
}
try{
  for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    try{
      await context.addInitScript(({key,locale,theme,part})=>{
        if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,locale,theme,notes:{[part]:'preserved'}}));
      },{key:course.storageKey,locale,theme,part:semi.part});
      const page=await context.newPage(),errors=[];
      page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/problems/${semi.problem}/`);
      await page.waitForSelector('[data-study-ready=true]');
      await page.evaluate(()=>window.__styleAuditIsland=document.querySelector('astro-island'));
      const states=[await reveal(page,semi)];
      for(const entry of examples.filter(entry=>entry!==semi)){
        await visit(page,entry.problem);states.push(await reveal(page,entry));
      }
      await visit(page,plain.id);await visit(page,semi.problem);states.push(await reveal(page,semi));
      await page.goBack();await selected(page,plain.id);
      await page.goForward();await selected(page,semi.problem);states.push(await reveal(page,semi));
      // Changes that pause/reload the drawing must not affect style ownership.
      await page.getByRole('button',{name:locale==='zh'?'Switch to English':'切换为中文',exact:true}).click();
      await page.waitForSelector('[data-interaction][data-ready=true]');states.push(await reveal(page,semi));
      await page.getByRole('button',{name:theme==='dark'?/Switch to light mode|切换浅色主题/:/Switch to dark mode|切换深色主题/}).click();
      await page.waitForSelector('[data-interaction][data-ready=true]');states.push(await reveal(page,semi));
      await page.locator('[data-interaction]').scrollIntoViewIfNeeded();
      await page.screenshot({path:`${output}/${locale}-${theme}-${width}.png`});
      assert.equal(await page.evaluate(({key,part})=>JSON.parse(localStorage.getItem(key)).notes[part],{key:course.storageKey,part:semi.part}),'preserved');
      assert.deepEqual(errors,[]);checks.push({locale,theme,width,states});
      console.log('PASS persistent converter styles across native navigation, history, locale and theme',locale,theme,width);
    }finally{await context.close();}
  }
  // Start navigation while the optional module is still in flight. The cancelled
  // old question and the cached import must not orphan the next drawing's styles.
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  let release;
  const held=new Promise(resolve=>release=resolve);
  try{
    const page=await context.newPage();page.setDefaultTimeout(20000);
    await page.route(/\/Converter(?:\.svelte(?:\?|$)|\.[^/]+\.js(?:\?|$))/,async route=>{await held;await route.continue().catch(()=>{});});
    await page.goto(`${base}/problems/${semi.problem}/`);await page.waitForSelector('[data-study-ready=true]');
    await page.evaluate(()=>window.__styleAuditIsland=document.querySelector('astro-island'));
    const request=page.waitForRequest(request=>/\/Converter(?:\.svelte(?:\?|$)|\.[^/]+\.js(?:\?|$))/.test(request.url()));
    await page.locator(`[data-part="${semi.part}"] .part-trigger`).click();await request;
    await visit(page,full.problem);release();
    const state=await reveal(page,full);checks.push({navigationDuringLazyImport:true,state});
    console.log('PASS converter styles when navigation cancels an in-flight lazy import');
  }finally{release();await context.close();}
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify({base,checks},null,2)+'\n');
  await browser.close();
}
