import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadContent} from '../content/papers.server.ts';

/** Observe every rendered frame, including papers opened manually after hydration. */
export async function checkNavigationStability(browser,base,record) {
  const {course,exams}=loadContent();
  const exam=exams.filter(exam=>exam.problems.length>=2).toSorted((a,b)=>(b.year??0)-(a.year??0))[0];
  if(!exam){record('Navigation stability requires two questions in one paper; skipped for this corpus');return;}
  const [first,second]=exam.problems;
  const output=process.env.QA_NAVIGATION_ARTIFACTS??'artifacts/navigation-stability';
  await mkdir(output,{recursive:true});
  const results=[];
  for(const height of [640,1234])for(const theme of ['light','dark'])for(const reducedMotion of ['no-preference','reduce'])for(const fallback of [false,true]) {
    const width=height===640?1440:2000;
    const context=await browser.newContext({viewport:{width,height},reducedMotion,colorScheme:theme});
    await context.addInitScript(({key,theme,fallback})=>{
      localStorage.setItem(key,JSON.stringify({version:1,locale:'zh',theme}));
      if(fallback)Object.defineProperty(Element.prototype,'moveBefore',{value:undefined,configurable:true});
    },{key:course.storageKey,theme,fallback});
    const page=await context.newPage(),failures=[];
    page.on('pageerror',error=>failures.push(error.message));
    try {
      await page.goto(`${base}/problems/${first.id}/`,{waitUntil:'domcontentloaded'});
      await page.waitForSelector('[data-study-ready=true]');await page.evaluate(()=>document.fonts.ready);
      const root=page.locator('#exam-navigation'),nav=root.locator('.nav-body');
      const maximum=await nav.evaluate(node=>node.scrollHeight-node.clientHeight);
      if(height===640)assert.ok(maximum>0,'The short viewport must exercise genuinely scrollable navigation');
      await nav.evaluate(node=>node.scrollTop=Math.min(40,node.scrollHeight-node.clientHeight));
      await page.evaluate(()=>{window.__stableNav=document.querySelector('#exam-navigation .nav-body');});
      const ready=async id=>{
        await page.waitForFunction(id=>document.querySelector('main[data-study-ready=true]')?.getAttribute('data-problem')===id,id);
        await page.waitForTimeout(250);
        assert.equal(new URL(page.url()).pathname,`/problems/${id}/`);
        assert.equal(await root.locator('[aria-current=page]').getAttribute('href'),`/problems/${id}/`);
      };
      async function watch(action,id,{pressed=false,history=false}={}) {
        const target=root.locator(`a.question-link[href="/problems/${id}/"]`);
        // Playwright can scroll a partially clipped link into view. Do so before
        // measuring, just as a user would finish scrolling before clicking it.
        if(!history)await target.hover();
        const before=await nav.evaluate(node=>{
          const top=node.getBoundingClientRect().y;
          return {scroll:node.scrollTop,rows:[...node.querySelectorAll('.question-link')].filter(link=>link.getClientRects().length).map(link=>({id:link.getAttribute('href'),y:link.getBoundingClientRect().y-top,height:link.getBoundingClientRect().height})),contents:[...node.querySelectorAll('[data-slot=accordion-content][data-state=open]')].map(el=>el.getBoundingClientRect().height)};
        });
        await page.evaluate(()=>{
          window.__navFrames=[];window.__navRecording=true;
          const frame=()=>{
            if(!window.__navRecording)return;
            const node=document.querySelector('#exam-navigation .nav-body'),top=node.getBoundingClientRect().y;
            window.__navFrames.push({sameNode:node===window.__stableNav,scroll:node.scrollTop,top,windowScroll:scrollY,rows:[...node.querySelectorAll('.question-link')].filter(link=>link.getClientRects().length).map(link=>({id:link.getAttribute('href'),y:link.getBoundingClientRect().y-top,height:link.getBoundingClientRect().height})),contents:[...node.querySelectorAll('[data-slot=accordion-content][data-state=open]')].map(el=>el.getBoundingClientRect().height)});
            requestAnimationFrame(frame);
          };frame();
        });
        if(pressed) {
          const box=await target.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
          await page.mouse.down();await page.waitForTimeout(180);
          const down=await target.boundingBox();
          assert.ok(Math.abs(down.y-box.y)<.5,'Navigation links must not shift down on mouse press');
          await page.mouse.up();
        } else await action();
        await ready(id);
        const frames=await page.evaluate(()=>{window.__navRecording=false;return window.__navFrames;});
        for(const frame of frames) {
          assert.ok(frame.sameNode,'Navigation must retain its DOM identity');
          assert.ok(Math.abs(frame.scroll-before.scroll)<.5,`${id}: sidebar scroll must not reset on any rendered navigation frame`);
          assert.deepEqual(frame.rows.map(row=>row.id),before.rows.map(row=>row.id));
          assert.equal(frame.contents.length,before.contents.length);
          for(let i=0;i<frame.contents.length;i++)assert.ok(Math.abs(frame.contents[i]-before.contents[i])<.5,`${id}: an already expanded paper must not replay its height animation`);
          for(let i=0;i<frame.rows.length;i++) {
            assert.ok(Math.abs(frame.rows[i].y-before.rows[i].y)<.5,`${id}: question rows must not jump within the sidebar`);
            assert.ok(Math.abs(frame.rows[i].height-before.rows[i].height)<.5,'Question row heights must remain stable');
          }
        }
        return {id,frames:frames.length,scroll:before.scroll};
      }
      const navigations=[];
      const click=id=>()=>root.locator(`a.question-link[href="/problems/${id}/"]`).click();
      navigations.push(await watch(()=>{},second.id,{pressed:true}));
      await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
      navigations.push(await watch(click(first.id),first.id));
      navigations.push(await watch(()=>page.goBack(),second.id,{history:true}));
      navigations.push(await watch(()=>page.goForward(),first.id,{history:true}));
      async function checkPaper(paper) {
        const trigger=root.locator(`[data-exam="${paper.id}"] .exam-trigger`);
        const path=new URL(page.url()).pathname;
        if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();
        await page.waitForTimeout(250);
        assert.equal(new URL(page.url()).pathname,path,'Opening a paper must not navigate');
        await nav.evaluate(node=>node.scrollTop=Math.min(40,node.scrollHeight-node.clientHeight));
        const [a,b]=paper.problems;
        navigations.push(await watch(click(a.id),a.id));
        if(b) {
          navigations.push(await watch(click(b.id),b.id));
          navigations.push(await watch(()=>page.goBack(),a.id,{history:true}));
          navigations.push(await watch(()=>page.goForward(),b.id,{history:true}));
        }
      }
      for(const paper of exams.filter(paper=>paper.number===exam.number&&paper.id!==exam.id))await checkPaper(paper);
      const groups=[...new Set(exams.map(paper=>paper.number))].filter(number=>number!==exam.number);
      for(const number of groups) {
        const paper=exams.filter(paper=>paper.number===number).at(-1);
        await root.getByRole('tab',{name:`Exam ${number}`,exact:true}).click();await ready(paper.problems[0].id);
        assert.equal(await root.locator(`[data-exam="${paper.id}"] .exam-trigger`).getAttribute('aria-expanded'),'true');
        // Different groups replace the directory: do not reuse the old group's offset.
        assert.equal(await nav.evaluate(node=>node.scrollTop),0);
        for(const next of exams.filter(paper=>paper.number===number))await checkPaper(next);
      }
      if(groups.length) {
        const paper=exams.filter(paper=>paper.number===exam.number).at(-1);
        await root.getByRole('tab',{name:`Exam ${exam.number}`,exact:true}).click();await ready(paper.problems[0].id);
        await checkPaper(exam);
      }
      assert.deepEqual(failures,[]);
      const key=`${width}-${height}-${theme}-${reducedMotion}-${fallback?'fallback':'atomic'}`;
      await page.screenshot({path:`${output}/${key}.png`});
      results.push({width,height,theme,reducedMotion,fallback,navigations});
      record('Initial and manually opened papers stay stable across cross-paper clicks, subsequent questions, history and exam groups',{width,height,theme,reducedMotion,fallback,navigations:navigations.length});
    } finally {await context.close();}
  }
  const mobileResults=await checkCompactNavigation(browser,base,record,output);
  await writeFile(`${output}/report.json`,JSON.stringify({passed:true,results,mobileResults},null,2));
}

