import {strict as assert} from 'node:assert';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
if(!exams.some(exam=>exam.problems.some(problem=>problem.id==='p2-f26-q4'&&problem.parts.some(part=>part.interaction?.kind==='semi-converter')))){
 console.log('SKIP: the approved ECSE semi-converter interaction is not mounted');process.exit(0);
}
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.QA_URL||'http://127.0.0.1:4173',out='artifacts/conduction-integration';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
const cjkCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const part='[data-part="p2-f26-q4-a"]',widget='[data-interaction="semi-converter"]';
async function contextFor(locale='en',theme='light',width=1440,reducedMotion='no-preference',extra={}){
 const c=await browser.newContext({viewport:{width,height:1000},reducedMotion,...extra});
 await c.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,notes:{'p2-f26-q4-a':'keep legacy'},completed:{'p2-f26-q4-b':true}})),{key:course.storageKey,locale,theme});return c;
}
async function open(page){await page.goto(`${url}/problems/p2-f26-q4/`,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-study-ready=true]');await page.locator(`${part} .part-trigger`).click();if(cjkCSS){await page.addStyleTag({content:cjkCSS});await page.evaluate(()=>document.fonts.ready);}}
async function assertSliderSync(w){const state=await w.evaluate(e=>({angle:Number(e.dataset.angle),value:Number(e.querySelector('[role=slider]').getAttribute('aria-valuenow'))}));assert(Math.abs(state.value-state.angle)<.06,JSON.stringify(state));}
try{
 for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [320,390,820,1440]){
  const c=await contextFor(locale,theme,width),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await open(p);await p.waitForSelector(`${widget}[data-ready=true]`);const w=p.locator(widget);
  assert.equal(await w.locator('.wave-row-label').count(),9);assert.equal(await w.locator('.conduction-circuit use').count(),57);
  assert((await w.locator('.conduction-circuit use').first().getAttribute('href')).startsWith(`/papers/${locale==='zh'?'zh-cn':'en'}/practice2_f26/figures/`));
  const stages=w.getByRole('radio');
  for(const [i,keys]of [[0,['D1','D2']],[1,['S1','D2']],[2,['D1','D2']],[3,['S2','D1']]]){
   await stages.nth(i).click();const active=await w.locator('.conduction-circuit use[data-conducting=true]').evaluateAll(es=>[...new Set(es.map(e=>e.dataset.component))]);
   for(const key of keys)assert(active.includes(key));for(const key of ['S1','S2','D1','D2'].filter(k=>!keys.includes(k)))assert(!active.includes(key));
  }
  // Clicking the selected stage must not leave the group without a selection.
  await stages.nth(3).click();assert.equal(await w.locator('[role=radio][aria-checked=true]').count(),1);
  await stages.nth(1).click();await p.keyboard.press('ArrowRight');assert.equal(await w.getAttribute('data-angle'),'180.00');
  const slider=w.getByRole('slider');assert.equal(await slider.getAttribute('aria-label'),locale==='zh'?'电角度':'Electrical angle');
  assert.equal(await stages.count(),4);assert.equal(await slider.getAttribute('aria-valuemax'),'360');assert.deepEqual(await w.locator('[data-boundary]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.boundary))),[0,30,180,210,360]);
  const tickBoxes=await w.locator('[data-boundary]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{angle:Number(n.dataset.boundary),font:parseFloat(getComputedStyle(n).fontSize),left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
  assert(tickBoxes.every(t=>t.font>=9),'Every mark must remain readable, including on phones');
  for(let i=0;i<tickBoxes.length;i++)for(let j=i+1;j<tickBoxes.length;j++){const a=tickBoxes[i],b=tickBoxes[j];if(Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1)assert(b.left>=a.right+1,'Angle labels must not overlap');}
  for(const angle of [30,210]){const mark=w.locator(`[data-boundary="${angle}"][data-trigger]`);assert(await mark.isVisible());const position=await mark.evaluate(e=>({left:parseFloat(e.style.left),pointer:getComputedStyle(e.parentElement).pointerEvents}));assert(Math.abs(position.left-angle/360*100)<.001);assert.equal(position.pointer,'none','Marks must not intercept free scrubbing');}
  await slider.focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowRight');assert.equal(await slider.getAttribute('aria-valuenow'),'0.1');assert.equal(await w.getAttribute('data-angle'),'0.10');
  await p.keyboard.press('End');assert.equal(await w.getAttribute('data-angle'),'360.00');assert.equal(await stages.nth(3).getAttribute('aria-checked'),'true');
  assert.equal(await w.locator('.conduction-values dd').nth(1).textContent(),'-1.00');assert(!(await w.locator('output').textContent()).includes('≡'));assert.equal(await w.locator('.conduction-circuit use[data-component=S2][data-conducting=true]').count(),8);
  // Linear, arbitrary pointer positions must not snap to the old five nodes.
  const track=await w.locator('[data-slot=slider-track]').boundingBox();
  for(const fraction of [.173,.477,.544,.731,.963]){
   await p.mouse.click(track.x+track.width*fraction,track.y+track.height/2);const angle=Number(await w.getAttribute('data-angle'));assert(Math.abs(angle-360*fraction)<.25,JSON.stringify({width,fraction,angle}));assert(![0,30,180,210,360].includes(angle));assert.equal(await stages.nth(angle<30?0:angle<180?1:angle<210?2:3).getAttribute('aria-checked'),'true');
  }
  await stages.nth(1).click();const play=w.getByRole('button',{name:locale==='zh'?'播放':'Play',exact:true});await play.click();await p.waitForTimeout(180);
  assert.equal(await w.getAttribute('data-playing'),'true');assert(Number(await w.getAttribute('data-angle'))>30);assert.equal(await w.locator('.conduction-carrier').count(),3);await assertSliderSync(w);
  await w.getByRole('button',{name:locale==='zh'?'暂停':'Pause',exact:true}).click();const angle=await w.getAttribute('data-angle');await p.waitForTimeout(100);assert.equal(await w.getAttribute('data-angle'),angle);
  // A single play traverses all four intervals, with no pauses at 30/180/210°.
  await slider.focus();await p.keyboard.press('Home');await p.clock.install();await play.click();
  for(const [ms,index,min,max]of [[1250,1,30,50],[5250,2,180,210],[1000,3,210,240]]){
   await p.clock.runFor(ms);const current=Number(await w.getAttribute('data-angle'));assert(current>min&&current<max,JSON.stringify({current,index}));assert.equal(await w.getAttribute('data-playing'),'true');assert.equal(await stages.nth(index).getAttribute('aria-checked'),'true');await assertSliderSync(w);
  }
  await p.clock.runFor(5000);await p.clock.resume();assert.equal(await w.getAttribute('data-angle'),'360.00');assert.equal(await w.getAttribute('data-playing'),'false');assert.equal(await stages.nth(3).getAttribute('aria-checked'),'true');assert.equal(await slider.getAttribute('aria-valuenow'),'360');assert.equal(await w.locator('.conduction-values dd').nth(1).textContent(),'-1.00');
  if(width!==820){await mkdir('artifacts/conduction-continuous',{recursive:true});await w.screenshot({path:`artifacts/conduction-continuous/end-${locale}-${theme}-${width}.png`});}
  // Resume at a scrubbed, non-boundary position without restarting the interval.
  const resumeTrack=await w.locator('[data-slot=slider-track]').boundingBox();await p.mouse.click(resumeTrack.x+resumeTrack.width*.543,resumeTrack.y+resumeTrack.height/2);const resumed=Number(await w.getAttribute('data-angle'));assert(resumed>180&&resumed<210,JSON.stringify({resumed,resumeTrack}));await play.click();await p.waitForTimeout(180);await w.getByRole('button',{name:locale==='zh'?'暂停':'Pause',exact:true}).click();assert(Number(await w.getAttribute('data-angle'))>resumed);assert.equal(await stages.nth(2).getAttribute('aria-checked'),'true');assert((await w.locator('.wave-value').last().textContent()).startsWith('-'));
  const beforeStatic=await w.locator('.conduction-visualization').boundingBox();
  const staticButton=w.locator('[data-static-diagram]');await staticButton.click();const dialog=p.getByRole('dialog');await dialog.waitFor();
  const staticImage=dialog.locator('.figure-enlarged img');await staticImage.waitFor();assert((await staticImage.getAttribute('src')).includes('p2-f26-q4-waveforms'));
  assert.equal(await w.locator('.study-figure').count(),0,'The full sheet must not append another card to the article');
  assert(Math.abs((await w.locator('.conduction-visualization').boundingBox()).height-beforeStatic.height)<1,'Opening a full sheet must not grow the article');
  await dialog.getByRole('button',{name:locale==='zh'?'查看细节':'View details',exact:true}).click();assert.equal(await dialog.locator('.figure-enlarged').getAttribute('data-fit-width'),'false');await dialog.getByRole('button',{name:locale==='zh'?'适应窗口':'Fit view',exact:true}).click();
  await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await staticButton.evaluate(e=>e===document.activeElement));
  await w.locator('[data-conduction-help]').click();assert(await p.getByText(locale==='zh'?'读图说明':'Reading this diagram',{exact:true}).count());await p.keyboard.press('Escape');
  await stages.nth(1).click();await play.click();
  await p.locator(`${part} .part-trigger`).click();await p.waitForTimeout(400);if(await w.count())assert.equal(await w.getAttribute('data-playing'),'false');
  await p.locator(`${part} .part-trigger`).click();await p.waitForSelector(`${widget}[data-ready=true]`);assert.equal(await p.locator(widget).getAttribute('data-playing'),'false');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),JSON.stringify({width,locale,theme,overflow:await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&!e.closest('[role=dialog],[hidden],[inert]');}).slice(-15).map(e=>({tag:e.tagName,cls:e.getAttribute('class'),right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth}))}))}));
  const saved=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),course.storageKey);assert.equal(saved.notes['p2-f26-q4-a'],'keep legacy');assert.equal(saved.completed['p2-f26-q4-b'],true);
  assert.deepEqual(errors,[]);if(width!==820){await p.locator(widget).screenshot({path:`${out}/${locale}-${theme}-${width}.png`});}
  results.push({locale,theme,width,result:'pass'});await c.close();
 }
 // Language/theme transitions preserve angle but stop playback and select owned assets.
 {const c=await contextFor('en','light',1440),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await open(p);await p.waitForSelector(`${widget}[data-ready=true]`);let w=p.locator(widget);
  await w.getByRole('radio').nth(1).click();await w.getByRole('button',{name:'Play',exact:true}).click();await p.waitForTimeout(100);
  await p.getByRole('button',{name:'切换为中文',exact:true}).click();await p.waitForSelector(`${widget}[data-ready=true]`);assert.equal(await w.getAttribute('data-playing'),'false');assert((await w.locator('h4').textContent()).includes('导通'));assert((await w.locator('use').first().getAttribute('href')).includes('/zh-cn/'));
  await p.getByRole('button',{name:'切换深色主题',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[data-interaction] use')?.getAttribute('href').includes('-dark.svg'));await p.waitForSelector(`${widget}[data-ready=true]`);assert.equal(await w.getAttribute('data-playing'),'false');
  await w.getByRole('button',{name:'播放',exact:true}).click();await p.waitForTimeout(100);await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await p.waitForFunction(()=>document.querySelector('[data-interaction]')?.getAttribute('data-playing')==='false');
  await w.getByRole('button',{name:'播放',exact:true}).click();await p.waitForTimeout(100);await p.locator('a[href="/problems/p2-f26-q5/"]').first().click();await p.waitForSelector('[data-problem="p2-f26-q5"][data-study-ready=true]');assert.equal(await p.locator(widget).count(),0);assert.deepEqual(errors,[]);results.push({localeThemeOffscreenNavigation:true,result:'pass'});await c.close();}
 // Real touch taps and pointer dragging stop at arbitrary angles, not detents.
 {const c=await contextFor('zh','dark',390,'no-preference',{hasTouch:true}),p=await c.newPage();await open(p);await p.waitForSelector(`${widget}[data-ready=true]`);const w=p.locator(widget),track=await w.locator('[data-slot=slider-track]').boundingBox(),y=track.y+track.height/2;
  for(const fraction of [.137,.357,.543,.821]){
   await p.touchscreen.tap(track.x+track.width*fraction,y);const angle=Number(await w.getAttribute('data-angle'));assert(Math.abs(angle-fraction*360)<.25);assert(![0,30,180,210,360].includes(angle));
  }
  await w.getByRole('slider').focus();await p.keyboard.press('Home');await p.mouse.move(track.x+1,y);await p.mouse.down();const positions=[];
  for(let i=1;i<=16;i++){await p.mouse.move(track.x+track.width*i/16,y);positions.push(await w.getAttribute('data-angle'));}
  await p.mouse.move(track.x+track.width+6,y);await p.mouse.up();assert(new Set(positions).size>8);assert.equal(await w.getAttribute('data-angle'),'360.00');assert.equal(await w.getByRole('radio').nth(3).getAttribute('aria-checked'),'true');
  await w.getByRole('button',{name:'从头播放',exact:true}).click();await p.waitForTimeout(120);assert(Number(await w.getAttribute('data-angle'))<30);assert.equal(await w.getByRole('radio').nth(0).getAttribute('aria-checked'),'true');
  await p.touchscreen.tap(track.x+track.width*.456,y);assert.equal(await w.getAttribute('data-playing'),'false');const scrubbed=await w.getAttribute('data-angle');assert(Math.abs(Number(scrubbed)-.456*360)<.25);await p.waitForTimeout(120);assert.equal(await w.getAttribute('data-angle'),scrubbed);
  results.push({continuousTouchAndDrag:true,scrubPauses:true,restartExplicit:true,result:'pass'});await c.close();}
 // Reduced motion never schedules animated current markers.
 {const c=await contextFor('en','light',390,'reduce'),p=await c.newPage();await open(p);await p.waitForSelector(`${widget}[data-ready=true]`);await p.locator(widget).getByRole('button',{name:'Jump to cycle end',exact:true}).click();assert.equal(await p.locator(widget).getAttribute('data-angle'),'360.00');assert.equal(await p.locator(widget).getAttribute('data-playing'),'false');assert.equal(await p.locator('.conduction-carrier').count(),0);await p.locator(widget).getByRole('slider').focus();await p.keyboard.press('End');assert.equal(await p.locator(widget).getAttribute('data-angle'),'360.00');await p.locator(widget).getByRole('button',{name:'Play from start',exact:true}).click();assert.equal(await p.locator(widget).getAttribute('data-angle'),'0.00');results.push({reducedMotion:true,result:'pass'});await c.close();}
 // Failed auxiliary requests leave the authored full SVG and allow retry.
 {const c=await contextFor(),p=await c.newPage();await p.route('**/p2-f26-q4-conduction.json',r=>r.abort());await open(p);const retry=p.getByRole('button',{name:'Retry interactive diagram',exact:true});await retry.waitFor();assert(await p.locator(`${part} .study-figure img`).count());await p.unroute('**/p2-f26-q4-conduction.json');await retry.click();await p.waitForSelector(`${widget}[data-ready=true]`);results.push({assetFailureRetry:true,result:'pass'});await c.close();}
 // No JS continues to expose the full, authored static waveform SVG.
 {const c=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),p=await c.newPage();await p.goto(`${url}/problems/p2-f26-q4/`);const html=await p.content();assert(html.includes('p2-f26-q4-waveforms'));assert.equal(await p.locator('.conduction-visualization').count(),0);
 const image=p.locator(`${part} .study-figure img`);assert(await image.isVisible(),'No-JS fallback must be visibly readable, not merely present behind a hidden accordion');assert(await image.evaluate(i=>i.complete&&i.naturalWidth>0));assert(await p.locator(`${part} [data-answer="p2-f26-q4-a"]`).isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push({noJavaScript:true,result:'pass'});await c.close();}
 await writeFile(`${out}/report.json`,JSON.stringify({checks:results},null,2));console.log('PASS',JSON.stringify(results));
}finally{await browser.close();}
