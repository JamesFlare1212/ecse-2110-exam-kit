// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs bun scripts/browser-compact-bridge-qa.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const output=process.env.QA_COMPACT_BRIDGE_ARTIFACTS??'artifacts/compact-bridge-browser';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
await mkdir(output,{recursive:true});
try {
  for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [1440,375,320]) {
    const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
    await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      await page.goto(`${base}/problems/p2-f26-q4/`,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-study-ready=true]');await page.evaluate(()=>document.fonts.ready);
      const figure=page.locator('figure[data-figure=p2-f26-q4]'),image=figure.locator('.figure-canvas img');
      await image.evaluate(image=>image.decode());
      assert.equal(await figure.locator('.figure-source').count(),0);
      assert.ok(await figure.locator('[data-figure-source]').evaluate(node=>Boolean(node.closest('.figure-version-track'))));
      await figure.scrollIntoViewIfNeeded();
      const metrics=await image.evaluate(async image=>{
        const box=image.getBoundingClientRect();
        const svg=new DOMParser().parseFromString(await (await fetch(image.src)).text(),'image/svg+xml');
        const viewBox=svg.documentElement.getAttribute('viewBox').split(' ').map(Number);
        const labels=[...svg.querySelectorAll('tspan')].filter(node=>/^[SDRLiv+−]$/.test(node.textContent));
        const sizes=labels.map(node=>Number(/font-size:\s*([\d.]+)px/.exec(node.getAttribute('style'))[1]));
        return {width:box.width,height:box.height,labels:sizes.map(size=>size*box.width/viewBox[2]),text:[...svg.querySelectorAll('text')].map(node=>node.textContent).join(' '),source:image.getAttribute('src'),bodyFont:parseFloat(getComputedStyle(document.querySelector('.original-statement')).fontSize)};
      });
      assert.ok(metrics.width<=380&&metrics.height<=310,'Compact dimensions must come from the actual SVG, not a clipped image');
      assert.equal(metrics.labels.length,12);
      assert.ok(Math.min(...metrics.labels)>=metrics.bodyFont*.75,'Main labels must remain near body text size even at 320 px');
      assert.ok(Math.max(...metrics.labels)<=metrics.bodyFont*1.2);
      assert.ok(metrics.source.includes(`/papers/${locale==='zh'?'zh-cn':'en'}/practice2_f26/figures/`));
      assert.equal(metrics.source.includes('-dark.svg'),theme==='dark');
      assert.ok(metrics.text.includes(locale==='zh'?'图 P10.4':'FIGURE P10.4'));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await figure.screenshot({path:`${output}/${locale}-${theme}-${width}.png`});
      const height=await figure.evaluate(node=>node.getBoundingClientRect().height);
      await figure.getByRole('radio',{name:locale==='zh'?'原始插图':'Original',exact:true}).click();
      await image.evaluate(image=>image.decode());
      assert.ok((await image.getAttribute('src')).includes('/original-figures/p2-f26-q4.webp'));
      assert.ok(Math.abs(await figure.evaluate(node=>node.getBoundingClientRect().height)-height)<1,'Original switch keeps the same card height');
      await figure.getByRole('radio',{name:locale==='zh'?'矢量复刻':'Recreated SVG',exact:true}).click();
      await image.evaluate(image=>image.decode());
      await figure.getByRole('button',{name:locale==='zh'?'放大图示':'Enlarge figure',exact:true}).click();
      const dialog=page.locator('.figure-dialog');await dialog.waitFor();
      await dialog.locator('img').evaluate(image=>image.decode());
      await dialog.getByRole('button',{name:locale==='zh'?'适应宽度':'Fit width',exact:true}).click();
      assert.ok(await dialog.locator('.figure-enlarged').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
      await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
      await figure.getByRole('button',{name:locale==='zh'?/在原始试卷中定位/:/Locate in the source exam/}).click();
      const source=page.locator('.source-dialog');await source.waitFor();
      await source.locator('.source-paper img').evaluate(image=>image.decode());
      assert.ok((await source.locator('.source-paper img').getAttribute('src')).includes('/pages/p2-f26-sol/5.webp'));
      await page.keyboard.press('Escape');await source.waitFor({state:'detached'});
      assert.ok(await figure.locator('[data-figure-source]').evaluate(node=>node===document.activeElement));
      assert.deepEqual(errors,[]);
      results.push({locale,theme,width,...metrics});
      console.log('PASS compact bridge, body-sized labels, original switch, enlargement and source link',locale,theme,width);
    } finally {await context.close();}
  }
} finally {
  await writeFile(`${output}/report.json`,JSON.stringify({results},null,2));
  await browser.close();
}
