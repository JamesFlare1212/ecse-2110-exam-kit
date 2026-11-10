// Run with Bun against `bun run preview`; PLAYWRIGHT_MODULE may point to an isolated install.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadContent} from '../content/papers.server.ts';
import {course} from '../content/course.ts';
import {checkFigureSegments} from './browser-figure-qa.mjs';
import {parseText, solutionFigure} from '../content/text.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const output=process.env.QA_FIGURE_LAYOUT_ARTIFACTS??'artifacts/figure-layout';
const {exams}=loadContent(resolve('content'));
const names=problem=>[...new Set([problem.figure,...problem.parts.flatMap(part=>[part.figure,part.questionFigure?.name])].filter(Boolean))];
const problems=exams.flatMap(exam=>exam.problems).filter(problem=>names(problem).length);
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const checks=[];
const record=(name,data={})=>{checks.push({name,...data});console.log('PASS',name,JSON.stringify(data));};
await mkdir(output,{recursive:true});

const staticFallbackPages=new WeakSet();
async function ready(page,id) {
  // This suite verifies the canonical full SVG, not the separately tested interactive UI.
  if(!staticFallbackPages.has(page)){await page.route('**/figures/*-conduction.json',route=>route.abort());staticFallbackPages.add(page);}
  await page.goto(`${base}/problems/${id}/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-study-ready=true]');
  await page.evaluate(()=>document.fonts.ready);
  const toggle=page.locator('[data-solution-toggle]');
  if(id==='p2-f26-q1')assert.equal(await page.locator('.study-figure:visible').count(),0,'The explanatory KVL circuit must not appear in the prompt or collapsed solution');
  if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
  const problem=exams.flatMap(exam=>exam.problems).find(problem=>problem.id===id);
  for(const part of problem.parts.filter(part=>part.interaction)) {
    await page.waitForSelector(`[data-part="${part.id}"] .conduction-load-error`);
  }
  await page.waitForFunction(()=>[...document.querySelectorAll('.study-figure img')].every(image=>image.complete&&image.naturalWidth>0));
}

async function detail(page,figure,locale) {
  const trigger=figure.getByRole('button',{name:locale==='zh'?'放大图示':'Enlarge figure',exact:true});
  await trigger.click();
  const dialog=page.locator('.figure-dialog'),region=dialog.locator('.figure-enlarged');
  await dialog.waitFor();
  await dialog.evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished)));
  await page.waitForFunction(()=>{const image=document.querySelector('.figure-enlarged img');return image?.complete&&image.naturalWidth>0;});
  const measure=()=>dialog.evaluate(node=>{
    const region=node.querySelector('.figure-enlarged'),image=region.querySelector('img');
    const bounds=node.getBoundingClientRect(),actions=node.querySelector('.figure-dialog-actions').getBoundingClientRect();
    return {left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom,actionBottom:actions.bottom,
      width:image.getBoundingClientRect().width,preferred:parseFloat(node.style.getPropertyValue('--figure-width')),
      overflow:region.scrollWidth-region.clientWidth,pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  const clear=await measure();
  assert.ok(clear.width>=clear.preferred-1,`Detail must retain each drawing’s own readable label size: ${JSON.stringify(clear)}`);
  assert.ok(clear.left>=0&&clear.right<=clear.viewport+1&&clear.top>=0&&clear.bottom<=await page.evaluate(()=>innerHeight)+1,'Detail dialog stays within the viewport');
  assert.ok(clear.actionBottom<=clear.bottom,'Detail actions remain reachable');
  assert.ok(clear.pageWidth<=clear.viewport+1,'Detail scrolling stays inside its region');
  if(clear.overflow>1) {
    await region.focus();await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.querySelector('.figure-enlarged').scrollLeft>0);
  }
  const fit=dialog.getByRole('button',{name:locale==='zh'?'适应宽度':'Fit width',exact:true});
  assert.equal(await fit.getAttribute('aria-pressed'),'false');
  await fit.click();
  assert.equal(await fit.getAttribute('aria-pressed'),'true');
  assert.ok((await measure()).overflow<=1,'Fit width shows the complete drawing without horizontal panning');
  await fit.click();
  assert.ok((await measure()).width>=clear.preferred-1,'Leaving Fit width restores readable detail');
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  assert.ok(await trigger.evaluate(node=>document.activeElement===node),'Closing detail returns focus to its enlarge control');
}

try {
  for(const theme of ['light','dark'])for(const locale of ['zh','en'])for(const width of [390,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});
    await context.addInitScript(({key,theme,locale})=>localStorage.setItem(key,JSON.stringify({version:1,theme,locale})),{key:course.storageKey,theme,locale});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      for(const problem of problems) {
        await ready(page,problem.id);
        const figures=page.locator('.study-figure');
        assert.equal(await page.locator('[data-figure-source]').count(),0,'Figure toolbars omit redundant page-number actions');
        if(problem.id==='e2-s25-q6'){
          const statement=page.locator('.original-statement');
          assert.equal(await statement.getByRole('list').count(),1,'Both transformer test conditions form one authored list');
          assert.equal(await statement.getByRole('listitem').count(),2);
        }
        assert.deepEqual([...new Set(await figures.evaluateAll(nodes=>nodes.map(node=>node.dataset.figure)))].sort(),names(problem).sort());
        const metrics=await figures.evaluateAll(nodes=>nodes.map(node=>{
          const drawing=node.querySelector('.figure-image'),canvas=node.querySelector('.figure-canvas'),image=canvas.querySelector('img');
          const box=canvas.getBoundingClientRect(),bounds=node.getBoundingClientRect(),picture=image.getBoundingClientRect();
          const style=getComputedStyle(node),inset=getComputedStyle(drawing);
          return {name:node.dataset.figure,width:bounds.width,height:box.height,ratio:box.width/box.height,expectedRatio:Number(image.getAttribute('width'))/Number(image.getAttribute('height')),
            padding:[inset.paddingTop,inset.paddingRight,inset.paddingBottom,inset.paddingLeft].map(Number.parseFloat),
            margins:[style.marginTop,style.marginBottom].map(Number.parseFloat),
            overflowX:drawing.scrollWidth-drawing.clientWidth,overflowY:drawing.scrollHeight-drawing.clientHeight,
            imageFits:Math.abs(picture.width-box.width)<1&&Math.abs(picture.height-box.height)<1,
            controlsFit:[...node.querySelectorAll('button')].every(button=>{const r=button.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right+.5;}),
            local:image.src.includes(`/papers/${document.documentElement.lang.startsWith('zh')?'zh-cn':'en'}/`)};
        }));
        for(const metric of metrics) {
          assert.ok(metric.padding.every(value=>value<=8)&&metric.margins.every(value=>value<=12),`${metric.name}: image insets and outer gaps stay compact`);
          assert.ok(metric.overflowX<=1&&metric.overflowY<=1,`${metric.name}: article shows the whole drawing without nested scrolling`);
          assert.ok(Math.abs(metric.ratio-metric.expectedRatio)<.01&&metric.imageFits,`${metric.name}: intrinsic aspect ratio is preserved`);
          assert.ok(metric.controlsFit&&metric.local,`${metric.name}: localized assets and controls remain inside the card`);
        }
        for(const part of problem.parts) {
          const expected=parseText(part.solution[locale]).children.map(node=>solutionFigure(node)
            ? `figure:${solutionFigure(node)}` : node.type==='math' ? `math:${node.value}` : 'annotation');
          const body=page.locator(`[data-part="${part.id}"] .solution-body`);
          const actual=await body.evaluate(node=>[...node.children].map(child=>child.matches('.study-figure')
            ? `figure:${child.dataset.figure}` : child.matches('[data-interaction]')
              ? `figure:${child.querySelector('.study-figure').dataset.figure}` : child.matches('.derivation-equations')
              ? `math:${child.querySelector('[data-math]').getAttribute('data-math')}` : 'annotation'));
          assert.deepEqual(actual,expected,`${part.id}: figures and complete calculations follow authored Markdown order`);
          if(part.figure)assert.equal(await body.locator(`.study-figure[data-figure="${part.figure}"]`).count(),1,'No trailing duplicate of an inline figure');
        }
        if(problem.id==='p2-f26-q1') {
          const neighbors=await figures.first().evaluate(node=>({before:node.previousElementSibling?.textContent,after:node.nextElementSibling?.textContent,
            margin:parseFloat(getComputedStyle(node).marginTop)}));
          assert.ok(neighbors.before.includes(locale==='zh'?'稳态':'steady'),'The armature figure follows its modeling explanation');
          assert.ok(neighbors.after.includes(locale==='zh'?'基尔霍夫':'Kirchhoff'),'KVL prose immediately follows its circuit');
          assert.ok(neighbors.margin<=8,'Inline diagrams share the prose spacing rhythm');
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page-wide horizontal overflow');
        // Broad plots and tall waveform sheets must not regress to shared 600×360 caps.
        if(width===1440&&problem.id==='e2-s25-q4')assert.ok(metrics[0].width>600);
        if(width===1440&&problem.id==='p2-f26-q4')assert.ok(metrics.some(metric=>metric.height>600));
        if(['e2-s25-q4','p2-f26-q4','p2-f26-q1','e1-f26-q5'].includes(problem.id)) {
          const figure=figures.last();await detail(page,figure,locale);
          await figure.screenshot({path:`${output}/${problem.id}-${theme}-${locale}-${width}.png`});
        }
        for(const figure of await figures.all()) {
          const name=await figure.getAttribute('data-figure');
          await figure.screenshot({path:`${output}/${name}-${theme}-${locale}-${width}.png`});
        }
        record('Complete, proportional, localized article figures in authored explanation order',{problem:problem.id,theme,locale,width,figures:metrics.length});
      }
      assert.deepEqual(errors,[]);
    } finally {await context.close();}
  }
  const original=problems.find(problem=>problem.figure&&problem.originalFigure);
  if(original)await checkFigureSegments(browser,base,original.id,record);
  // Extremely narrow and short windows also keep detail controls usable.
  const context=await browser.newContext({viewport:{width:320,height:480},reducedMotion:'reduce'});
  try {
    const page=await context.newPage();
    await ready(page,'p2-f26-q4');
    await detail(page,page.locator('.study-figure').last(),'zh');
    record('Readable detail and Fit width work in a narrow, short viewport',{width:320,height:480});
  } finally {await context.close();}
  const recovery=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'});
  try {
    const page=await recovery.newPage();
    await page.route('**/figures/**',route=>route.abort());
    await page.goto(`${base}/problems/${original.id}/`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-study-ready=true]');
    const figure=page.locator('.study-figure').first();
    await figure.locator('.figure-error').waitFor();
    const height=await figure.evaluate(node=>node.getBoundingClientRect().height);
    assert.ok(await figure.getByRole('button',{name:'放大图示',exact:true}).isDisabled());
    await page.unroute('**/figures/**');
    await figure.getByRole('button',{name:'重试图示',exact:true}).click();
    await page.waitForFunction(()=>{const image=document.querySelector('.figure-image img');return image?.complete&&image.naturalWidth>0;});
    assert.ok(Math.abs(await figure.evaluate(node=>node.getBoundingClientRect().height)-height)<.5,'Retry preserves the reserved aspect ratio');
    await detail(page,figure,'zh');
    record('Image failure stays in the card and retry restores enlargement without shifting layout');
  } finally {await recovery.close();}
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,checks},null,2));
} finally {await browser.close();}
