// Production regression for the approved color/continuous-current design.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
import {atCycleAngle,CONDUCTION_INTERVALS} from '../src/lib/visualizations/semi-converter-model.mjs';
import {pointOnRoute} from '../src/lib/visualizations/conduction-geometry.ts';
if(!exams.some(e=>e.problems.some(p=>p.id==='p2-f26-q4'&&p.parts.some(part=>part.interaction?.kind==='semi-converter')))){console.log('SKIP: semi-converter is not mounted');process.exit(0);}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),base=process.env.QA_URL||'http://127.0.0.1:4173',out='artifacts/conduction-linked',checks=[];
await mkdir(out,{recursive:true});
const cjkCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const widget='[data-interaction="semi-converter"]',keys=['v','i','v0','i0','is1','is2','id1','id2','vs1'];
const row=(w,key)=>w.locator(`.conduction-wave-row[data-signal=${key}]`);
const particles=w=>w.locator('.conduction-carrier').evaluateAll(nodes=>nodes.map(e=>({transform:e.getAttribute('transform'),fraction:+e.dataset.fraction})));
async function open(locale='en',theme='light',width=1440,reducedMotion='no-preference',extra={}){
 const c=await browser.newContext({viewport:{width,height:1000},reducedMotion,...extra});
 await c.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
 const p=await c.newPage(),errors=[],remote=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(base).origin)remote.push(r.url());});
 await p.goto(`${base}/problems/p2-f26-q4/`);await p.waitForSelector('[data-study-ready=true]');await p.locator('[data-part=p2-f26-q4-a] .part-trigger').click();await p.waitForSelector(`${widget}[data-ready=true]`);
 if(locale==='zh'&&cjkCSS){await p.addStyleTag({content:cjkCSS});await p.evaluate(()=>document.fonts.ready);}
 const w=p.locator(widget);await w.scrollIntoViewIfNeeded();return{c,p,w,errors,remote};
}
async function angle(p,w,degree){const track=w.locator('[data-slot=slider-track]');await track.scrollIntoViewIfNeeded();const b=await track.boundingBox();await p.mouse.click(b.x+b.width*degree/360,b.y+b.height/2);}
async function snapshot(w){return w.evaluate(root=>({rows:[...root.querySelectorAll('.conduction-wave-row')].map(e=>({key:e.dataset.signal,style:e.getAttribute('style'),pressed:e.getAttribute('aria-pressed'),html:e.innerHTML,box:{x:e.getBoundingClientRect().x-root.getBoundingClientRect().x,y:e.getBoundingClientRect().y-root.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}})),probes:[...root.querySelectorAll('.conduction-measurement')].map(e=>({key:e.dataset.signal,enabled:e.dataset.enabled,html:e.innerHTML}))}));}
async function set(w,key,on){if(await row(w,key).getAttribute('aria-pressed')!==String(on))await row(w,key).click();}
async function conductionStyle(w){return w.locator('.conduction-circuit use').evaluateAll(nodes=>nodes.map(e=>({key:e.dataset.component,label:e.dataset.label==='true',conducting:e.dataset.conducting==='true',width:+getComputedStyle(e).getPropertyValue('--conduction-stroke-width'),opacity:+getComputedStyle(e).opacity,color:getComputedStyle(e).color})));}
async function contrast(w){return w.locator('.conduction-wave-row').evaluateAll(nodes=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
 const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
 const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 return nodes.map(e=>{const fg=rgb(getComputedStyle(e.querySelector('.wave-row-label')).color),bg=rgb(getComputedStyle(e.closest('.conduction-pane')).backgroundColor),opacity=+getComputedStyle(e.querySelector('.wave-reference')).opacity;return{key:e.dataset.signal,label:ratio(fg,bg),reference:ratio(fg.map((v,i)=>v*opacity+bg[i]*(1-opacity)),bg)};});
 });}
