import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';

export async function checkFigureSegments(browser,base,problemId,record) {
  const output=process.env.QA_FIGURE_ARTIFACTS??'artifacts/figure-segmented';
  await mkdir(output,{recursive:true});
  const results=[];
  for(const theme of ['light','dark'])for(const locale of ['zh','en'])for(const width of [320,390,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',colorScheme:theme});
    await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.goto(`${base}/problems/${problemId}/`,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-study-ready=true]');await page.evaluate(()=>document.fonts.ready);
      const figure=page.locator('.study-figure:visible').filter({has:page.locator('.figure-version')}).first();
      if(!await figure.count()){record('No visible original/recreated figure selector in this sample; skipped',{problemId});return;}
      await figure.scrollIntoViewIfNeeded();
      const group=figure.getByRole('radiogroup'),items=group.getByRole('radio');
      const image=figure.locator('.figure-image img');
      await page.waitForFunction(name=>{const image=document.querySelector(`[data-figure="${name}"] .figure-image img`);return image?.complete&&image.naturalWidth>0;},await figure.getAttribute('data-figure'));
      assert.equal(await items.count(),2);
      assert.equal(await group.getAttribute('data-orientation'),'horizontal');
      assert.equal(await group.locator('[aria-checked=true]').count(),1);
      const recreated=await image.getAttribute('src');
      assert.ok(recreated.includes(`/papers/${locale==='zh'?'zh-cn':'en'}/`));
      const before=await figure.boundingBox(),drawing=await figure.locator('.figure-image').boundingBox();
      const styles=await group.evaluate(group=>{
        const properties=['backgroundColor','color','borderRadius','borderColor','boxShadow','fontSize','fontWeight'];
        const style=(node,typography=true)=>Object.fromEntries(properties.filter(key=>typography||!key.startsWith('font')).map(key=>[key,getComputedStyle(node)[key]]));
        // The empty track inherits its parent's font; the visible items own typography.
        return {track:style(group,false),examTrack:style(document.querySelector('#exam-navigation [data-slot=tabs-list]'),false),active:style(group.querySelector('[aria-checked=true]')),examActive:style(document.querySelector('#exam-navigation [role=tab][aria-selected=true]'))};
      });
      assert.deepEqual(styles.track,styles.examTrack,'Figure track must use the same native styles as Exam tabs');
      assert.deepEqual(styles.active,styles.examActive,'Figure selection must use the same native styles as the active Exam tab');
      const controls=await figure.locator('.figure-toolbar button').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
      for(const control of controls)assert.ok(control.left>=before.x&&control.right<=before.x+before.width&&control.top>=before.y&&control.bottom<=before.y+before.height,'Both segments and enlargement must fit inside the figure, including narrow English layouts');
      const key=`${theme}-${locale}-${width}`;
      await figure.screenshot({path:`${output}/${key}-recreated.png`});
      await items.nth(1).click();
      await image.waitFor();
      await page.waitForFunction(name=>{const image=document.querySelector(`[data-figure="${name}"] .figure-image img`);return image?.src.includes('/original-figures/')&&image.complete&&image.naturalWidth>0;},await figure.getAttribute('data-figure'));
      assert.equal(await items.nth(1).getAttribute('aria-checked'),'true');
      assert.equal(await group.locator('[data-active]').count(),1);
      const after=await figure.boundingBox(),originalDrawing=await figure.locator('.figure-image').boundingBox();
      assert.ok(Math.abs(after.height-before.height)<.5,'Switching the figure must preserve card height');
      assert.ok(Math.abs(originalDrawing.height-drawing.height)<.5,'Switching the figure must preserve drawing height');
      await figure.screenshot({path:`${output}/${key}-original.png`});
      await items.nth(1).click();assert.equal(await items.nth(1).getAttribute('aria-checked'),'true','The selected segment cannot be unchecked');
      const original=await image.getAttribute('src');
      await figure.getByRole('button',{name:locale==='zh'?'放大图示':'Enlarge figure',exact:true}).click();
      await page.locator('.figure-dialog').waitFor();
      assert.equal(await page.locator('.figure-enlarged img').getAttribute('src'),original,'Enlargement must show the chosen version');
      await page.keyboard.press('Escape');await page.locator('.figure-dialog').waitFor({state:'detached'});
      await items.first().click();assert.equal(await items.first().getAttribute('aria-checked'),'true');
      await items.first().focus();await page.keyboard.press('ArrowRight');
      assert.equal(await items.nth(1).getAttribute('aria-checked'),'true');
      await page.keyboard.press('ArrowLeft');assert.equal(await items.first().getAttribute('aria-checked'),'true');
      assert.equal(await image.getAttribute('src'),recreated);
      await page.waitForFunction(name=>{const image=document.querySelector(`[data-figure="${name}"] .figure-image img`);return image?.src.includes('/figures/')&&image.complete&&image.naturalWidth>0;},await figure.getAttribute('data-figure'));
      assert.deepEqual(errors,[]);
      results.push({theme,locale,width,height:before.height});
      record('Figure segments match Exam styling, fit the toolbar, switch exclusively by pointer/keyboard and preserve drawing height',{theme,locale,width});
    } finally {await context.close();}
  }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results},null,2));
}
