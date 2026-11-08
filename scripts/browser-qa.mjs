// Optional end-to-end QA. Install Playwright separately, or point PLAYWRIGHT_MODULE
// at an isolated install. Run against `bun run preview --host 127.0.0.1`.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {checkI18n} from './browser-i18n-qa.mjs';
import {checkThemeNavigation} from './browser-theme-qa.mjs';
import {checkContentLocales} from './browser-content-locales-qa.mjs';
import {loadContent} from '../content/papers.server.ts';
import {renderText} from '../src/lib/math.ts';
import {parseText,displayEquations,formulaReference} from '../content/text.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=process.env.QA_ARTIFACTS??resolve(root,'artifacts');
const base=process.env.QA_URL??'http://localhost:4173';
const {exams}=loadContent(resolve(root,'content'));
await mkdir(destination,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light',reducedMotion:'reduce'});
const page=await context.newPage();
page.setDefaultTimeout(12000);
const errors=[],failures=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>failures.push({url:r.url(),error:r.failure()?.errorText}));
const record=(name,data={})=>{checks.push({name,...data});console.log('PASS',name);};
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ecse2100-fieldnotes-v1')));
async function selected(id){await page.waitForFunction(id=>document.querySelector('[data-study-ready="true"]')?.getAttribute('data-problem')===id&&JSON.parse(localStorage.getItem('ecse2100-fieldnotes-v1')??'{}').selected===id,id);}
async function goto(id){await page.goto(`${base}/problems/${id}/`,{waitUntil:'domcontentloaded',timeout:45000});await selected(id);}
async function noOverflow(){const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth}));assert.ok(metrics.documentWidth<=metrics.width+1,JSON.stringify(metrics));}
async function annotationText(question,locale){
  const html=question.parts.flatMap(part=>{
    const body=part.solution[locale];
    return parseText(body).children.filter(node=>node.type!=='math').map(node=>renderText(body.slice(node.position.start.offset,node.position.end.offset)));
  });
  const actual=await page.locator('[data-authored-annotation]').evaluateAll((nodes,html)=>{
    const normalize=text=>text.replace(/\s+/g,' ').trim();
    return {
      actual:nodes.map(node=>normalize(node.textContent)),
      expected:html.map(value=>normalize(new DOMParser().parseFromString(value,'text/html').body.textContent))
    };
  },html);
  assert.deepEqual(actual.actual,actual.expected,`${question.id}: ${locale} prose and spacing`);
}
async function guideText(question,locale){
  const value=await page.locator('.overview-prose').evaluate((node,html)=>{
    const normalize=text=>text.replace(/\s+/g,' ').trim();
    return {actual:normalize(node.textContent),expected:normalize(new DOMParser().parseFromString(html,'text/html').body.textContent)};
  },renderText(question.guide[locale]));
  assert.equal(value.actual,value.expected,`${question.id}: ${locale} guide`);
}
async function solutionMath(question,locale){
  const rendered=await page.locator('[data-part]').evaluateAll(nodes=>nodes.map(node=>({
    id:node.dataset.part,
    equations:[...node.querySelectorAll('.solution-body .math-display')].map(math=>math.getAttribute('data-math'))
  })));
  assert.deepEqual(rendered,question.parts.map(part=>({id:part.id,equations:displayEquations(part.solution[locale])})),`${question.id}: all ${locale} calculations in authored order`);
}
async function revealAll(){
  const button=page.locator('.solution-section-heading button');
  assert.equal(await button.count(),1);
  if(await button.getAttribute('aria-expanded')==='true'){
    await button.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#worked-parts [data-slot="accordion-content"]')].every(e=>e.hidden||getComputedStyle(e).display==='none'));
  }
  await button.click();
}
try {
  await checkI18n(browser,base,record);
  await checkThemeNavigation(browser,base,record);
  await checkContentLocales(browser,base,record);
  const staticContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:1000}});
  try {
    const staticPage=await staticContext.newPage();
    await staticPage.goto(base+'/');
    await staticPage.waitForURL('**/problems/e2-s26-q3/');
    const exam=exams.find(e=>e.id==='e1-f25'),question=exam.problems[1],next=exam.problems[2];
    await staticPage.goto(`${base}/problems/${question.id}/`);
    assert.equal(await staticPage.locator('#problem-title').innerText(),question.title.zh);
    assert.equal(await staticPage.locator('[data-original-prompt]').count(),question.parts.length);
    assert.equal(await staticPage.locator('main').getAttribute('data-study-ready'),'false');
    await staticPage.locator(`a.question-link[href="/problems/${next.id}/"]`).click();
    await staticPage.waitForURL(`**/problems/${next.id}/`);
    assert.equal(await staticPage.locator('#problem-title').innerText(),next.title.zh);
    await staticPage.setViewportSize({width:375,height:812});
    assert.ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    record('Static root redirect, deep links and sidebar links work without JavaScript; phone question text remains readable');
  } finally {await staticContext.close();}

  await goto('e2-s26-q1');
  await page.evaluate(()=>{
    const data=JSON.parse(localStorage.getItem('ecse2100-fieldnotes-v1'));
    data.mode='practice';
    data.revealed={'e2-s26-q1-a':20,'e2-s26-q2-a':1,'e2-s26-q2-b':0};
    localStorage.setItem('ecse2100-fieldnotes-v1',JSON.stringify(data));
  });
  for(const id of ['e2-s26-q1','e2-s26-q2']){
    await goto(id);
    const question=exams.flatMap(e=>e.problems).find(q=>q.id===id);
    assert.equal(await page.locator('#worked-parts .part-trigger[aria-expanded="true"]').count(),0);
    for(const part of question.parts){
      const item=page.locator(`[data-part="${part.id}"]`);
      await item.locator('.part-trigger').click();
      assert.equal(await item.locator('.solution-body .math-display').count(),displayEquations(part.solution.zh).length);
      assert.equal(await item.locator('[data-answer]').count(),1);
      if(part.figure)assert.equal(await item.locator('.part-content .figure-image').count(),1);
      if(part.note)assert.equal(await item.locator('.solution-note').count(),1);
      await item.locator('.part-trigger').click();
    }
  }
  assert.equal((await stored()).revealed['e2-s26-q2-a'],1);
  assert.equal((await stored()).revealed['e2-s26-q2-b'],0);
  assert.equal((await stored()).mode,'practice');
  assert.equal(await page.getByRole('group',{name:'学习模式',exact:true}).count(),0);
  assert.equal(await page.getByRole('radio',{name:/^(精读|练习|Learn|Practice)$/}).count(),0);
  record('One solution view replaces reading modes while preserving the retired preference and reveal records');

  await goto('e2-s26-q3');
  await page.evaluate(()=>window.__fieldnotesDocument='same-page');
  await page.locator('a.question-link[href="/problems/e2-s26-q4/"]').click();
  await selected('e2-s26-q4');
  assert.ok(page.url().endsWith('/problems/e2-s26-q4/'));
  assert.equal(await page.evaluate(()=>window.__fieldnotesDocument),'same-page');
  await page.goBack();await selected('e2-s26-q3');
  await page.goForward();await selected('e2-s26-q4');
  await page.evaluate(()=>{
    const data=JSON.parse(localStorage.getItem('ecse2100-fieldnotes-v1'));
    data.selected='e1-f25-q1';
    data.completed['e9-f99-q1-a']=true;data.bookmarks['e9-f99-q1']=true;
    data.revealed['e9-f99-q1-a']=2;data.notes={'e9-f99-q1':'Preserved legacy record'};
    localStorage.setItem('ecse2100-fieldnotes-v1',JSON.stringify(data));
  });
  await page.reload();await selected('e2-s26-q4');
  assert.ok(page.url().endsWith('/problems/e2-s26-q4/'));
  assert.equal((await stored()).completed['e9-f99-q1-a'],true);
  assert.equal((await stored()).bookmarks['e9-f99-q1'],true);
  assert.equal((await stored()).revealed['e9-f99-q1-a'],2);
  assert.equal((await stored()).notes['e9-f99-q1'],'Preserved legacy record');
  assert.ok((await page.locator('.progress-summary strong').innerText()).replace(/\s+/g,'').startsWith('0/'));
  record('Unplugged paper records survive without affecting active progress');
  record('Problem links use client navigation and browser history; a direct path overrides the saved selection');
  await goto('e2-s26-q3');
  await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.locator('[data-original-statement]').isVisible());
  assert.ok(await page.evaluate(()=>performance.getEntriesByType('resource').every(r=>!r.name.includes('noto-sans-sc'))));
  record('Chinese questions use system fonts without CJK webfont downloads');
  const navigationToggle=page.locator('[data-sidebar-toggle="navigation"]');
  const referencesToggle=page.locator('[data-sidebar-toggle="references"]');
  async function sidebars(navigation,references){
    if((await navigationToggle.getAttribute('aria-expanded')==='true')!==navigation)await navigationToggle.click();
    if((await referencesToggle.getAttribute('aria-expanded')==='true')!==references)await referencesToggle.click();
    await page.waitForFunction(({navigation,references})=>{
      const nav=document.getElementById('exam-navigation'),ref=document.getElementById('reference-sidebar');
      return (navigation?nav.getBoundingClientRect().width>180:nav.getBoundingClientRect().width===0)&&
        (references?ref.getBoundingClientRect().width>200:ref.getBoundingClientRect().width===0);
    },{navigation,references});
  }
  const readingWidth=await page.locator('#main-content').evaluate(e=>e.getBoundingClientRect().width);
  await page.locator('#reference-sidebar').getByRole('tab',{name:'课件',exact:true}).click();
  for(const [navigation,references] of [[false,true],[true,false],[false,false],[true,true]]){
    await sidebars(navigation,references);await noOverflow();
    assert.equal(await page.locator('#exam-navigation').evaluate(e=>e.inert),!navigation);
    assert.equal(await page.locator('#reference-sidebar').evaluate(e=>e.inert),!references);
    assert.equal((await stored()).selected,'e2-s26-q3');
    if(!navigation||!references)assert.ok(await page.locator('#main-content').evaluate(e=>e.getBoundingClientRect().width)>=readingWidth);
  }
  assert.equal(await page.locator('#reference-sidebar').getByRole('tab',{name:'课件',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('#reference-sidebar').getByRole('tab',{name:'公式表',exact:true}).click();
  record('Both sidebars collapse independently, release reading width and preserve the selected reference tab');
  await sidebars(false,false);
  // The storage transaction is coordinated asynchronously across tabs; verify it committed before reloading.
  await page.waitForFunction(()=>{
    const sidebars=JSON.parse(localStorage.getItem('ecse2100-fieldnotes-v1')??'{}').sidebars;
    return sidebars?.navigation===false&&sidebars?.references===false;
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.navigation==='closed'&&document.documentElement.dataset.references==='closed');
  assert.equal(await navigationToggle.getAttribute('aria-expanded'),'false');
  assert.equal(await referencesToggle.getAttribute('aria-expanded'),'false');
  assert.deepEqual((await stored()).sidebars,{navigation:false,references:false});
  record('Sidebar preferences persist after reload and are restored before the reading layout opens');
  await navigationToggle.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.getElementById('exam-navigation').getBoundingClientRect().width>180);
  await page.locator('#exam-navigation [aria-current="page"]').focus();
  await page.keyboard.press('Control+b');
  assert.equal(await navigationToggle.getAttribute('aria-expanded'),'false');
  assert.ok(await navigationToggle.evaluate(e=>document.activeElement===e));
  await referencesToggle.focus();await page.keyboard.press('Enter');
  assert.equal(await referencesToggle.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Space');
  assert.equal(await referencesToggle.getAttribute('aria-expanded'),'false');
  record('Native sidebar buttons support keyboard activation and move focus out of collapsed content');
  await page.setViewportSize({width:375,height:812});
  await page.getByRole('button',{name:'打开试卷导航',exact:true}).click();
  await page.locator('#mobile-exam-navigation').waitFor({state:'visible'});
  await page.keyboard.press('Escape');await page.locator('#mobile-exam-navigation').waitFor({state:'detached'});
  await page.getByRole('button',{name:'打开公式与课件',exact:true}).click();
  await page.locator('#mobile-reference-sidebar').waitFor({state:'visible'});
  await page.keyboard.press('Escape');await page.locator('#mobile-reference-sidebar').waitFor({state:'detached'});
  await noOverflow();await page.setViewportSize({width:1440,height:1000});
  assert.deepEqual((await stored()).sidebars,{navigation:false,references:false});
  await sidebars(true,true);
  record('Phone drawers remain available with both desktop sidebars collapsed');
  // Inspect every question and every answer in the rendered application.
  let partCount=0,stepCount=0;
  for(const exam of exams)for(const q of exam.problems){
    await goto(q.id);await revealAll();
    assert.equal(await page.locator('#problem-title').innerText(),q.title.zh);
    assert.equal(await page.locator('[data-problem-guide]').count(),1);
    await guideText(q,'zh');
    assert.equal(await page.locator('.overview-references button').count(),q.lectures.length);
    assert.ok(await page.locator('[data-problem-guide]').evaluate(e=>Boolean(e.compareDocumentPosition(document.querySelector('#worked-parts'))&Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.equal(await page.locator('[data-original-statement][lang="zh-CN"]').count(),1);
    assert.equal(await page.locator('[data-original-prompt][lang="zh-CN"]').count(),q.parts.length);
    await page.getByRole('button',{name:'Switch to English',exact:true}).click();
    assert.equal(await page.locator('#problem-title').innerText(),q.title.en);
    await guideText(q,'en');
    assert.equal(await page.locator('[data-original-statement][lang="en"]').count(),1);
    assert.equal(await page.locator('[data-original-prompt][lang="en"]').count(),q.parts.length);
    await annotationText(q,'en');
    await solutionMath(q,'en');
    await page.getByRole('button',{name:'切换为中文',exact:true}).click();
    assert.equal(await page.locator('#problem-title').innerText(),q.title.zh);
    await annotationText(q,'zh');
    await solutionMath(q,'zh');
    assert.equal(await page.locator('[data-part]').count(),q.parts.length);
    assert.equal(await page.locator('[data-answer]').count(),q.parts.length);
    assert.equal(await page.locator('.final-answer,.answer-heading,.problem-pagination').count(),0);
    assert.equal(await page.locator('.derivation-equations[data-answer]').count(),q.parts.length);
    const renderedSteps=await page.locator('[data-part]').evaluateAll(nodes=>nodes.map(node=>({
      id:node.dataset.part,
      count:node.querySelectorAll('.solution-body .math-display').length,
      firstEquation:node.querySelector('.solution-body .math-display')?.getAttribute('data-math')
    })));
    for(const part of q.parts){
      const actual=renderedSteps.find(item=>item.id===part.id);
      assert.equal(actual.count,displayEquations(part.solution.zh).length,part.id);
      assert.equal(actual.firstEquation,displayEquations(part.solution.zh)[0],part.id);
      let references=0;
      function visit(node){if(formulaReference(node))references++;if(node.children)node.children.forEach(visit);}
      visit(parseText(part.solution.zh));
      assert.equal(await page.locator(`[data-part="${part.id}"] .solution-body .formula-link-inline`).count(),references,part.id);
      stepCount+=actual.count;
    }
    assert.equal(await page.locator('.derivation-equations .formula-link,.equation-references').count(),0);
    for(const link of await page.locator('main .solution-annotation .formula-link-inline').evaluateAll(nodes=>nodes.map(node=>({
      display:getComputedStyle(node).display,
      size:getComputedStyle(node).fontSize,
      paragraphSize:getComputedStyle(node.closest('.solution-annotation')).fontSize,
      icon:node.querySelector('svg')!==null
    })))){assert.equal(link.display,'inline');assert.equal(link.size,link.paragraphSize);assert.equal(link.icon,false);}
    for(const result of await page.locator('[data-answer]').evaluateAll(nodes=>nodes.map(node=>({box:Boolean(node.querySelector('.fbox')),background:getComputedStyle(node).backgroundColor,border:getComputedStyle(node).borderTopWidth})))) {
      assert.equal(result.box,true);assert.equal(result.background,'rgba(0, 0, 0, 0)');assert.equal(result.border,'0px');
    }
    assert.equal(await page.locator('.katex-error').count(),0);
    await page.locator('.figure-image img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    await noOverflow();partCount+=q.parts.length;
    await page.setViewportSize({width:375,height:812});
    await noOverflow();
    assert.equal(await page.locator('.solution-body .math-display').count(),q.parts.reduce((total,part)=>total+displayEquations(part.solution.zh).length,0));
    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('button',{name:'收起全部推导',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#worked-parts [data-slot="accordion-content"]')].every(e=>e.hidden||getComputedStyle(e).display==='none'));
    assert.equal(await page.locator('.part-trigger[aria-expanded="true"]').count(),0);
    assert.equal(await page.locator('[data-original-prompt]').count(),q.parts.length);
    assert.equal(await page.locator('[data-answer]:visible').count(),0);
  }
  record('All 20 problems and 93 worked parts render',{parts:partCount});
  record('Every subpart displays its opening equation and all intermediate steps',{steps:stepCount});
  record('All detailed solutions fit the 375px phone reading layout',{parts:partCount,steps:stepCount});
  record('All 20 bilingual introductions precede the derivation and link to lecture pages');
  record('One global toggle tracks open parts across all 20 original problems');
  await goto('e2-f25-q1');
  await revealAll();
  const questionSphere=page.locator('.study-figure[data-figure="e2-f25-q1"]');
  assert.equal(await questionSphere.locator('canvas').count(),0);
  assert.ok((await questionSphere.locator('img').getAttribute('src')).endsWith('.svg'));
  assert.equal(await page.locator('.solution-exploration,.spatial-figure,.sphere-view').count(),0);
  const sphereHeight=await questionSphere.locator('.figure-canvas').evaluate(e=>e.getBoundingClientRect().height);
  await questionSphere.getByRole('radio',{name:'原始插图',exact:true}).click();
  await questionSphere.locator('.figure-canvas img').evaluate(img=>img.decode());
  await questionSphere.getByRole('radio',{name:'矢量复刻',exact:true}).click();
  await questionSphere.locator('.figure-canvas img').evaluate(img=>img.decode());
  assert.equal(await questionSphere.locator('.figure-canvas').evaluate(e=>e.getBoundingClientRect().height),sphereHeight);
  record('Spherical question and solutions use static SVGs with no interactive 3D tool');
  await goto('e2-s26-q3');
  const chineseText=await page.locator('[data-original-statement]').innerText();
  assert.ok(chineseText.startsWith('右侧同轴电缆的电介质质量较差'));
  assert.equal(await page.locator('.translation-toggle,.statement-translation').count(),0);
  assert.equal(await page.getByRole('switch',{name:'显示中文翻译',exact:true}).count(),0);
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  assert.ok((await page.locator('[data-original-statement]').innerText()).startsWith('The coaxial cable to the right has a poor dielectric'));
  await page.getByRole('button',{name:'切换为中文',exact:true}).click();
  assert.equal(await page.locator('[data-original-statement]').innerText(),chineseText);
  record('Global language directly switches original wording and its faithful Chinese translation');
  await revealAll();
  const ref=page.locator('a.formula-link[aria-label*="高斯定律"]').first();
  await ref.hover();await page.locator('[data-slot="hover-card-content"]').waitFor({state:'visible'});
  await page.locator('[data-slot="hover-card-content"] img').evaluate(img=>img.decode());
  record('Formula hover shows the original excerpt');
  await ref.click();await page.locator('[data-source-highlight]').waitFor();
  assert.equal(await page.locator('#source-page').inputValue(),'4');
  assert.ok((await page.locator('.source-paper img').getAttribute('src')).includes('/crib/4.webp'));
  const controls=await page.locator('.source-toolbar button,.source-toolbar input').evaluateAll(nodes=>nodes.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,button:e.tagName==='BUTTON'})));
  assert.ok(controls.every(c=>c.height===36&&(!c.button||c.width===36)));
  record('Source navigation, page input and zoom controls use consistent 36px sizing');
  const map=page.locator('.source-page-map[aria-current="page"]');
  const thumbnailList=page.locator('.source-thumbnail-list');
  async function selectedThumbnailVisible(){
    await page.waitForFunction(()=>{
      const list=document.querySelector('.source-thumbnail-list').getBoundingClientRect();
      const active=document.querySelector('.source-thumbnail[data-current]').getBoundingClientRect();
      return active.top>=list.top-1&&active.bottom<=list.bottom+1;
    });
  }
  await map.waitFor({state:'visible'});
  await map.locator('img').evaluate(img=>img.decode());
  await selectedThumbnailVisible();
  assert.equal(await page.locator('.source-thumbnail').count(),10);
  const layout=await thumbnailList.evaluate(list=>{
    const items=[...list.children].map(el=>el.getBoundingClientRect()),frame=list.getBoundingClientRect();
    return {scrollable:list.scrollHeight>list.clientHeight,vertical:items.every((item,index)=>!index||(item.top>items[index-1].bottom&&Math.abs(item.left-items[0].left)<1)),visible:items.filter(item=>item.top<frame.bottom&&item.bottom>frame.top).length};
  });
  assert.ok(layout.scrollable&&layout.vertical&&layout.visible>=2,JSON.stringify(layout));
  record('Page overview lists every PDF page vertically in a bounded scrolling rail');
  const readingPosition=await page.locator('.source-stage').evaluate(el=>el.scrollTop);
  await thumbnailList.evaluate(el=>el.scrollTop=0);
  await thumbnailList.hover();await page.mouse.wheel(0,320);
  await page.waitForFunction(()=>document.querySelector('.source-thumbnail-list').scrollTop>0);
  assert.equal(await page.locator('.source-stage').evaluate(el=>el.scrollTop),readingPosition);
  assert.equal(await page.locator('#source-page').inputValue(),'4');
  record('Scrolling thumbnails leaves the main page and its reading position unchanged');
  assert.equal(await page.locator('[data-source-map-highlight]').count(),1);
  await map.focus();await page.keyboard.press('Home');
  assert.equal(await page.locator('.source-stage').evaluate(e=>e.scrollTop),0);
  const mapBox=await map.boundingBox();
  await map.click({position:{x:mapBox.width/2,y:mapBox.height*.9}});
  const bottom=await page.locator('.source-stage').evaluate(e=>e.scrollTop);
  assert.ok(bottom>0);
  await map.focus();await page.keyboard.press('ArrowUp');
  assert.ok(await page.locator('.source-stage').evaluate(e=>e.scrollTop)<bottom);
  await page.getByRole('button',{name:'放大',exact:true}).click();
  await page.waitForFunction(()=>parseFloat(document.querySelector('[data-source-map-viewport]').style.width)<99);
  assert.equal((await map.boundingBox()).width,mapBox.width);
  await page.getByRole('button',{name:'缩小',exact:true}).click();
  record('Current thumbnail tracks scrolling and zoom, supports pointer and keyboard positioning');
  await page.getByRole('button',{name:'下一页',exact:true}).click();
  assert.equal(await page.locator('#source-page').inputValue(),'5');
  assert.equal(await page.locator('[data-source-highlight]').count(),0);
  assert.equal(await map.locator('[data-source-map-highlight]').count(),0);
  assert.equal(await page.locator('[data-thumbnail-page="4"] [data-source-map-highlight]').count(),1);
  assert.ok((await map.locator('img').getAttribute('src')).endsWith('/5.webp'));
  await selectedThumbnailVisible();
  await page.getByRole('button',{name:'上一页',exact:true}).click();
  assert.equal(await page.locator('[data-source-highlight]').count(),1);
  await page.locator('#source-page').fill('9');await page.locator('#source-page').press('Enter');
  await selectedThumbnailVisible();
  assert.ok((await map.locator('img').getAttribute('src')).endsWith('/9.webp'));
  await page.locator('[data-thumbnail-page="10"] button').click();
  assert.equal(await page.locator('#source-page').inputValue(),'10');
  assert.ok((await page.locator('.source-paper img').getAttribute('src')).endsWith('/10.webp'));
  assert.equal(await page.getByRole('button',{name:'下一页',exact:true}).isDisabled(),true);
  await page.locator('[data-thumbnail-page="1"] button').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#source-page').inputValue(),'1');
  assert.equal(await page.getByRole('button',{name:'上一页',exact:true}).isDisabled(),true);
  await selectedThumbnailVisible();
  await page.locator('#source-page').fill('4');await page.locator('#source-page').press('Enter');
  await selectedThumbnailVisible();
  assert.equal(await map.locator('[data-source-map-highlight]').count(),1);
  record('Thumbnail clicks and keyboard activation change pages; toolbar and page input reveal the selected thumbnail');
  await page.keyboard.press('Escape');record('PDF page navigation and exact formula highlight');
  await page.getByRole('button',{name:'Lecture 10',exact:true}).click();
  assert.equal(await page.locator('#source-page').inputValue(),'32');
  assert.ok((await page.locator('.source-paper img').getAttribute('src')).includes('/lecture-10/32.webp'));
  assert.equal(await page.locator('.source-thumbnail').count(),36);
  await selectedThumbnailVisible();
  await page.locator('[data-thumbnail-page="36"] button').click();
  assert.equal(await page.locator('#source-page').inputValue(),'36');
  await page.locator('.source-paper img').evaluate(img=>img.decode());
  assert.ok((await page.locator('.source-paper img').getAttribute('src')).endsWith('/lecture-10/36.webp'));
  await selectedThumbnailVisible();
  await page.keyboard.press('Escape');record('Long lecture PDFs show every page and open the cited or selected thumbnail');
  await page.getByRole('radio',{name:'原始插图',exact:true}).click();
  assert.ok((await page.locator('.figure-image img').first().getAttribute('src')).includes('/original-figures/'));
  await page.getByRole('radio',{name:'矢量复刻',exact:true}).click();
  assert.ok((await page.locator('.figure-image img').first().getAttribute('src')).endsWith('.svg'));
  record('Original figure / Matplotlib SVG switch');
  const solutionToggle=page.locator('.solution-section-heading button');
  if(await solutionToggle.getAttribute('aria-expanded')==='true')await solutionToggle.click();
  await page.waitForFunction(()=>document.querySelector('.solution-section-heading button')?.getAttribute('aria-expanded')==='false'
    && [...document.querySelectorAll('.solution-body .math-display')].every(element=>!element.checkVisibility()));
  assert.equal(await page.locator('[data-answer]:visible').count(),0);
  assert.equal(await page.locator('.solution-body .math-display:visible').count(),0);
  assert.equal(await page.locator('.worked-solution textarea').count(),0);
  assert.equal(await page.locator('[id^="attempt-"]').count(),0);
  record('The unified solution view has no mode switch or per-part text entry');
  const practicePart=page.locator('[data-part="e2-s26-q3-a"]');
  const expectedPracticeSteps=displayEquations(exams.flatMap(e=>e.problems).find(q=>q.id==='e2-s26-q3').parts[0].solution.zh).length;
  await practicePart.locator('.part-trigger').click();
  assert.equal(await practicePart.locator('.solution-body .math-display').count(),expectedPracticeSteps);
  assert.equal(await practicePart.locator('[data-answer]').count(),1);
  assert.equal(await page.getByRole('button',{name:'下一步',exact:true}).count(),0);
  assert.equal((await stored()).revealed['e2-s26-q2-a'],1);
  await page.getByRole('button',{name:/小问 .+: 标记已掌握/}).first().click();
  record('Solutions collapse and reopen in full; mastery and legacy records remain independent');
  assert.equal(await page.getByRole('tab',{name:'我的笔记',exact:true}).count(),0);
  assert.equal(await page.locator('textarea').count(),0);
  await page.getByRole('button',{name:'收藏此题',exact:true}).click();
  await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.lang==='en');
  // The bootstrap restores <html> before Svelte hydrates the SVG's theme.
  await page.waitForFunction(()=>document.querySelector('.figure-image img')?.getAttribute('src')?.endsWith('-dark.svg'));
  const data=await stored();assert.equal(data.theme,'dark');assert.equal(data.locale,'en');assert.equal(data.completed['e2-s26-q3-a'],true);assert.equal(data.bookmarks['e2-s26-q3'],true);
  assert.equal(await page.getByRole('tab',{name:'My notes',exact:true}).count(),0);
  assert.ok(await page.locator('html').evaluate(e=>e.classList.contains('dark')));
  assert.ok((await page.locator('.figure-image img').first().getAttribute('src')).endsWith('-dark.svg'));
  record('Locale, theme, mastery and bookmarks persist after reload without a notes UI');
  await revealAll();
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:resolve(destination,'desktop-dark-en.png')});
  await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();
  await page.getByRole('button',{name:'切换为中文',exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:resolve(destination,'desktop-light-zh.png')});
  await page.keyboard.press('Control+k');await page.locator('#global-search').fill('镜像');
  await page.getByRole('dialog').getByRole('link',{name:/导体平面上方的点电荷/}).click();
  await page.waitForURL(url=>url.pathname==='/problems/e2-s26-q4/');
  await selected('e2-s26-q4');
  assert.equal((await stored()).selected,'e2-s26-q4');record('Keyboard search navigates across the bilingual question bank');
  await revealAll();
  for(const viewport of [{width:375,height:812},{width:390,height:844},{width:768,height:1024},{width:667,height:375}]){
    await page.setViewportSize(viewport);await noOverflow();record(`No page overflow at ${viewport.width}×${viewport.height}`);
  }
  await page.setViewportSize({width:375,height:812});
  await page.getByRole('button',{name:'打开试卷导航',exact:true}).click();
  await page.getByRole('dialog').getByRole('tab',{name:'Exam 1',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ecse2100-fieldnotes-v1')).selected==='e1-f26-q1');
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.equal(await page.getByRole('dialog').count(),0);record('Mobile navigation drawer selects an exam after client navigation and closes');
  await page.getByRole('button',{name:'打开公式与课件',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');record('Mobile formula / lecture drawer works');
  await page.getByRole('button',{name:'Lecture 02',exact:true}).click();
  assert.equal(await page.locator('.source-overview').isVisible(),false);
  await page.locator('.source-dialog').evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
  const phoneControls=await page.locator('.source-toolbar button,.source-toolbar input').evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().height));
  assert.ok(phoneControls.every(h=>h===36));await noOverflow();
  await page.keyboard.press('Escape');record('Phone source viewer preserves control sizing and hides the overview when space is limited');
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:resolve(destination,'mobile-light-zh.png'),fullPage:true});
  await page.getByRole('button',{name:'切换深色主题',exact:true}).click();
  await page.screenshot({path:resolve(destination,'mobile-dark-zh.png')});
  await page.setViewportSize({width:667,height:375});
  await page.getByRole('button',{name:'Lecture 02',exact:true}).click();
  const box=await page.getByRole('dialog').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=376);
  await page.keyboard.press('Escape');record('Source viewer remains within a landscape phone viewport');
  assert.deepEqual(errors,[]);record('No uncaught browser errors');
  const report={status:'passed',checks,consoleErrors:errors,failedRequests:failures};
  await writeFile(resolve(destination,'browser-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:'passed',checks:checks.length,artifacts:destination}));
} catch(error) {
  await writeFile(resolve(destination,'browser-report.json'),JSON.stringify({status:'failed',checks,consoleErrors:errors,failedRequests:failures,error:String(error)},null,2));
  console.log('Failure context',JSON.stringify({url:page.url(),errors,links:await page.locator('.formula-link').evaluateAll(nodes=>nodes.slice(0,5).map(n=>({tag:n.tagName,label:n.getAttribute('aria-label')}))).catch(()=>[])}));
  throw error;
} finally { await browser.close(); }
