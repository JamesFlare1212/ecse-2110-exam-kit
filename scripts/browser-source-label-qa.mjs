// Optional QA against a built preview; install Playwright separately.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const output='artifacts/source-labels';
const results=[];
await mkdir(output,{recursive:true});
try {
  for(const theme of ['light','dark'])for(const locale of ['zh','en'])for(const width of [320,390,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});
    await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try {
      for(const [problem,exam] of [['e1-f26-q5',1],['e2-u00-q2',2]]) {
        await page.goto(`${base}/problems/${problem}/`,{waitUntil:'domcontentloaded'});
        await page.waitForSelector('[data-study-ready=true]');await page.evaluate(()=>document.fonts.ready);
        await page.locator('.solution-section-heading button').click();
        const link=page.locator('.formula-link-inline:visible').first();
        await link.hover();
        const preview=page.locator('[data-slot=hover-card-content]:visible');
        await preview.waitFor();
        const meta=preview.locator('.formula-source-meta');
        const expected=`Exam ${exam} ${locale==='zh'?'公式表':'sheet'}`;
        assert.equal(await meta.locator('.formula-source-name').innerText(),expected);
        const text=await meta.locator('.formula-source-page').innerText();
        assert.match(text,/^p\.\d+$/);
        const metrics=await meta.evaluate(node=>{
          const name=node.querySelector('.formula-source-name'),page=node.querySelector('.formula-source-page');
          const a=name.getBoundingClientRect(),b=page.getBoundingClientRect(),box=node.getBoundingClientRect();
          return {height:box.height,line:parseFloat(getComputedStyle(node).lineHeight),sameLine:Math.abs(a.top-b.top)<1,
            pageHeight:b.height,pageLine:parseFloat(getComputedStyle(page).lineHeight),fullTitle:name.getAttribute('aria-label')};
        });
        assert.ok(metrics.sameLine&&metrics.height<=metrics.line+1,'Configured compact names fit one metadata row');
        assert.ok(metrics.pageHeight<=metrics.pageLine+1,'A page number must never split its digits onto another line');
        assert.ok(metrics.fullTitle.includes(`Exam ${exam}`)&&metrics.fullTitle.includes('2026'),'Full source provenance is retained');
        if(width===1440) {
          const rail=page.locator('.reference-rail .formula-source-meta:visible').first();
          assert.equal(await rail.locator('.formula-source-name').innerText(),expected);
        }
        await preview.screenshot({path:`${output}/exam${exam}-${theme}-${locale}-${width}.png`});
        await preview.getByRole('button',{name:locale==='zh'?'打开原页并定位':'Locate on original page',exact:true}).click();
        const dialog=page.locator('.source-dialog');await dialog.waitFor();
        assert.ok((await dialog.innerText()).includes(metrics.fullTitle),'Keyboard/touch source viewer exposes the full document title');
        await page.waitForFunction(()=>{const image=document.querySelector('.source-paper img');return image?.complete&&image.naturalWidth>0;});
        assert.ok((await dialog.locator('.source-paper img').getAttribute('src')).includes(`/reference-exam${exam}/`));
        assert.equal(await dialog.locator('#source-page').inputValue(),text.slice(2));
        assert.equal(await dialog.locator('[data-source-highlight]').count(),1);
        await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
        await link.hover();await preview.waitFor();
        await meta.locator('.formula-source-name').evaluate(node=>node.textContent='AnUnexpectedlyLongUnbrokenDocumentTitle'.repeat(4));
        assert.ok(await preview.evaluate(node=>node.scrollWidth<=node.clientWidth+1),'Long fallback source titles wrap without overflowing the card');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        results.push({problem,exam,theme,locale,width,label:expected});
        console.log('PASS compact localized source, intact page number, full-title viewer and original citation',JSON.stringify(results.at(-1)));
      }
      assert.deepEqual(errors,[]);
    } finally {await context.close();}
  }
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results},null,2));
} finally {await browser.close();}
