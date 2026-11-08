// Review regressions: modal return paths, real-surface text contrast, and narrow source reading.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {course} from '../content/course.ts';

async function context(browser,theme,width) {
  const ctx=await browser.newContext({viewport:{width,height:width<500?844:900},reducedMotion:'reduce',colorScheme:theme});
  await ctx.addInitScript(({key,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale:'zh',theme})),{key:course.storageKey,theme});
  return ctx;
}
async function ready(page,base,id) {
  await page.goto(`${base}/problems/${id}/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-study-ready=true]');await page.evaluate(()=>document.fonts.ready);
}
async function closeLibrary(page,method) {
  if(method==='escape')await page.keyboard.press('Escape');
  else await page.locator('.library-dialog').getByRole('button',{name:'关闭',exact:true}).click();
  await page.locator('.library-dialog').waitFor({state:'detached'});
}
export async function checkStudyUX(browser,base,problemId,record) {
  const output=process.env.QA_UX_ARTIFACTS??'artifacts/study-ux-review';
  await mkdir(output,{recursive:true});
  for(const theme of ['light','dark']) {
    for(const width of [320,390,768]) {
      const ctx=await context(browser,theme,width),page=await ctx.newPage();
      try {
        await ready(page,base,problemId);
        for(const origin of ['navigation','references'])for(const method of ['escape','button']) {
          await page.locator(`[data-sidebar-toggle=${origin}]`).click();
          if(origin==='navigation') {
            await page.locator('#mobile-exam-navigation').getByRole('button',{name:/课程讲义/}).click();
          } else {
            await page.locator('#mobile-reference-sidebar').getByRole('button',{name:'浏览完整公式表',exact:true}).click();
          }
          await page.locator('.library-dialog').waitFor();
          await closeLibrary(page,method);
          await page.waitForFunction(origin=>document.activeElement?.getAttribute('data-sidebar-toggle')===origin,origin);
          if(method==='escape')await page.screenshot({path:`${output}/return-${origin}-${theme}-${width}.png`});
          await page.keyboard.press('Tab');
          assert.ok(await page.evaluate(()=>document.activeElement!==document.body&&!document.activeElement?.matches('.skip-link')),'Tab must continue from the related toolbar control');
        }
        record('Sheet-to-library closing returns focus to its visible origin, not body',{theme,width,paths:4});
        await page.screenshot({path:`${output}/focus-${theme}-${width}.png`});

        if(width<500) {
          for(const kind of ['question','formula']) {
            if(kind==='formula') {
              await page.locator('[data-sidebar-toggle=references]').click();
              const link=page.locator('#mobile-reference-sidebar .formula-link').first();
              if(!await link.count()){await page.keyboard.press('Escape');continue;}
              await link.click();
            } else await page.locator('.figure-source button').first().click();
            await page.locator('.source-dialog').waitFor();
            await page.waitForFunction(()=>{const image=document.querySelector('.source-paper img');return image?.complete&&image.naturalWidth>0;});
            const zoomIn=page.locator('.source-dialog').getByRole('button',{name:'放大',exact:true});
            let presses=0;
            while(!await zoomIn.isDisabled()&&presses<35){await zoomIn.click();presses++;}
            const metrics=await page.evaluate(()=>({
              paperWidth:document.querySelector('.source-paper').getBoundingClientRect().width,
              naturalWidth:document.querySelector('.source-paper img').naturalWidth,
              zoom:Number(document.querySelector('.zoom-label').textContent.replace('%','')),
              pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,
            }));
            assert.ok(metrics.zoom>200,'Narrow viewers must not stop at the former 200% limit');
            assert.ok(metrics.paperWidth>=Math.max(1100,metrics.naturalWidth),'Maximum zoom must expose the delivered source image at readable native size');
            assert.ok(metrics.pageWidth<=metrics.viewport+1,'Source zoom stays local to the reading area');
            const stage=page.locator('.source-stage');await stage.focus();
            const before=await stage.evaluate(node=>node.scrollLeft);
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(before=>document.querySelector('.source-stage').scrollLeft>before,before);
            await page.screenshot({path:`${output}/${kind}-${theme}-${width}-zoom.png`});
            await page.locator('.zoom-label').click();
            await page.waitForFunction(()=>document.querySelector('.zoom-label')?.textContent==='100%');
            const heights=await page.locator('.source-page-controls button,.source-page-controls input,.source-zoom-controls button').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
            assert.ok(heights.every(height=>Math.abs(height-36)<.6),'Pagination and zoom controls remain native 36px controls');
            await page.keyboard.press('Escape');await page.locator('.source-dialog').waitFor({state:'detached'});
            record('Narrow source readers reach native detail, pan by keyboard and reset to page-fit',{theme,width,kind,...metrics});
          }
        }
      } finally {await ctx.close();}
    }
    const ctx=await context(browser,theme,1440),page=await ctx.newPage();
    try {
      await ready(page,base,problemId);
      const trigger=page.locator('#exam-navigation').getByRole('button',{name:/课程讲义/});
      await trigger.click();await page.locator('.library-dialog').waitFor();
      if(course.resources.lectures.length) {
        const lecture=page.locator('.library-lecture').first();await lecture.click();
        await page.locator('.source-dialog').waitFor();await page.keyboard.press('Escape');
        await page.locator('.source-dialog').waitFor({state:'detached'});
        await page.waitForFunction(()=>document.activeElement?.matches('.library-lecture'));
      }
      await closeLibrary(page,'escape');
      assert.ok(await trigger.evaluate(node=>document.activeElement===node),'Desktop library closes back to the actual trigger');
      const ratios=await page.evaluate(()=>{
        const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=1;
        function rgba(value){ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);}
        function composite(front,back){return [...front.slice(0,3).map((value,i)=>value*front[3]+back[i]*(1-front[3])),1];}
        function lum(color){return color.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
        return [...document.querySelectorAll('.question-link-title small,[role=tab][aria-selected=false],.reference-page,.source-guide [data-slot=card-description]')].filter(node=>node.getClientRects().length).map(node=>{
          const ancestry=[];for(let p=node;p;p=p.parentElement)ancestry.unshift(p);
          let background=[255,255,255,1];for(const parent of ancestry)background=composite(rgba(getComputedStyle(parent).backgroundColor),background);
          const style=getComputedStyle(node),front=rgba(style.color);front[3]*=Number(style.opacity);
          const a=lum(composite(front,background)),b=lum(background);
          return {text:node.textContent.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
        });
      });
      assert.ok(ratios.length>0);
      for(const result of ratios)assert.ok(result.ratio>=4.5,`${theme}: ${result.text} contrast ${result.ratio}`);
      record('Default navigation, inactive tabs and source labels retain AA text contrast on their real surfaces',{theme,minContrast:Number(Math.min(...ratios.map(item=>item.ratio)).toFixed(2)),samples:ratios.length});
    } finally {await ctx.close();}
  }
}
