// ECSE 2110 corpus checks, separate from upstream electromagnetics scenarios.
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {loadContent} from '../content/papers.server.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const {course, exams}=loadContent();
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const cases=[];
await mkdir('artifacts/course-review',{recursive:true});
try {
  for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,1440]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const exam of exams)for(const question of exam.problems) {
      await page.goto(`${base}/problems/${question.id}/`);
      await page.waitForSelector('main[data-study-ready=true]');
      assert.equal(await page.locator('.part-trigger').count(),question.parts.length);
      assert.equal(await page.locator('html').getAttribute('lang'),locale==='zh'?'zh-CN':'en');
      assert.equal(await page.locator('.part-trigger[aria-expanded=true]').count(),0);
      assert.equal(await page.locator('.study-figure:visible').count(),(question.figure?1:0)+question.parts.filter(p=>p.questionFigure).length,`${question.id}: no invented or leaked solution diagram in the prompt`);
      await page.locator('.solution-section-heading button').click();
      assert.equal(await page.locator('.part-trigger[aria-expanded=true]').count(),question.parts.length);
      assert.equal(await page.locator('.katex-error').count(),0);
      for(const image of await page.locator('.study-figure img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(image=>image.decode());
        const source=await image.getAttribute('src');
        assert.ok(source.startsWith(`/papers/${locale==='zh'?'zh-cn':'en'}/`),source);
        assert.equal(source.includes('-dark.svg'),theme==='dark');
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${question.id}: page-wide overflow at ${width}`);
      if(question.id==='e2-u00-q3') {
        await page.locator('#problem-title').scrollIntoViewIfNeeded();
        await page.screenshot({path:`artifacts/course-review/reconstructed-${locale}-${theme}-${width}.png`,fullPage:true});
      }
      cases.push({id:question.id,locale,theme,width,parts:question.parts.length});
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  // Independently ensure the reconstructed download is the clean file and the
  // solution action never describes our independent PDF as an official key.
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,locale:'en'})),course.storageKey);
  const page=await context.newPage();
  await page.goto(`${base}/problems/e2-u00-q3/`);await page.waitForSelector('main[data-study-ready=true]');
  await page.locator('.solution-section-heading button').click();
  assert.equal(await page.getByRole('button',{name:/Official solution/}).count(),0);
  await page.getByRole('button',{name:'Part a: Solution source',exact:true}).click();
  const download=page.locator('.source-dialog a[download]');
  assert.ok((await download.getAttribute('href')).includes('/exam2_u00/sources/e2-u00-sol.pdf'));
  const response=await page.request.get(`${base}/papers/en/exam2_u00/sources/e2-u00.pdf`);
  assert.equal(response.status(),200);
  assert.ok((await response.body()).subarray(0,5).equals(Buffer.from('%PDF-')));
  await context.close();
  const references=await browser.newContext({viewport:{width:1440,height:900}});
  await references.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,locale:'en'})),course.storageKey);
  const referencePage=await references.newPage();
  for(const [id,number,count] of [['e1-f26-q4',1,9],['e2-u00-q3',2,13],['p1-f26-q1',1,9],['p2-f26-q1',2,13]]) {
    await referencePage.goto(`${base}/problems/${id}/`);await referencePage.waitForSelector('main[data-study-ready=true]');
    await referencePage.locator('#reference-sidebar').getByRole('button',{name:'Browse the full crib sheet',exact:true}).click();
    const library=referencePage.locator('.library-dialog');
    assert.equal(await library.locator('.library-formula').count(),count);
    const hrefs=await library.locator('.formula-link').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
    assert.ok(hrefs.every(href=>href.startsWith(`/sources/reference-exam${number}.pdf#page=`)));
    await library.getByRole('button',{name:'All 2 pages',exact:true}).click();
    assert.equal(await referencePage.locator('.source-dialog a[download]').getAttribute('href'),`/sources/reference-exam${number}.pdf`);
    await referencePage.keyboard.press('Escape');await referencePage.keyboard.press('Escape');
  }
  await referencePage.goto(`${base}/problems/e1-f26-q4/`);await referencePage.waitForSelector('main[data-study-ready=true]');
  assert.equal(await referencePage.locator('main .study-figure').count(),0);
  await referencePage.locator('.solution-section-heading button').click();
  await referencePage.getByRole('button',{name:'Part a: View original question',exact:true}).click();
  assert.ok((await referencePage.locator('.source-paper img').getAttribute('src')).includes('/pages/e1-f26-sol/9.webp'));
  assert.ok((await referencePage.locator('.source-dialog a[download]').getAttribute('href')).endsWith('/sources/e1-f26-sol.pdf'));
  await references.close();
  console.log(`PASS ${cases.length} corpus cases: all discovered questions/parts, both languages/themes, desktop/phone, authentic prompt-only figures and clean source downloads.`);
} finally {
  await writeFile('artifacts/course-review/report.json',JSON.stringify({cases},null,2));
  await browser.close();
}
