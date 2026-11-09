// Layout contract: compact, readable main figure; full plots live only in a dialog.
import {strict as assert} from 'node:assert';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
if(!exams.some(exam=>exam.problems.some(problem=>problem.id==='p2-f26-q4'&&problem.parts.some(part=>part.interaction?.kind==='semi-converter')))){
 console.log('SKIP: the approved semi-converter is not mounted');process.exit(0);
}
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_URL||'http://127.0.0.1:4173',out=process.env.QA_COMPACT_ARTIFACTS||'artifacts/conduction-polish';
await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const checks=[];
try{
 for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [320,390,820,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/problems/p2-f26-q4/`,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-study-ready=true]');
  await page.locator('[data-part=p2-f26-q4-a] .part-trigger').click();await page.waitForSelector('[data-interaction][data-ready=true]');
  if(locale==='zh'&&process.env.QA_CJK_CSS)await page.addStyleTag({content:await readFile(process.env.QA_CJK_CSS,'utf8')});
  await page.evaluate(()=>document.fonts.ready);
  const widget=page.locator('.solution-interaction'),card=page.locator('.conduction-visualization');
  const box=await card.boundingBox();assert(box.height<=(box.width>=700?650:980),JSON.stringify({locale,theme,width,box}));
  assert.equal(await widget.locator('.wave-row-label').count(),9);assert.equal(await widget.locator('[role=radio]').count(),4);
  const radioRows=await widget.getByRole('radio').evaluateAll(nodes=>new Set(nodes.map(n=>Math.round(n.getBoundingClientRect().top))).size);assert.equal(radioRows,1,'Four compact phases must share one row');
  const labels=await widget.locator('.conduction-waves').evaluate(svg=>[...svg.querySelectorAll('text,tspan')].map(e=>({size:parseFloat(getComputedStyle(e).fontSize),box:e.getBoundingClientRect().toJSON()})));assert(labels.every(l=>l.size>=10),'Compactness must not shrink scientific labels');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await card.screenshot({path:`${out}/final-${locale}-${theme}-${width}.png`});
  const trigger=widget.locator('[data-static-diagram]');await trigger.click();const dialog=page.locator('.figure-dialog');await dialog.waitFor();
  await page.waitForFunction(()=>{const image=document.querySelector('.figure-enlarged img');return image?.complete&&image.naturalWidth>0;});
  assert.equal(await widget.locator('.study-figure').count(),0,'No second plot card in the article');
  assert(Math.abs((await card.boundingBox()).height-box.height)<1,'Full plot must not increase reading height');
  const fit=dialog.getByRole('button',{name:locale==='zh'?'查看细节':'View details',exact:true});assert.equal(await dialog.locator('.figure-enlarged').getAttribute('data-fit-width'),'true');
  const overview=await dialog.locator('.figure-enlarged').evaluate(region=>{const i=region.querySelector('img'),r=region.getBoundingClientRect(),b=i.getBoundingClientRect();return{image:b.toJSON(),region:r.toJSON(),ratio:b.width/b.height,natural:i.naturalWidth/i.naturalHeight};});
  assert(overview.image.bottom<=overview.region.bottom+1&&overview.image.right<=overview.region.right+1,JSON.stringify(overview));assert(Math.abs(overview.ratio-overview.natural)<.01);
  if(width===390||width===1440)await page.screenshot({path:`${out}/full-${locale}-${theme}-${width}.png`});
  await fit.click();assert.equal(await dialog.locator('.figure-enlarged').getAttribute('data-fit-width'),'false');await dialog.getByRole('button',{name:locale==='zh'?'适应窗口':'Fit view',exact:true}).click();
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert(await trigger.evaluate(e=>document.activeElement===e));
  assert(Math.abs((await card.boundingBox()).height-box.height)<1);
  await widget.locator('[data-conduction-help]').click();assert(await page.getByText(locale==='zh'?'读图说明':'Reading this diagram',{exact:true}).count());
  if(width===390||width===1440)await page.screenshot({path:`${out}/help-${locale}-${theme}-${width}.png`});
  await page.keyboard.press('Escape');assert.equal(await widget.getAttribute('data-playing'),'false');
  // Boundary information remains visible without opening help.
  await widget.getByRole('radio').nth(2).click();assert((await widget.locator('.conduction-state').textContent()).includes(locale==='zh'?'转负':'negative'));
  await card.screenshot({path:`${out}/reverse-${locale}-${theme}-${width}.png`});
  assert.deepEqual(errors,[]);checks.push({locale,theme,viewport:width,cardWidth:box.width,height:box.height,fullPlotHeightGrowth:0,allNineRows:true});await context.close();
 }
 // R1 review reproductions: bound the WHOLE help popup to actual anchor space.
 for(const [width,height]of [[375,667],[320,480],[1440,800]])for(const offset of [80,200,height-180])for(const locale of ['en','zh']){
  const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await c.newPage();
  await c.addInitScript(({key,locale})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme:'light'})),{key:course.storageKey,locale});
  await p.goto(`${base}/problems/p2-f26-q4/`);await p.waitForSelector('[data-study-ready=true]');await p.locator('[data-part=p2-f26-q4-a] .part-trigger').click();await p.waitForSelector('[data-interaction][data-ready=true]');
  if(locale==='zh'&&process.env.QA_CJK_CSS)await p.addStyleTag({content:await readFile(process.env.QA_CJK_CSS,'utf8')});
  await p.evaluate(()=>document.fonts.ready);
  const stateHeights=[];for(let i=0;i<4;i++){await p.locator('[data-interaction]').getByRole('radio').nth(i).click();stateHeights.push((await p.locator('.conduction-visualization').boundingBox()).height);}
  assert(Math.max(...stateHeights)-Math.min(...stateHeights)<2,JSON.stringify({locale,width,height,stateHeights}));
  await p.locator('.conduction-heading').evaluate((e,top)=>window.scrollBy({top:e.getBoundingClientRect().top-top,behavior:'instant'}),offset);
  const trigger=p.locator('[data-conduction-help]');await trigger.click();const popup=p.locator('.conduction-help-popover');await popup.waitFor();
  const bounds=await popup.boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,JSON.stringify({width,height,offset,locale,bounds}));
  const body=popup.locator('.conduction-help-body');await body.focus();await p.keyboard.press('End');await body.evaluate(e=>e.scrollTop=e.scrollHeight);
  const bottom=await body.evaluate(e=>({last:e.lastElementChild.getBoundingClientRect().bottom,box:e.getBoundingClientRect().bottom,scroll:e.scrollHeight,client:e.clientHeight,top:e.scrollTop}));assert(bottom.last<=bottom.box+1,JSON.stringify(bottom));
  assert((await popup.getByText(locale==='zh'?'读图说明':'Reading this diagram',{exact:true}).count())>0);
  await p.screenshot({path:`${out}/bounded-help-${locale}-${width}x${height}-${offset}.png`});await p.keyboard.press('Escape');await popup.waitFor({state:'detached'});assert(await trigger.evaluate(e=>document.activeElement===e));
  checks.push({boundedHelp:true,locale,width,height,anchorOffset:offset,bottomReachable:true,stateHeightDelta:Math.max(...stateHeights)-Math.min(...stateHeights)});await c.close();
 }
 // Short mobile view: overview and its controls must remain usable.
 {const context=await browser.newContext({viewport:{width:320,height:480},reducedMotion:'reduce'}),p=await context.newPage();await p.goto(`${base}/problems/p2-f26-q4/`);await p.waitForSelector('[data-study-ready=true]');await p.locator('[data-part=p2-f26-q4-a] .part-trigger').click();await p.waitForSelector('[data-interaction][data-ready=true]');await p.locator('[data-static-diagram]').click();const d=p.locator('.figure-dialog');await d.waitFor();const r=await d.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=321&&r.y+r.height<=481);assert(await d.getByRole('button',{name:'查看细节',exact:true}).isVisible());await p.keyboard.press('Escape');checks.push({shortViewport:'320x480',result:'pass'});await context.close();}
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2));console.log('PASS',JSON.stringify(checks));
}finally{await browser.close();}
