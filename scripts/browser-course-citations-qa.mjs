// Audit all authored inline source links in the rendered question library.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams,documentsByLocale} from '../content/catalog.server.ts';
import {parseText,pageReference} from '../content/text.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173',output='artifacts/course-citations';
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const checks=[],verifiedAssets=new Set();
await mkdir(output,{recursive:true});
function citations(body,documents){
  const found=[];
  function visit(node){const ref=pageReference(node,documents);if(ref)found.push({...ref,href:`${documents[ref.doc].pageBase}/${ref.page}.webp`});if('children'in node)node.children.forEach(visit);}
  if(body)visit(parseText(body));return found;
}
try{
  for(const locale of ['en','zh'])for(const width of [390,1440]){
    const theme=width===390?'dark':'light';
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    try{
      await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
      const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);
      page.on('pageerror',error=>errors.push(error.message));
      for(const question of exams.flatMap(exam=>exam.problems)){
        await page.goto(`${base}/problems/${question.id}/`);await page.waitForSelector('[data-study-ready=true]');
        await page.locator('[data-solution-toggle]').click();
        await page.waitForFunction(count=>document.querySelectorAll('.part-trigger[aria-expanded=true]').length===count,question.parts.length);
        const bodies=[...question.parts.flatMap(part=>[part.solution[locale],part.note?.[locale]]),question.note?.[locale]];
        const expected=bodies.flatMap(body=>citations(body,documentsByLocale[locale]));
        const links=page.locator('main [data-page-source-link]');
        assert.deepEqual(await links.evaluateAll(nodes=>nodes.map(node=>({doc:node.dataset.pageSourceLink,page:Number(node.dataset.sourcePage),href:node.getAttribute('href')}))),expected,`${question.id}/${locale}: solutions and notes must use native source links in authored order`);
        for(const ref of expected)if(!verifiedAssets.has(ref.href)){
          const response=await page.request.head(`${base}${ref.href}`);
          assert.equal(response.status(),200,ref.href);assert.match(response.headers()['content-type'],/^image\//);verifiedAssets.add(ref.href);
        }
        const chosen=new Set();
        for(const selector of ['.solution-body','.solution-note','.problem-model-note']){
          const index=await links.evaluateAll((nodes,selector)=>nodes.findIndex(node=>node.closest(selector)),selector);
          if(index>=0)chosen.add(index);
        }
        // The reported 5–6 range must expose two independently accessible pages.
        if(question.id==='e2-s25-q5'){chosen.add(0);chosen.add(1);}
        let opened=0;
        for(const index of chosen){
          const link=links.nth(index),ref=expected[index];await link.focus();
          if(width===1440){await link.hover();const preview=page.locator('[data-slot=hover-card-content]:visible');await preview.waitFor();assert.equal(await preview.locator('img').getAttribute('src'),ref.href);}
          await page.keyboard.press('Enter');const dialog=page.locator('.source-dialog');await dialog.waitFor();
          assert.equal(await dialog.locator('#source-page').inputValue(),String(ref.page));
          assert.equal(await dialog.locator('.source-paper img').getAttribute('src'),ref.href);
          await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
          assert(await link.evaluate(node=>node===document.activeElement),'Closing a citation must return focus to the inline link');opened++;
          assert.equal(new URL(page.url()).pathname,`/problems/${question.id}/`,'Do not navigate away to a raw page image');
        }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        if(question.id==='e2-s25-q5'){
          if(locale==='zh'&&fontCSS){await page.addStyleTag({content:fontCSS});await page.evaluate(()=>document.fonts.ready);}
          await page.locator('[data-part=e2-s25-q5-a]').scrollIntoViewIfNeeded();
          await page.screenshot({path:`${output}/winding-${locale}-${width}.png`});
        }
        checks.push({question:question.id,locale,width,theme,links:expected.length,opened});
      }
      assert.deepEqual(errors,[]);console.log('PASS complete course citation rendering, source viewers and focus',locale,width);
    }finally{await context.close();}
  }
  if(exams.some(exam=>exam.problems.some(question=>question.id==='e2-s25-q5'))){
    const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    try{
      const page=await context.newPage();await page.goto(`${base}/problems/e2-s25-q5/`);
      const hrefs=await page.locator('[data-part=e2-s25-q5-a] [data-page-source-link]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
      assert.deepEqual(hrefs,['/pages/lecture-09/5.webp','/pages/lecture-09/6.webp']);
      checks.push({noJavaScript:true,rangePages:hrefs});
    }finally{await context.close();}
  }
  console.log(`PASS ${checks.filter(check=>check.question).length} localized/viewport article audits, ${verifiedAssets.size} published source images`);
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify({checks,sourceImages:[...verifiedAssets]},null,2)+'\n');
  await browser.close();
}
