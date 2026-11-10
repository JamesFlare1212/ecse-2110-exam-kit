// Verify the delivered ruler against SVG screen coordinates, not just authored percentages.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
import {FULL_PROFILES} from '../src/lib/visualizations/full-converter-model.mjs';
const entries=exams.flatMap(exam=>exam.problems.flatMap(problem=>problem.parts.filter(part=>part.interaction).map(part=>({problem:problem.id,part:part.id,...part.interaction}))));
if(!entries.length){console.log('SKIP: no converter interactions mounted');process.exit(0);}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL||'http://127.0.0.1:4173',out=process.env.QA_WAVES_ARTIFACTS||'artifacts/converter-waves';
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const checks=[];await mkdir(out,{recursive:true});
async function aligned(widget,alpha){
 const g=await widget.evaluate(root=>{
  const rect=node=>node.getBoundingClientRect().toJSON(),scale=root.querySelector('.conduction-wave-scale');
  return {theta:+root.dataset.angle,panel:rect(root.querySelector('.conduction-wave-panel')),scale:rect(scale),axis:rect(root.querySelector('.conduction-wave-axis')),rows:[...root.querySelectorAll('.conduction-wave-plot')].map(svg=>{
   const screen=x=>new DOMPoint(x,15).matrixTransform(svg.getScreenCTM()).x;
   return {box:rect(svg),start:screen(5),end:screen(315),dot:screen(+svg.querySelector('.wave-dot').getAttribute('cx')),cursor:screen(+svg.querySelector('.wave-cursor').getAttribute('d').match(/M\s+([\d.]+)/)[1]),clip:screen(5+ +svg.querySelector('clipPath rect').getAttribute('width')),guides:[...svg.querySelectorAll('[data-wave-boundary]')].map(line=>({angle:+line.dataset.waveBoundary,x:screen(+line.getAttribute('x1')),firing:line.hasAttribute('data-trigger')}))};
  }),labels:[...scale.querySelectorAll('[data-wave-angle]')].map(node=>{
   const box=node.getBoundingClientRect(),style=getComputedStyle(node,'::before'),matrix=new DOMMatrixReadOnly(style.transform);
   return {angle:+node.dataset.waveAngle,box:box.toJSON(),center:box.x+box.width/2,tickX:box.x+parseFloat(style.left)+parseFloat(style.width)/2+matrix.m41,tickY:box.y+parseFloat(style.top)+matrix.m42,firing:node.hasAttribute('data-trigger'),font:parseFloat(getComputedStyle(node).fontSize)};
  })};
 });
 const expected=[0,alpha,180,180+alpha,360];assert.deepEqual(g.labels.map(label=>label.angle),expected);
 assert(g.axis.y>=g.rows.at(-1).box.bottom,'The ruler follows the final waveform, without overlaying it');
 assert(g.axis.bottom<=g.panel.bottom,'The ruler remains inside the waveform panel');
 for(const row of g.rows){
  assert(Math.abs(row.box.x-g.scale.x)<.1&&Math.abs(row.box.width-g.scale.width)<.1,'Rows and ruler share their exact grid column and native border inset');
  assert.deepEqual(row.guides.map(guide=>guide.angle),expected,'Every row uses the actual profile boundaries');
  assert.deepEqual(row.guides.filter(guide=>guide.firing).map(guide=>guide.angle),[alpha,180+alpha]);
  for(const [index,guide] of row.guides.entries()){
   const label=g.labels[index];assert(Math.abs(guide.x-label.center)<.15,'Numeric label centers align to SVG reference lines');
   assert(Math.abs(guide.x-label.tickX)<.15,'Ruler ticks align to SVG reference lines');
   assert(Math.abs(label.tickY-g.scale.y)<.1,'Staggering a label never moves its tick off the baseline');
  }
  const expectedCursor=row.start+(row.end-row.start)*g.theta/360;
  for(const x of [row.dot,row.cursor,row.clip])assert(Math.abs(x-expectedCursor)<.15,'Cursor, dot and revealed trace use the same angular scale');
 }
 for(const label of g.labels){assert(label.font>=10);assert(label.box.x>=g.panel.x&&label.box.right<=g.panel.right,'Labels stay inside the panel');}
 for(let i=0;i<g.labels.length;i++)for(let j=i+1;j<g.labels.length;j++){
  const a=g.labels[i].box,b=g.labels[j].box;
  if(Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1)assert(a.right+1<=b.left,`Ruler labels do not collide: ${JSON.stringify({alpha,plot:g.scale,panel:g.panel,a:g.labels[i],b:g.labels[j]})}`);
 }
 return g;
}
try{
 for(const entry of entries)for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [320,390,1244,1440]){
  const context=await browser.newContext({viewport:{width,height:1100},deviceScaleFactor:width===1244?1.5:1,reducedMotion:'reduce'});
  try{
   await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,sidebars:{navigation:false,references:false}})),{key:course.storageKey,locale,theme});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`${base}/problems/${entry.problem}/`);await page.waitForSelector('[data-study-ready=true]');await page.locator(`[data-part="${entry.part}"] .part-trigger`).click();await page.waitForSelector('[data-interaction][data-ready=true]');
   if(locale==='zh'&&fontCSS)await page.addStyleTag({content:fontCSS});await page.evaluate(()=>document.fonts.ready);
   const widget=page.locator('[data-interaction]'),slider=widget.getByRole('slider'),alpha=entry.profile?FULL_PROFILES[entry.profile].alpha:30;
   await aligned(widget,alpha);
   await widget.getByRole('radio').nth(1).click();await aligned(widget,alpha);
   // The screenshot's 59° cursor must remain distinct from Q3's 60° firing guide.
   await slider.focus();await page.keyboard.press('Home');const track=await widget.locator('[data-slot=slider-track]').boundingBox();await page.mouse.click(track.x+track.width*59/360,track.y+track.height/2);
   assert.equal(await slider.getAttribute('aria-valuenow'),'59');await aligned(widget,alpha);
   if(locale==='zh'&&theme==='dark')await widget.locator('.conduction-wave-panel').screenshot({path:`${out}/${entry.problem}-${width}-59.png`});
   await widget.getByRole('radio').last().click();const final=await aligned(widget,alpha);
   if(locale==='zh'&&theme==='dark')await widget.screenshot({path:`${out}/${entry.problem}-${width}-last.png`});
   const trace=await widget.locator('.wave-reference').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d')));
   for(const row of await widget.locator('.conduction-wave-row').all())if(await row.getAttribute('aria-pressed')==='true')await row.click();
   await aligned(widget,alpha);assert.deepEqual(await widget.locator('.wave-reference').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d'))),trace,'Disabling measurements does not change curves or references');
   if(width>1180){
    // The actual panel, not the viewport, decides whether ruler labels need two rows.
    for(const side of ['navigation','references'])await page.locator(`[data-sidebar-toggle=${side}]`).click();
    await page.locator('[data-sidebar-toggle=references][aria-expanded=true]').waitFor();await page.waitForTimeout(220);await aligned(widget,alpha);
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
   checks.push({problem:entry.problem,locale,theme,width,plotWidth:final.scale.width,firing:[alpha,180+alpha],rulerAligned:true,cursorAligned:true,nonOverlappingLabels:true,responsiveSidebarLayout:width>1180});
  }finally{await context.close();}
 }
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2)+'\n');console.log(`PASS ${checks.length} converter-wave layouts: profile-correct guides, SVG/ruler alignment, cursor and responsive labels`);
}finally{await browser.close();}
