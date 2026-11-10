// True angular coordinates, shared transport centerline and painted thumb/tick order.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
import {FULL_PROFILES} from '../src/lib/visualizations/full-converter-model.mjs';
const entries=exams.flatMap(exam=>exam.problems.flatMap(problem=>problem.parts.filter(part=>part.interaction).map(part=>({problem:problem.id,part:part.id,...part.interaction}))));
if(!entries.length){console.log('SKIP: no converter interactions mounted');process.exit(0);}
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL||'http://127.0.0.1:4173',out=process.env.QA_SLIDER_ARTIFACTS||'artifacts/converter-slider';
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const checks=[];await mkdir(out,{recursive:true});
async function geometry(widget){
 return widget.evaluate(root=>{
  const rect=node=>node.getBoundingClientRect().toJSON(),thumb=root.querySelector('[role=slider]');
  return {track:rect(root.querySelector('[data-slot=slider-track]')),range:rect(root.querySelector('[data-slot=slider-range]')),thumb:rect(thumb),value:+thumb.getAttribute('aria-valuenow'),controls:rect(root.querySelector('.conduction-controls')),output:rect(root.querySelector('.conduction-angle')),phaseIsolation:getComputedStyle(root.querySelector('.conduction-phase')).isolation,thumbZ:getComputedStyle(thumb).zIndex,markersZ:getComputedStyle(root.querySelector('.conduction-boundaries')).zIndex,
   marks:[...root.querySelectorAll('[data-boundary]')].map(node=>{
    const box=node.getBoundingClientRect(),style=getComputedStyle(node,'::before'),matrix=new DOMMatrixReadOnly(style.transform);
    return {angle:+node.dataset.boundary,x:box.x+parseFloat(style.left)+parseFloat(style.width)/2+matrix.m41,y:box.y+parseFloat(style.top)+parseFloat(style.height)/2+matrix.m42,label:box.toJSON()};
   })};
 });
}
function aligned(g){
 const center=box=>box.y+box.height/2,expected=g.track.x+g.track.width*g.value/360;
 assert(Math.abs(g.thumb.x+g.thumb.width/2-expected)<.15,`Thumb uses the same angular scale: ${JSON.stringify(g)}`);
 assert(Math.abs(center(g.thumb)-center(g.track))<.1,'Thumb is vertically centered on the track');
 for(const box of [g.controls,g.output])assert(Math.abs(center(box)-center(g.track))<.1,'Transport controls share the track centerline');
 assert(Math.abs(g.range.right-expected)<.15,'Progress fill ends at the thumb center');
 for(const mark of g.marks){
  assert(Math.abs(mark.x-g.track.x-g.track.width*mark.angle/360)<.15,'Ticks use the same exact angular scale');
  assert(Math.abs(mark.y-center(g.track))<.1,'Ticks are vertically centered on the track');
  assert(mark.label.y>=g.thumb.bottom+3,'Tick labels do not touch the handle');
 }
 assert.equal(g.phaseIsolation,'isolate');assert(+g.thumbZ>+g.markersZ,'Only the handle paints above the marks');
}
async function dragTo(page,widget,angle){
 const track=widget.locator('[data-slot=slider-track]');await track.scrollIntoViewIfNeeded();
 const g=await geometry(widget);await page.mouse.move(g.thumb.x+g.thumb.width/2,g.thumb.y+g.thumb.height/2);await page.mouse.down();
 await page.mouse.move(g.track.x+g.track.width*angle/360,g.track.y+g.track.height/2,{steps:3});await page.mouse.up();
 const result=await geometry(widget);assert(Math.abs(result.value-angle)<=.051,`Continuous drag at ${angle}°: ${result.value}`);aligned(result);return result;
}
async function paintedHandle(page,widget,path){
 const g=await geometry(widget),transport=widget.locator('.conduction-transport'),clip=await transport.boundingBox();
 const image=await transport.screenshot(path?{path}:{});
 const pixel=await page.evaluate(async({base64,x,y,cssWidth})=>{
  const bitmap=await createImageBitmap(await(await fetch(`data:image/png;base64,${base64}`)).blob()),canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d');
  context.drawImage(bitmap,0,0);const scale=bitmap.width/cssWidth;
  return [...context.getImageData(Math.floor(x*scale),Math.floor(y*scale),1,1).data];
 },{base64:image.toString('base64'),x:g.thumb.x+g.thumb.width/2-clip.x,y:g.thumb.y+g.thumb.height/2-clip.y,cssWidth:clip.width});
 assert.deepEqual(pixel,[255,255,255,255],'The actual tick pixel is covered by the opaque native handle');
}
try{
 for(const entry of entries)for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [320,390,1244,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:width===1244?1.5:1,reducedMotion:'reduce',hasTouch:width<500});
  try{
   await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,sidebars:{navigation:false,references:false}})),{key:course.storageKey,locale,theme});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`${base}/problems/${entry.problem}/`);await page.waitForSelector('[data-study-ready=true]');await page.locator(`[data-part="${entry.part}"] .part-trigger`).click();await page.waitForSelector('[data-interaction][data-ready=true]');
   if(locale==='zh'&&fontCSS)await page.addStyleTag({content:fontCSS});await page.evaluate(()=>document.fonts.ready);
   const widget=page.locator('[data-interaction]'),slider=widget.getByRole('slider'),alpha=entry.profile?FULL_PROFILES[entry.profile].alpha:30;
   await widget.locator('.conduction-transport').scrollIntoViewIfNeeded();
   const originalHeight=(await widget.boundingBox()).height,marks=[0,alpha,180,180+alpha,360];
   assert.deepEqual((await geometry(widget)).marks.map(mark=>mark.angle),marks);
   for(const angle of marks)await dragTo(page,widget,angle);
   assert.equal(await widget.getAttribute('data-angle'),'360.00');assert.equal(await widget.getByRole('radio').last().getAttribute('aria-checked'),'true');
   await slider.focus();await page.keyboard.press('Home');assert.equal(await slider.getAttribute('aria-valuenow'),'0');aligned(await geometry(widget));
   // Click a non-boundary position, then retain native tenth-degree keyboard precision.
   const g=await geometry(widget);await page.mouse.click(g.track.x+g.track.width*123.4/360,g.track.y+g.track.height/2);
   assert.equal(await slider.getAttribute('aria-valuenow'),'123.4');
   await slider.focus();await page.keyboard.press('ArrowRight');assert.equal(await slider.getAttribute('aria-valuenow'),'123.5');aligned(await geometry(widget));
   await page.keyboard.press('ArrowLeft');assert.equal(await slider.getAttribute('aria-valuenow'),'123.4');
   await page.keyboard.press('End');assert.equal(await slider.getAttribute('aria-valuenow'),'360');aligned(await geometry(widget));
   if(width===390){
    await page.keyboard.press('Home');const touch=await geometry(widget);
    await page.touchscreen.tap(touch.track.x+touch.track.width*275/360,touch.track.y+touch.track.height/2);
    assert.equal(await slider.getAttribute('aria-valuenow'),'275');aligned(await geometry(widget));
   }
   // A boundary jump preserves the unrounded scientific angle (notably Q5).
   await widget.getByRole('radio').nth(1).click();assert(Math.abs(Number(await widget.getAttribute('data-angle'))-alpha)<.006);aligned(await geometry(widget));
   const name=`${entry.problem}-${locale}-${theme}-${width}`;
   await paintedHandle(page,widget,`${out}/${name}.png`);
   assert(Math.abs((await widget.boundingBox()).height-originalHeight)<.1,'Scrubbing does not reflow the figure');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
   checks.push({problem:entry.problem,locale,theme,width,deviceScaleFactor:width===1244?1.5:1,marks,exactCoordinates:true,transportAligned:true,thumbCoversTick:true,tenthDegreeInput:true,touch:width===390});
  }finally{await context.close();}
 }
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2)+'\n');console.log(`PASS ${checks.length} converter-slider layouts: five marks, endpoints, drag/click/keyboard/touch and painted occlusion`);
}finally{await browser.close();}