export async function checkCompactNavigation(browser,base,record,output=process.env.QA_NAVIGATION_ARTIFACTS??'artifacts/navigation-stability') {
  const {course,exams}=loadContent(),exam=exams.find(paper=>paper.problems.length>=2);
  if(!exam)return [];
  const [first]=exam.problems,mobileResults=[];
  await mkdir(output,{recursive:true});
  for(const width of [375,390]) {
    const locale=width===375?'zh':'en',theme=width===375?'light':'dark';
    const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:width===375?'no-preference':'reduce'});
    await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,sidebars:{navigation:false,references:false}})),{key:course.storageKey,locale,theme});
    const page=await context.newPage(),failures=[];page.on('pageerror',error=>failures.push(error.message));
    try {
      await page.goto(`${base}/problems/${first.id}/`);await page.waitForSelector('[data-study-ready=true]');
      const sheet=page.locator('#mobile-exam-navigation'),destinations=[];
      const ready=async id=>{
        await page.waitForFunction(id=>document.querySelector('main[data-study-ready=true]')?.dataset.problem===id,id);
        await sheet.waitFor({state:'detached'});
        assert.equal(new URL(page.url()).pathname,`/problems/${id}/`);destinations.push(id);
      };
      const open=async()=>{await page.locator('[data-sidebar-toggle=navigation]').tap();await sheet.waitFor({state:'visible'});};
      const choose=async(paper,id)=>{
        await open();const trigger=sheet.locator(`[data-exam="${paper.id}"] .exam-trigger`);
        if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.tap();
        assert.equal(await sheet.locator('[data-slot=accordion-content][data-state=open]').evaluate(node=>getComputedStyle(node).animationName),'none');
        await sheet.locator(`a.question-link[href="/problems/${id}/"]`).tap();await ready(id);
      };
      const other=exams.find(paper=>paper.number===exam.number&&paper.id!==exam.id)??exam;
      for(const problem of other.problems.slice(0,2))await choose(other,problem.id);
      const group=exams.find(paper=>paper.number!==exam.number);
      if(group) {
        const firstPaper=exams.filter(paper=>paper.number===group.number).at(-1);
        await open();await sheet.getByRole('tab',{name:`Exam ${group.number}`,exact:true}).tap();await ready(firstPaper.problems[0].id);
        for(const problem of group.problems.slice(0,2))await choose(group,problem.id);
      }
      if(destinations.length>=2) {
        const previous=destinations.at(-2),current=destinations.at(-1);
        await page.goBack();await ready(previous);await page.goForward();await ready(current);
      }
      const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),course.storageKey);
      assert.deepEqual(stored.sidebars,{navigation:false,references:false},'Phone Sheets must not change desktop sidebar preferences');
      assert.deepEqual(failures,[]);
      await page.screenshot({path:`${output}/phone-${width}-${locale}-${theme}.png`});
      mobileResults.push({width,locale,theme,destinations});
      record('Phone Sheets support cross-paper and exam-group navigation, subsequent questions and history without changing desktop preferences',{width,locale,theme,destinations:destinations.length});
    } finally {await context.close();}
  }
  return mobileResults;
}