try{
 for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,1440]){
  const {c,p,w,errors,remote}=await open(locale,theme,width);await p.waitForFunction(()=>document.querySelector('[data-interaction]').dataset.flowRunning==='true');
  assert.equal(await w.getAttribute('data-playing'),'false');assert.equal(await w.getAttribute('data-angle'),'0.00');assert.equal(await w.locator('.conduction-wave-row[aria-pressed=true]').count(),4);assert.equal(await w.locator('.conduction-measurement:visible').count(),4);
  const idle=await particles(w);await p.waitForTimeout(150);assert.notDeepEqual(await particles(w),idle,'Flow must start without dragging or playing');assert.equal(await w.getAttribute('data-angle'),'0.00');const sizes=await w.locator('.conduction-carrier').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return Math.min(r.width,r.height);}));assert(sizes.every(size=>size>=4.5),'Direction arrows must remain visibly sized');
  const geometry=await p.evaluate(async()=>{const href=document.querySelector('[data-interaction] .conduction-circuit use').getAttribute('href'),url=href.split('#')[0].replace(/(?:-dark)?\.svg$/,'.json'),response=await fetch(url);if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw new Error(`Geometry QA response: ${url} ${response.status} ${response.headers.get('content-type')}`);return response.json();});
  for(const degree of [15,90,195,240]){await angle(p,w,degree);const actual=Number(await w.getAttribute('data-angle')),name=CONDUCTION_INTERVALS[atCycleAngle(actual).index].route;assert.equal(await w.locator('[data-flow-route]').getAttribute('data-flow-route'),name);const styles=await conductionStyle(w);for(const part of styles){assert.equal(part.conducting,CONDUCTION_INTERVALS[atCycleAngle(actual).index].active.includes(part.key));if(part.label){assert.equal(part.opacity,1);continue;}assert.equal(part.width,part.conducting?2.8:1.8);assert.equal(part.opacity,part.conducting?1:.55);}assert.notEqual(styles.find(p=>!p.label&&p.conducting).color,styles.find(p=>!p.label&&!p.conducting).color);for(const particle of await particles(w)){const [x,y]=particle.transform.match(/-?\d+(?:\.\d+)?/g).map(Number),expected=pointOnRoute(geometry.routes[name],particle.fraction);assert(Math.abs(x-expected[0])<.001&&Math.abs(y-expected[1])<.001);}}
  const before=await snapshot(w),height=await w.evaluate(e=>e.getBoundingClientRect().height);await w.evaluate(root=>window.__conductionNodes=[...root.querySelectorAll('.conduction-wave-row,.conduction-measurement')]);
  await row(w,'i').click();const after=await snapshot(w);assert.equal(await w.locator('.conduction-measurement[data-signal=i]').isVisible(),false);
  for(let i=0;i<keys.length;i++){assert.deepEqual(after.rows[i].box,before.rows[i].box);assert.equal(after.rows[i].html,before.rows[i].html);assert.equal(after.probes[i].html,before.probes[i].html);if(keys[i]!=='i'){assert.equal(after.rows[i].style,before.rows[i].style);assert.equal(after.rows[i].pressed,before.rows[i].pressed);assert.equal(after.probes[i].enabled,before.probes[i].enabled);}}
  const stable=await snapshot(w);await row(w,'vs1').hover();await row(w,'i0').focus();assert.deepEqual(await snapshot(w),stable,'No hover/focus retargeting');
  const circuitBeforeOff=await conductionStyle(w);for(const key of keys)await set(w,key,false);assert.deepEqual(await conductionStyle(w),circuitBeforeOff,'Disabling every probe must retain the full conduction emphasis');assert.equal(await w.locator('.conduction-measurement:visible').count(),0);assert.equal(await w.locator('.conduction-wave-row').count(),9);
  await w.locator('.conduction-circuit-panel').screenshot({path:`${out}/all-off-conduction-${locale}-${theme}-${width}.png`});
  const actual=Number(await w.getAttribute('data-angle')),truth=atCycleAngle(actual);for(const key of keys)assert(Math.abs(Number(await row(w,key).locator('.wave-value').textContent())-truth[key])<.006);
  assert.equal(await w.evaluate(e=>e.getBoundingClientRect().height),height);assert(await w.evaluate(root=>window.__conductionNodes.every((e,i)=>e===root.querySelectorAll('.conduction-wave-row,.conduction-measurement')[i])));
  await row(w,'vs1').focus();await p.keyboard.press('Space');assert.equal(await row(w,'vs1').getAttribute('aria-pressed'),'true');assert(await row(w,'vs1').evaluate(e=>e===document.activeElement));await p.keyboard.press('Enter');assert.equal(await row(w,'vs1').getAttribute('aria-pressed'),'false');
  for(const key of keys)await set(w,key,true);await w.locator('h4').hover();const palette=await contrast(w);assert(palette.every(v=>v.label>=4.5),JSON.stringify(palette));assert(palette.find(v=>v.key==='vs1').reference>=3);
  assert.equal(await row(w,'vs1').locator('.wave-trace').getAttribute('stroke-dasharray'),'8 2 2 2');assert.equal(await row(w,'vs1').locator('.wave-trace').evaluate(e=>parseFloat(getComputedStyle(e).strokeWidth)),2.4);
  const polarity=await w.locator('.conduction-measurement[data-signal=vs1] .polarity').evaluateAll(nodes=>nodes.map(e=>({value:e.textContent,y:+e.getAttribute('y')})));assert.equal(polarity[0].value,'+');assert(polarity[0].y>polarity[1].y);
  const play=()=>w.getByRole('button',{name:locale==='zh'?'播放进度':'Play angle',exact:true}),pause=()=>w.getByRole('button',{name:locale==='zh'?'暂停进度':'Pause angle',exact:true});
  await play().click();await p.waitForTimeout(150);await pause().click();const pausedAngle=await w.getAttribute('data-angle'),moving=await particles(w);await p.waitForTimeout(150);assert.equal(await w.getAttribute('data-angle'),pausedAngle);assert.notDeepEqual(await particles(w),moving,'Angle pause must keep flow');
  const toggle=w.locator('[data-flow-toggle]');await toggle.focus();await p.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-pressed'),'false');const frozen=await particles(w);await p.waitForTimeout(150);assert.deepEqual(await particles(w),frozen);
  await w.locator('[data-conduction-help]').click();await p.keyboard.press('Escape');assert.equal(await w.getAttribute('data-flow-running'),'false','Manual flow pause survives help');await toggle.click();await p.waitForTimeout(100);assert.notDeepEqual(await particles(w),frozen);
  await w.locator('[data-static-diagram]').click();await p.getByRole('dialog').waitFor();assert.equal(await w.getAttribute('data-flow-running'),'false');const modalFrozen=await particles(w);await p.waitForTimeout(100);assert.deepEqual(await particles(w),modalFrozen);await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'detached'});await p.waitForFunction(()=>document.querySelector('[data-interaction]').dataset.flowRunning==='true');assert.equal(await w.getAttribute('data-playing'),'false');
  await w.locator('[data-conduction-help]').click();assert.equal(await w.getAttribute('data-flow-running'),'false');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('[data-interaction]').dataset.flowRunning==='true');
  await p.emulateMedia({reducedMotion:'reduce'});await w.locator('[data-flow-toggle]:disabled').waitFor({state:'visible'});assert.equal(await toggle.isDisabled(),true);const reduced=await particles(w);await p.waitForTimeout(120);assert.deepEqual(await particles(w),reduced);await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>document.querySelector('[data-interaction]').dataset.flowRunning==='true');assert.equal(await w.getAttribute('data-playing'),'false');
  await w.screenshot({path:`${out}/${locale}-${theme}-${width}.png`});if(width===390){await w.locator('.conduction-circuit-panel').screenshot({path:`${out}/circuit-${locale}-${theme}-${width}.png`});await w.locator('.conduction-wave-panel').screenshot({path:`${out}/waves-${locale}-${theme}-${width}.png`});}assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);checks.push({locale,theme,width,liveGrayWaves:true,hiddenOffProbes:true,noRetargeting:true,conductionEmphasisInAllIntervals:true,conductionSurvivesAllProbesOff:true,continuousFlow:true,independentPause:true,modalAndMotionLifecycle:true,palette});await c.close();
 }
 // A genuine touch activates the existing row, not a second filter panel.
 {const {c,p,w}=await open('en','dark',390,'no-preference',{hasTouch:true});await row(w,'v0').tap();assert.equal(await row(w,'v0').getAttribute('aria-pressed'),'false');await row(w,'v0').tap();assert.equal(await row(w,'v0').getAttribute('aria-pressed'),'true');checks.push({touch:true});await c.close();}
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2)+'\n');console.log(`PASS ${checks.length} linked-waveform production cases`);
}finally{await browser.close();}
