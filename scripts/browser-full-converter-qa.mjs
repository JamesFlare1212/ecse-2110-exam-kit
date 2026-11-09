// All active full-converter questions share the approved native interaction.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
import {FULL_PROFILES,atFullCycleAngle,validateRippleData} from '../src/lib/visualizations/full-converter-model.mjs';
const entries=exams.flatMap(e=>e.problems.flatMap(q=>q.parts.filter(p=>p.interaction?.kind==='full-converter').map(p=>({question:q.id,part:p.id,...p.interaction}))));
if(!entries.length){console.log('SKIP: no full-converter questions mounted');process.exit(0);}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL||'http://127.0.0.1:4173',out='artifacts/full-converter',checks=[];await mkdir(out,{recursive:true});
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const particles=w=>w.locator('.conduction-carrier').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('transform')));
async function open(entry,locale='en',theme='light',width=390,reducedMotion='no-preference',setup){
 const c=await browser.newContext({viewport:{width,height:1100},reducedMotion});await c.addInitScript(({key,locale,theme,part})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,notes:{[part]:'keep'}})),{key:course.storageKey,locale,theme,part:entry.part});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));if(setup)await setup(p);
 await p.goto(`${base}/problems/${entry.question}/`);await p.waitForSelector('[data-study-ready=true]');await p.locator(`[data-part="${entry.part}"] .part-trigger`).click();
 if(locale==='zh'&&fontCSS){await p.addStyleTag({content:fontCSS});await p.evaluate(()=>document.fonts.ready);}
 return{c,p,w:p.locator('[data-interaction=full-converter]'),errors};
}
async function seek(p,w,angle){const track=w.locator('[data-slot=slider-track]');await track.scrollIntoViewIfNeeded();const b=await track.boundingBox();await p.mouse.click(b.x+b.width*angle/360,b.y+b.height/2);}
try{
 for(const entry of entries)for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [320,390,1440]){
  const {c,p,w,errors}=await open(entry,locale,theme,width);await w.locator('[role=slider]').waitFor();await w.scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('[data-interaction=full-converter]').dataset.flowRunning==='true');
  assert.equal(await w.getAttribute('data-angle'),'0.00');assert.equal(await w.getAttribute('data-playing'),'false');assert.equal(await w.getByRole('radio').count(),3);assert.equal(await w.locator('.conduction-wave-row').count(),8);assert.equal(await w.locator('.conduction-measurement:visible').count(),4);
  assert.equal(await w.locator('use[data-component=D1],use[data-component=D2]').count(),0);assert.equal(await w.locator('[data-flow-route]').getAttribute('data-flow-route'),'negative');
  const href=await w.locator('.conduction-circuit use').first().getAttribute('href');assert(href.includes(`/papers/${locale==='zh'?'zh-cn':'en'}/`));assert.equal(href.includes('-dark.svg'),theme==='dark');
  const initial=await particles(w);await p.waitForTimeout(100);assert.notDeepEqual(await particles(w),initial);assert.equal(await w.getAttribute('data-angle'),'0.00');
  const alpha=FULL_PROFILES[entry.profile].alpha;
  const marks=await w.locator('[data-boundary]').evaluateAll(nodes=>nodes.map(n=>({value:+n.dataset.boundary,left:parseFloat(n.style.left),box:n.getBoundingClientRect().toJSON()})));assert.equal(marks.length,5);for(let i=0;i<5;i++){const value=[0,alpha,180,180+alpha,360][i];assert(Math.abs(marks[i].value-value)<1e-9);assert(Math.abs(marks[i].left-value/360*100)<.001);}
  let ripple;if(entry.rippleAsset){ripple=validateRippleData(await p.evaluate(async url=>(await fetch(url)).json(),href.split('#')[0].replace(/[^/]+\.svg$/,entry.rippleAsset+'.json')));}
  const dataset=[];
  for(const angle of [20,90,180,200,275,345]){await seek(p,w,angle);const actual=Number(await w.getAttribute('data-angle')),truth=atFullCycleAngle(actual,entry.profile,ripple),pair=truth.index===1?['S1','S2']:['S3','S4'];assert.equal(await w.locator('[data-flow-route]').getAttribute('data-flow-route'),truth.index===1?'positive':'negative');
   const on=await w.locator('.conduction-circuit use[data-conducting=true]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.component))]);for(const key of pair)assert(on.includes(key));for(const key of ['S1','S2','S3','S4'].filter(k=>!pair.includes(k)))assert(!on.includes(key));assert(!on.includes('field'));
   for(const key of ['v','i','v0','i0','is1','is2','is3','is4']){const value=Number(await w.locator(`[data-signal=${key}].conduction-wave-row .wave-value`).textContent());assert(Math.abs(value-truth[key])<.006,JSON.stringify({entry:entry.question,angle,key,value,expected:truth[key]}));}dataset.push(truth.i0);
  }
  if(entry.profile==='ripple-drive')assert(Math.max(...dataset)-Math.min(...dataset)>.1,'Given ripple must not be flattened');else assert(dataset.every(n=>n===1));
  const before=await w.locator('.wave-value').allTextContents(),trace=await w.locator('.wave-trace').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));await w.locator('.conduction-wave-row[data-signal=i]').click();assert.equal(await w.locator('.conduction-measurement[data-signal=i]').isVisible(),false);assert.deepEqual(await w.locator('.wave-value').allTextContents(),before);assert.deepEqual(await w.locator('.wave-trace').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),trace);
  for(const key of ['v','i','v0','i0']){const row=w.locator(`.conduction-wave-row[data-signal=${key}]`);if(await row.getAttribute('aria-pressed')==='true')await row.click();}assert.equal(await w.locator('.conduction-measurement:visible').count(),0);assert(await w.locator('use[data-conducting=true]').count());
  await w.locator('.conduction-circuit-panel').screenshot({path:`${out}/circuit-${entry.profile}-${locale}-${theme}-${width}.png`});await w.locator('.conduction-wave-panel').screenshot({path:`${out}/waves-${entry.profile}-${locale}-${theme}-${width}.png`});
  const row=w.locator('.conduction-wave-row[data-signal=is3]');await row.focus();await p.keyboard.press('Space');assert.equal(await row.getAttribute('aria-pressed'),'true');assert(await row.evaluate(n=>n===document.activeElement));await p.keyboard.press('Enter');assert.equal(await row.getAttribute('aria-pressed'),'false');
  const slider=w.getByRole('slider');await slider.focus();await p.keyboard.press('End');assert.equal(await w.getAttribute('data-angle'),'360.00');assert.equal(await w.getByRole('radio').nth(2).getAttribute('aria-checked'),'true');const atEnd=await particles(w);await p.waitForTimeout(100);assert.notDeepEqual(await particles(w),atEnd);assert.equal(await w.getAttribute('data-angle'),'360.00');
  const flow=w.locator('[data-flow-toggle]');await flow.click();const frozen=await particles(w);await p.waitForTimeout(100);assert.deepEqual(await particles(w),frozen);await flow.click();
  await w.locator('[data-static-diagram]').click();const dialog=p.getByRole('dialog');await dialog.waitFor();assert.equal(await w.getAttribute('data-flow-running'),'false');assert.equal(await w.locator('.study-figure').count(),0);await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await w.getAttribute('data-playing'),'false');
  await w.locator('[data-conduction-help]').click();const help=p.locator('.conduction-help-popover');await help.waitFor();assert((await help.textContent()).includes(locale==='zh'?'全控桥':'freewheel'));await p.keyboard.press('Escape');
  await p.emulateMedia({reducedMotion:'reduce'});await w.locator('[data-flow-toggle]:disabled').waitFor({state:'visible'});const staticPoints=await particles(w);await p.waitForTimeout(100);assert.deepEqual(await particles(w),staticPoints);
  const box=await w.boundingBox();assert(box.height<=(box.width>=620?720:1050),JSON.stringify({profile:entry.profile,locale,width,box}));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  const saved=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),course.storageKey);assert.equal(saved.notes[entry.part],'keep');checks.push({question:entry.question,profile:entry.profile,locale,theme,width,height:box.height,correctTopology:true,liveGrayValues:true,independentFlow:true,rippleRetained:true});await c.close();
 }
 for(const entry of entries){
  const {c,p,w}=await open(entry,'en','light',390,'reduce');await w.locator('[role=slider]').waitFor();await w.getByRole('button',{name:'Jump to cycle end',exact:true}).click();assert.equal(await w.getAttribute('data-angle'),'360.00');assert.equal(await w.getAttribute('data-flow-running'),'false');await c.close();
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await noJS.newPage();await page.goto(`${base}/problems/${entry.question}/`);const image=page.locator(`[data-part="${entry.part}"] .study-figure img`);assert(await image.isVisible());assert(await image.evaluate(i=>i.complete&&i.naturalWidth>0));assert.equal(await page.locator('[data-interaction=full-converter]').count(),0);checks.push({question:entry.question,reducedMotion:true,noJavaScriptFallback:true});await noJS.close();
 }
 const entry=entries.find(e=>e.profile==='ripple-drive');if(entry){const {c,p,w}=await open(entry,'en','light',390,'reduce',async p=>p.route('**/p2-f26-q6-ripple.json',r=>r.fulfill({contentType:'application/json',body:'{"version":1,"values":[]}'})));const retry=p.getByRole('button',{name:'Retry interactive diagram',exact:true});await retry.waitFor();assert(await p.locator(`[data-part="${entry.part}"] .study-figure img`).isVisible());await p.unroute('**/p2-f26-q6-ripple.json');await retry.click();await w.locator('[role=slider]').waitFor();checks.push({invalidRippleFallsBack:true,retry:true});await c.close();}
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2)+'\n');console.log(`PASS ${checks.length} full-converter production cases`);
}finally{await browser.close();}
