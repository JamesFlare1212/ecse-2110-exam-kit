// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs bun scripts/browser-breadcrumb-qa.mjs
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadContent} from '../content/papers.server.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const {course,exams}=loadContent();
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const output=process.env.QA_BREADCRUMB_ARTIFACTS??'artifacts/breadcrumb-review';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const paper=exams.find(exam=>exam.kind==='practice'&&exam.number===2)??exams.find(exam=>exam.problems.length>1);
const other=exams.find(exam=>exam.number===paper.number&&exam.id!==paper.id);
const home=exams.flatMap(exam=>exam.problems).find(problem=>problem.id===course.defaultProblemId)??exams[0].problems[0];
const label=(exam,locale)=>[exam.term[locale],exam.year].filter(value=>value!==null).join(' ');
const results=[];
await mkdir(output,{recursive:true});
try {
  for(const locale of ['zh','en'])for(const theme of ['light','dark'])for(const width of [1440,375]) {
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,reducedMotion:theme==='dark'?'reduce':'no-preference'});
    await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,sidebars:{navigation:false,references:false}})),{key:course.storageKey,locale,theme});
    const page=await context.newPage(),errors=[],layouts=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    const crumb=page.locator('.study-breadcrumb');
    const menu=page.locator('[data-slot=dropdown-menu-content][data-state=open]');
    const pathTrigger=crumb.locator('[data-breadcrumb-menu=path]');
    const section=kind=>menu.locator(`[data-breadcrumb-section=${kind}]`);
    const ready=async id=>{
      try{await page.waitForFunction(id=>document.querySelector('main[data-study-ready=true]')?.dataset.problem===id,id);}
      catch(error){throw new Error(`Expected ready ${id}; URL ${page.url()}; DOM ${await page.locator('main').getAttribute('data-problem')}`,{cause:error});}
      assert.equal(new URL(page.url()).pathname,`/problems/${id}/`);
    };
    const focused=()=>page.waitForFunction(()=>document.activeElement?.id==='problem-title');
    async function openMenu(kind,keyboard=false){
      const trigger=await pathTrigger.isVisible()?pathTrigger:crumb.locator(`[data-breadcrumb-menu=${kind}]`);
      if(keyboard){await trigger.focus();await page.keyboard.press('Enter');}else await trigger.click();
      await menu.waitFor();
      assert.equal(await menu.locator('[data-slot=dropdown-menu-group-heading]').count(),0,'Top-bar menus show choices without redundant headings');
      assert.ok(await menu.locator('[data-slot=dropdown-menu-group]').evaluateAll(groups=>groups.every(group=>Boolean(group.getAttribute('aria-label')))),'Menu groups retain accessible names without visible headings');
      return trigger;
    }
    async function layout(){
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page-wide overflow');
      const bounds=await page.locator('.topbar').evaluate(node=>{
        const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom,width:r.width,height:r.height,center:r.y+r.height/2};};
        return {viewport:innerWidth,bar:rect(node),crumb:rect(node.querySelector('.study-breadcrumb')),actions:rect(node.querySelector('.toolbar-actions')),toggle:rect(node.querySelector('[data-sidebar-toggle=navigation]')),items:[...node.querySelectorAll('[data-slot=breadcrumb-item]')].map(rect).filter(item=>item.width>0),compact:getComputedStyle(node.querySelector('.study-breadcrumb')).getPropertyValue('--collapsed-path').trim()==='1'};
      });
      assert.ok(bounds.bar.height<=70,'Top bar must never expand into a second row');
      assert.ok(Math.abs(bounds.crumb.center-bounds.actions.center)<1&&Math.abs(bounds.crumb.center-bounds.toggle.center)<1,'Navigation, path and actions stay on the same row');
      assert.ok(bounds.crumb.x>=bounds.toggle.right&&bounds.crumb.right<=bounds.actions.x,'Breadcrumb must not overlap toolbar controls');
      assert.ok(bounds.actions.right<=bounds.bar.right);
      assert.ok(bounds.items.every(item=>item.right<=bounds.crumb.right+1));
      assert.equal(bounds.compact,bounds.bar.width<=600,'Compact mode follows workspace width, not viewport width');
      if(!bounds.compact){
        const name=await crumb.locator('[data-breadcrumb-menu=questions] .truncate').boundingBox();
        assert.ok(name.width>=30,'Expanded path must retain a readable paper label');
      }
      layouts.push(bounds);
    }
    async function resize(w){await page.setViewportSize({width:w,height:900});await page.waitForTimeout(220);await layout();}
    try {
      const question=paper.problems[1]??paper.problems[0];
      await page.goto(`${base}/problems/${question.id}/`);await ready(question.id);
      await page.evaluate(()=>document.fonts.ready);
      await page.evaluate(()=>window.__breadcrumbDocument=true);
      assert.equal(await page.locator('.course-eyebrow').count(),0);
      assert.equal(await crumb.getAttribute('aria-label'),locale==='zh'?'面包屑导航':'Breadcrumb');
      if(width===1440){
        assert.deepEqual((await crumb.locator('[data-slot=breadcrumb-item]:visible').allInnerTexts()).map(text=>text.trim()),[course.code,`Exam ${paper.number}`,label(paper,locale),locale==='zh'?`第 ${question.number} 题`:`Q${question.number}`]);
      }else{
        await pathTrigger.hover();
        const tooltip=page.locator('[data-slot=tooltip-content]:visible');
        await tooltip.waitFor();
        assert.equal(await tooltip.innerText(),`${course.code} / Exam ${paper.number} / ${label(paper,locale)}`);
        await page.keyboard.press('Escape');
        assert.equal(await crumb.locator('[aria-current=page]').innerText(),`Q${question.number}`);
      }
      assert.equal(await crumb.locator('[aria-current=page]').count(),1);
      assert.equal(await crumb.locator('[data-breadcrumb-menu=course]').getAttribute('href'),`/problems/${home.id}/`);
      // Include the three annotated workspace widths and both sides of every transition.
      for(const w of width===1440?[834,879,1045,1099,1100,1101,1180,1440]:[320,375,450,451,550,600,601,800,801,375]){
        await resize(w);
        if([834,879,1045].includes(w))await page.locator('.topbar').screenshot({path:`${output}/topbar-${locale}-${theme}-${w}.png`});
      }
      await page.screenshot({path:`${output}/${locale}-${theme}-${width}.png`});
      if(width===1440){
        await page.locator('[data-sidebar-toggle=navigation]').click();
        await page.locator('[data-sidebar-toggle=references]').click();
        for(const w of [801,830,831,900,1064,1100,1110,1180,1440])await resize(w);
        await page.screenshot({path:`${output}/${locale}-${theme}-${width}-panels.png`});
        await page.locator('[data-sidebar-toggle=navigation]').click();
        await page.locator('[data-sidebar-toggle=references]').click();
        await page.waitForTimeout(220);
        // Open menus cannot stay attached to a hidden trigger after resizing.
        await openMenu('questions');await resize(550);
        await menu.waitFor({state:'detached'});
        await page.waitForFunction(()=>document.activeElement?.getAttribute('data-breadcrumb-menu')==='path');
        await openMenu('questions');await resize(1440);
        await menu.waitFor({state:'detached'});
        await page.waitForFunction(()=>document.activeElement?.getAttribute('data-breadcrumb-menu')==='questions');
        // Opening/closing the desktop sidebar also changes the container width.
        await resize(830);await openMenu('papers');
        await page.locator('[data-sidebar-toggle=navigation]').evaluate(node=>node.click());
        await page.waitForTimeout(220);await layout();
        await menu.waitFor({state:'detached'});
        await page.waitForFunction(()=>document.activeElement?.getAttribute('data-breadcrumb-menu')==='path');
        await page.locator('[data-sidebar-toggle=navigation]').click();await resize(1440);
      }
      const trigger=await openMenu('papers',true);
      assert.deepEqual(await section('papers').locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),exams.filter(exam=>exam.number===paper.number).toReversed().map(exam=>`/problems/${exam.problems[0].id}/`));
      await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});
      await page.waitForFunction(kind=>document.activeElement?.getAttribute('data-breadcrumb-menu')===kind,await trigger.getAttribute('data-breadcrumb-menu'));
      if(other){
        await openMenu('papers');await section('papers').locator(`a[href="/problems/${other.problems[0].id}/"]`).click();
        await ready(other.problems[0].id);await focused();
        assert.equal(await crumb.locator('[data-breadcrumb-menu=questions]').getAttribute('aria-label'),`${label(other,locale)} · ${locale==='zh'?'选择题目':'Choose a problem'}`);
        await page.goBack();await ready(question.id);
        assert.equal(await crumb.locator('[data-breadcrumb-menu=questions]').getAttribute('aria-label'),`${label(paper,locale)} · ${locale==='zh'?'选择题目':'Choose a problem'}`);
      }
      await openMenu('questions');
      assert.equal(await section('questions').locator('[aria-current=page]').getAttribute('href'),`/problems/${question.id}/`);
      assert.deepEqual(await section('questions').locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),paper.problems.map(q=>`/problems/${q.id}/`));
      const menuBox=await menu.boundingBox();assert.ok(menuBox.x>=0&&menuBox.x+menuBox.width<=width);
      await page.screenshot({path:`${output}/${locale}-${theme}-${width}-menu.png`});
      await section('questions').locator('a').first().focus();await page.keyboard.press('Enter');
      await ready(paper.problems[0].id);await focused();
      await page.goBack();await ready(question.id);await page.goForward();await ready(paper.problems[0].id);
      if(width===1440){
        await openMenu('questions');
        const popupPromise=context.waitForEvent('page');
        await section('questions').locator('a').nth(1).click({modifiers:['Control']});
        const popup=await popupPromise;await popup.waitForURL(`**/problems/${question.id}/`);await popup.close();
        assert.equal(new URL(page.url()).pathname,`/problems/${paper.problems[0].id}/`,'Modified clicks keep the current problem');
        await page.keyboard.press('Escape');
      }
      for(const exam of exams.filter(exam=>exam.number===paper.number)){
        await openMenu('papers');await section('papers').locator(`a[href="/problems/${exam.problems[0].id}/"]`).click();
        await ready(exam.problems[0].id);await focused();await layout();
        assert.equal(await crumb.locator('[data-breadcrumb-menu=questions]').getAttribute('aria-label'),`${label(exam,locale)} · ${locale==='zh'?'选择题目':'Choose a problem'}`,'Long and undated paper labels retain their exact metadata');
      }
      // The course crumb and compact path both expose every discovered Exam group.
      const groups=[...new Set(exams.map(exam=>exam.number))].map(number=>({number,entry:exams.filter(exam=>exam.number===number).at(-1).problems[0].id}));
      await openMenu('course',true);
      assert.deepEqual(await section('groups').locator('a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),groups.map(group=>`/problems/${group.entry}/`));
      if(!await pathTrigger.isVisible()){
        assert.equal(await menu.locator('[data-slot=dropdown-menu-group-heading],[data-slot=dropdown-menu-separator]').count(),0,'Desktop Exam selection has no redundant headings or separators');
        assert.equal(await section('course').count(),0,'Desktop Exam selection has no course-home section');
        assert.equal(await menu.getByRole('menuitem').count(),groups.length,'Desktop menu contains only Exam choices');
      }
      await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});
      for(const group of groups){
        await openMenu('course');await section('groups').locator(`a[href="/problems/${group.entry}/"]`).click();
        await ready(group.entry);await focused();await layout();
        await openMenu('course',true);
        assert.ok((await section('groups').innerText()).includes(`Exam ${group.number}`));
        assert.equal(await section('groups').locator('a:has(svg)').getAttribute('href'),`/problems/${group.entry}/`,'Current Exam group is marked');
        await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});
      }
      await page.getByRole('button',{name:locale==='zh'?'Switch to English':'切换为中文',exact:true}).click();
      assert.equal(await crumb.getAttribute('aria-label'),locale==='zh'?'Breadcrumb':'面包屑导航');
      await layout();
      // Course home remains in the compact navigation path, not the Exam picker.
      await resize(375);await openMenu('course');await section('course').locator('a').click();
      await ready(home.id);await focused();await resize(width);
      assert.equal(await page.evaluate(()=>window.__breadcrumbDocument),true,'Navigation must use Astro, not replace the document');
      const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),course.storageKey);
      assert.deepEqual(stored.sidebars,{navigation:false,references:false},'Breadcrumbs do not change sidebar preferences');
      assert.deepEqual(errors,[]);
      results.push({locale,theme,width,passed:true,layouts});
      console.log('PASS single-row workspace-responsive breadcrumb, all destinations, keyboard, resize focus and history',locale,theme,width);
    }finally{await context.close();}
  }
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});
  try{
    const page=await context.newPage();await page.goto(`${base}/problems/${paper.problems[0].id}/`);
    assert.equal(await page.locator('.study-breadcrumb [aria-current=page]').count(),1);
    await page.locator('.study-breadcrumb [data-breadcrumb-menu=course]').click();
    await page.waitForURL(`**/problems/${home.id}/`);
    assert.ok(await page.locator('#problem-title').isVisible());
  }finally{await context.close();}
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify({results},null,2));
  await browser.close();
}
