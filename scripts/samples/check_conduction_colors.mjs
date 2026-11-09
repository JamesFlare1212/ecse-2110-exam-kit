// Isolated file:// prototype only: no server, production routes or study records.
import {strict as assert} from 'node:assert';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {atCycleAngle} from '../../src/lib/visualizations/semi-converter-model.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=resolve('artifacts/conduction-color-sample'),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const checks=[],keys=['v','i','v0','i0','is1','is2','id1','id2','vs1'],defaults=['v','i','v0','i0'];
const file=locale=>pathToFileURL(resolve(out,locale==='zh'?'preview.zh.html':'preview.html')).href;
const row=(p,key)=>p.locator(`button.wave-row[data-signal=${key}]`);
async function seek(p,angle){await p.locator('#angle').evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},angle);}
async function set(p,key,on){if(await row(p,key).getAttribute('aria-pressed')!==String(on))await row(p,key).click();}
async function all(p,on){for(const key of keys)await set(p,key,on);}
try{
 for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,728]){
  const c=await browser.newContext({viewport:{width,height:1100},colorScheme:theme,reducedMotion:'no-preference'}),p=await c.newPage(),errors=[],remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await p.goto(file(locale));await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.locator('#filters,#preset,#solo,.filters-box').count(),0,'No separate filter controls');
  assert.equal(await p.locator('.wave-row').count(),9);assert.equal(await p.locator('.wave-row[aria-pressed=true]').count(),4);assert.equal(await p.locator('.measurement').count(),4);
  assert.equal(await p.locator('main').getAttribute('data-angle'),'240.000');assert.equal(await p.locator('main').getAttribute('data-playing'),'false');
  assert(await p.locator('.base-image').evaluate(e=>e.complete&&e.naturalWidth===576));
  const alignment=await p.evaluate(()=>({image:document.querySelector('.base-image').getBoundingClientRect().width/576,svg:document.querySelector('#circuit').getScreenCTM().a}));assert(Math.abs(alignment.image-alignment.svg)<.01,JSON.stringify(alignment));
  const initial=await p.locator('.wave-row').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
  // Clicking an enabled waveform turns it OFF but leaves its row and reference.
  await row(p,'i').click();assert.equal(await row(p,'i').getAttribute('aria-pressed'),'false');assert.equal(await p.locator('.wave-row').count(),9);assert.equal(await p.locator('.measurement[data-signal=i]').count(),0);assert.equal(await p.locator('main').getAttribute('data-angle'),'240.000');
  const off=await row(p,'i').evaluate(e=>({ink:getComputedStyle(e).color,swatch:getComputedStyle(e.querySelector('.swatch')).borderTopColor,history:getComputedStyle(e.querySelector('.history')).display,dot:getComputedStyle(e.querySelector('.dot')).display,reference:getComputedStyle(e.querySelector('.reference')).stroke}));
  assert.equal(off.ink,off.swatch);assert.equal(off.reference,off.ink);assert.equal(off.history,'none');assert.equal(off.dot,'none');
  // A second click re-enables exactly that waveform and its linked probe.
  await row(p,'i').click();assert.equal(await row(p,'i').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('main').getAttribute('data-focus'),'i');assert.equal(await p.locator('[data-flow=i]').getAttribute('data-sign'),'-1');assert.equal(await p.locator('#mini-value').textContent(),'-1.00');
  const arrow=await p.locator('[data-flow=i]').getAttribute('d'),coords=[...arrow.matchAll(/-?\d+(?:\.\d+)?/g)].map(m=>+m[0]);assert(coords[0]>coords[2],'Negative source current must point left');
  const colors=await p.evaluate(()=>({probe:getComputedStyle(document.querySelector('[data-signal=i].measurement')).getPropertyValue('--signal'),wave:getComputedStyle(document.querySelector('[data-signal=i].wave-row')).getPropertyValue('--signal')}));assert.equal(colors.probe,colors.wave);
  // All nine remain discoverable. Focus/hover links an enabled row without toggling.
  for(const key of keys){await set(p,key,true);await row(p,key).focus();assert.equal(await p.locator('.measurement.focused').getAttribute('data-signal'),key);assert.equal(await row(p,key).getAttribute('aria-pressed'),'true');}
  const polarity=await p.locator('.measurement[data-signal=vs1] .probe-polarity').evaluateAll(es=>es.map(e=>({text:e.textContent,y:+e.getAttribute('y')})));assert.equal(polarity[0].text,'+');assert(polarity[0].y>polarity[1].y,'S1 anode + is below cathode −');
  await seek(p,195.25);assert.equal(await p.locator('#mini-value').textContent(),'-0.26');assert.equal(await p.locator('[data-flow=i]').getAttribute('data-sign'),'0');assert.equal(await p.locator('[data-flow=i]').getAttribute('marker-end'),'');
  await row(p,'vs1').focus();await p.keyboard.press('Space');assert.equal(await row(p,'vs1').getAttribute('aria-pressed'),'false');assert(await row(p,'vs1').evaluate(e=>e===document.activeElement),'Toggling must preserve keyboard focus');await p.keyboard.press('Enter');assert.equal(await row(p,'vs1').getAttribute('aria-pressed'),'true');
  await all(p,false);assert.equal(await p.locator('.wave-row').count(),9);assert.equal(await p.locator('.wave-row[aria-pressed=true]').count(),0);assert.equal(await p.locator('.measurement').count(),0);assert.equal(await p.locator('#mini-scope').isVisible(),false);assert.equal(await p.locator('main').getAttribute('data-focus'),'');assert.equal(await p.locator('main').getAttribute('data-angle'),'195.250');
  const disabledHeights=await p.locator('.wave-row').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));assert(initial.every((h,i)=>Math.abs(h-disabledHeights[i])<.5),'Rows must not collapse or shift when gray');
  for(const key of defaults)await set(p,key,true);await seek(p,240);await row(p,'v0').focus();
  const numeric=await p.locator('.wave-row[aria-pressed=true]').evaluateAll(es=>Object.fromEntries(es.map(e=>[e.dataset.signal,e.querySelector('.wave-value').textContent]))),truth=atCycleAngle(240);
  assert(numeric.v.includes(truth.v.toFixed(2)));assert(numeric.i.includes('-1.00'));assert(numeric.v0.includes(truth.v0.toFixed(2)));assert(numeric.i0.includes('+1.00'));
  for(const angle of ['30','210'])assert(await p.locator('.ticks').getByText(`${angle}°`,{exact:true}).isVisible());
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
  await p.screenshot({path:resolve(out,`v2-${locale}-${theme}-${width}.png`),fullPage:true});checks.push({locale,theme,width,persistentRows:9,defaultEnabled:4,directToggle:true,offIsGray:true,keyboard:true,noRowShift:true,polarity:true,negativeCurrent:true,noRemote:true});await c.close();
 }
 // Touch directly toggles a waveform too, without an auxiliary switch.
 {const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage();await p.goto(file('en'));await row(p,'v0').scrollIntoViewIfNeeded();const r=await row(p,'v0').boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);assert.equal(await row(p,'v0').getAttribute('aria-pressed'),'false');await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);assert.equal(await row(p,'v0').getAttribute('aria-pressed'),'true');checks.push({directTouchToggle:true});await c.close();}
 // One play crosses all internal boundaries; waveform toggles don't pause or reset it.
 {const c=await browser.newContext({viewport:{width:728,height:1100}}),p=await c.newPage();await p.goto(file('en'));await seek(p,0);await p.clock.install();await p.locator('#play').click();
  for(const [ms,index]of [[1250,'1'],[5250,'2'],[1000,'3']]){await p.clock.runFor(ms);assert.equal(await p.locator('main').getAttribute('data-playing'),'true');assert.equal(await p.locator('[name=stage]:checked').getAttribute('value'),index);}
  const angle=Number(await p.locator('main').getAttribute('data-angle'));await row(p,'i').click();assert.equal(await p.locator('main').getAttribute('data-playing'),'true');const after=Number(await p.locator('main').getAttribute('data-angle'));assert(after>=angle&&after-angle<5,'Toggling may not seek or reset the running angle');
  await p.clock.runFor(5000);assert.equal(await p.locator('main').getAttribute('data-angle'),'360.000');assert.equal(await p.locator('main').getAttribute('data-playing'),'false');assert.equal(await p.locator('[name=stage]:checked').getAttribute('value'),'3');checks.push({fullCycle:true,togglePreservesPlayback:true});await c.close();}
 {const c=await browser.newContext({reducedMotion:'reduce'}),p=await c.newPage();await p.goto(file('en'));await p.locator('#play').click();assert.equal(await p.locator('main').getAttribute('data-angle'),'360.000');assert.equal(await p.locator('main').getAttribute('data-playing'),'false');await seek(p,147.375);assert.equal(await p.locator('main').getAttribute('data-angle'),'147.375');checks.push({reducedMotion:true});await c.close();}
 const {createHash}=await import('node:crypto'),provenance=JSON.parse(await readFile(resolve(out,'provenance.json'),'utf8'));
 for(const [file,sha]of Object.entries(provenance.files))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),sha,file);
 await writeFile(resolve(out,'report-v2.json'),JSON.stringify({checks},null,2)+'\n');console.log(`PASS ${checks.length} isolated sample cases; integrated waveform toggles, gray off states, persistent rows, keyboard/touch, signs/polarity and playback`);
}finally{await browser.close();}
