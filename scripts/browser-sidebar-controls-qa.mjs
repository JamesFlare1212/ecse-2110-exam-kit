// Header controls retain one stable 36px slot; edge hints open toward the reader.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173',out='artifacts/sidebar-controls';
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const problemId=exams.flatMap(exam=>exam.problems).find(problem=>problem.id==='p2-f26-q3')?.id??course.defaultProblemId;
const checks=[];await mkdir(out,{recursive:true});
async function row(page){
  const bounds=await page.locator('.topbar').evaluate(header=>{
    const rect=node=>node.getBoundingClientRect().toJSON();
    return {header:rect(header),path:rect(header.querySelector('.study-breadcrumb')),controls:[...header.querySelectorAll('[data-sidebar-toggle]')].map(node=>({button:rect(node),icon:rect(node.querySelector('svg'))})),overflow:document.documentElement.scrollWidth-innerWidth};
  });
  const center=box=>box.y+box.height/2;
  for(const {button,icon} of bounds.controls){
    assert.equal(button.width,36);assert.equal(button.height,36);
    assert(Math.abs(center(button)-center(bounds.path))<.5,'Sidebar buttons and path share the same centerline');
    assert(Math.abs(center(button)-center(icon))<.5,'Icons stay vertically centered');
    assert(Math.abs(button.x+button.width/2-icon.x-icon.width/2)<.5,'Icons stay horizontally centered');
  }
  assert(bounds.overflow<=1);assert(bounds.header.height<=70);return bounds;
}
try{
  for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [320,390,801,1180,1244,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:width===1244?1.5:1,reducedMotion:'reduce',hasTouch:width<500});
    try{
      await context.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,sidebars:{navigation:false,references:false}})),{key:course.storageKey,locale,theme});
      const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
      page.setDefaultTimeout(12000);await page.goto(`${base}/problems/${problemId}/`);await page.waitForSelector('[data-study-ready=true]');
      if(locale==='zh'&&fontCSS){await page.addStyleTag({content:fontCSS});await page.evaluate(()=>document.fonts.ready);}
      await row(page);assert.equal(await page.locator('button button,button a,a button').count(),0);
      const placements=[];
      for(const side of ['navigation','references']){
        const button=page.locator(`[data-sidebar-toggle=${side}]`);
        assert.equal(await button.getAttribute('data-slot'),'button','Tooltip child remains a native shadcn Button');
        await button.hover();const tip=page.locator('[data-slot=tooltip-content][data-state=delayed-open], [data-slot=tooltip-content][data-state=instant-open]');
        await tip.waitFor();await tip.evaluate(node=>Promise.all(node.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
        const anchor=await button.boundingBox(),hint=await tip.boundingBox();
        assert.equal(await tip.getAttribute('data-side'),'bottom');
        assert.equal(await tip.getAttribute('data-align'),side==='navigation'?'start':'end');
        assert(hint.x>=11&&hint.x+hint.width<=width-11,'Edge hints keep a viewport inset');
        const edge=side==='navigation'?hint.x-anchor.x:hint.x+hint.width-anchor.x-anchor.width;
        assert(Math.abs(edge)<1,'Hint aligns to its own button edge instead of drifting to the viewport edge');
        assert(hint.y>=anchor.y+anchor.height+7,'Hints leave a deliberate gap below the control');
        if(side==='navigation'&&locale==='zh'&&theme==='dark'&&[390,1244].includes(width))await page.screenshot({path:`${out}/navigation-${width}.png`,clip:{x:0,y:0,width:Math.min(width,650),height:160}});
        placements.push({side,anchor,hint});
        await page.keyboard.press('Escape');await tip.waitFor({state:'hidden'});
        await page.mouse.move(anchor.x+anchor.width/2,anchor.y+anchor.height/2);await page.mouse.down();await page.waitForTimeout(130);
        const pressed=await button.boundingBox();assert(Math.abs(pressed.y-anchor.y)<.1,'Holding a sidebar button must not shift it down');
        await page.mouse.up();
        const controlled=await button.getAttribute('aria-controls');
        if(controlled.startsWith('mobile-')){
          const sheet=page.locator(`#${controlled}`);await sheet.waitFor();await page.keyboard.press('Escape');await sheet.waitFor({state:'detached'});
        }else{
          assert.equal(await button.getAttribute('aria-expanded'),'true');
          await page.waitForTimeout(220);await row(page);
          await button.focus();await page.keyboard.press('Enter');assert.equal(await button.getAttribute('aria-expanded'),'false');
          await page.waitForTimeout(220);
        }
        await page.keyboard.press('Escape');await page.mouse.move(width/2,150);await row(page);
      }
      const navigation=page.locator('[data-sidebar-toggle=navigation]');
      assert.equal(await navigation.getAttribute('aria-keyshortcuts'),'Control+b Meta+b');
      if(width>800){await page.keyboard.press('Control+b');assert.equal(await navigation.getAttribute('aria-expanded'),'true');await page.keyboard.press('Control+b');assert.equal(await navigation.getAttribute('aria-expanded'),'false');}
      // Phone Sheet controls never change saved desktop panel preferences.
      await page.waitForFunction(key=>{const state=JSON.parse(localStorage.getItem(key)).sidebars;return state.navigation===false&&state.references===false;},course.storageKey);
      const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).sidebars,course.storageKey);
      assert.deepEqual(saved,{navigation:false,references:false});assert.deepEqual(errors,[]);
      checks.push({locale,theme,width,placements});
    }finally{await context.close();}
  }
  console.log(`PASS ${checks.length} sidebar-control layouts: centering, anchored hints, stable press, keyboard and responsive panels`);
}finally{await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2)+'\n');await browser.close();}
