// Shared by startup QA: inspect rendered native ghost actions, not just token strings.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {course} from '../content/course.ts';

function luminance(color) {
  assert.match(color, /^rgb\(/, `Expected an opaque rendered RGB color: ${color}`);
  const channels=color.match(/[\d.]+/g).slice(0,3).map(value=>Number(value)/255)
    .map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return channels.reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
}
function contrast(a,b) {
  const [low,high]=[luminance(a),luminance(b)].sort((a,b)=>a-b);
  return (high+.05)/(low+.05);
}
async function appearance(item) {
  return item.evaluate(node=>{
    const style=getComputedStyle(node),bounds=node.getBoundingClientRect();
    const meta=node.querySelector('small'),number=node.querySelector('.library-lecture-number');
    return {
      background:style.backgroundColor,border:style.borderColor,color:style.color,
      meta:meta?getComputedStyle(meta).color:null,number:number?getComputedStyle(number).color:null,
      bounds:[bounds.x,bounds.y,bounds.width,bounds.height],
      focused:node.matches(':focus-visible'),ring:style.boxShadow,
    };
  });
}
export async function checkHoverContrast(browser,base,problemId,record) {
  await mkdir('artifacts/hover-review',{recursive:true});
  for(const theme of ['light','dark'])for(const width of [1440,375]) {
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    await context.addInitScript(({key,theme})=>{
      localStorage.setItem(key,JSON.stringify({version:1,locale:'zh',theme}));
    },{key:course.storageKey,theme});
    try {
      const page=await context.newPage();
      await page.goto(`${base}/problems/${problemId}/`,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-study-ready=true]');
      let item,dialog;
      if(course.resources.lectures.length) {
        if(width<=800)await page.locator('[data-sidebar-toggle=navigation]').click();
        const navigation=page.locator(width<=800?'#mobile-exam-navigation':'#exam-navigation');
        await navigation.getByRole('button',{name:/课程讲义/}).click();
        dialog=page.locator('.library-dialog');
        item=dialog.locator('.library-lecture').first();
      } else {
        await page.getByRole('button',{name:'搜索题目与公式',exact:true}).click();
        dialog=page.locator('.search-dialog');
        item=dialog.locator('.search-result').first();
      }
      await item.waitFor({state:'visible'});
      await page.evaluate(()=>document.fonts.ready);
      await item.scrollIntoViewIfNeeded();
      await page.mouse.move(0,0);
      const idle=await appearance(item),surface=await dialog.evaluate(node=>getComputedStyle(node).backgroundColor);
      await item.hover();
      const hover=await appearance(item);
      assert.notEqual(hover.background,idle.background,'Hover must visibly fill the action');
      assert.ok(contrast(hover.background,surface)>=1.2,'Hover fill must not disappear into the dialog');
      assert.ok(contrast(hover.border,hover.background)>=3,'Hover border must remain distinct against its fill');
      assert.ok(contrast(hover.border,surface)>=3,'Hover border must remain distinct against its surroundings');
      assert.ok(contrast(hover.color,hover.background)>=4.5,'Hover action text needs readable contrast');
      if(hover.meta)assert.ok(contrast(hover.meta,hover.background)>=4.5,'Hover metadata must remain readable');
      if(hover.number)assert.ok(contrast(hover.number,hover.background)>=4.5,'Lecture labels must remain readable');
      assert.deepEqual(hover.bounds,idle.bounds,'Hover must not change control geometry');
      await page.screenshot({path:`artifacts/hover-review/${theme}-${width}.png`});

      await page.mouse.move(0,0);
      await item.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
      const focus=await appearance(item);
      assert.ok(focus.focused,'Keyboard users need a focus-visible state');
      assert.notEqual(focus.ring,'none','Keep the native focus ring');
      assert.equal(focus.background,hover.background,'Keyboard focus receives the same legible fill');
      assert.deepEqual(focus.bounds,idle.bounds,'Focus must not change control geometry');
      await item.evaluate(node=>node.blur());
      if(await item.evaluate(node=>node.tagName==='BUTTON')) {
        await item.evaluate(node=>node.disabled=true);
        const bounds=await item.boundingBox();
        await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
        const disabled=await appearance(item);
        assert.equal(disabled.background,idle.background,'Disabled controls must not acquire hover highlighting');
      }
      record('Ghost actions have distinct hover/focus surfaces, readable labels and stable geometry',{
        theme,width,fillContrast:Number(contrast(hover.background,surface).toFixed(2)),
        borderContrast:Number(contrast(hover.border,hover.background).toFixed(2)),
        metadataContrast:hover.meta?Number(contrast(hover.meta,hover.background).toFixed(2)):null,
      });
    } finally {await context.close();}
  }
}
