// Optional production-browser regression for fluid reader sizing and sidebar breakpoints.
// Run with PLAYWRIGHT_MODULE pointing to an isolated install, against `bun run preview`.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL??'http://127.0.0.1:4173';
const output=process.env.QA_ARTIFACTS??'artifacts/reader-layout';
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const checks=[];
await mkdir(output,{recursive:true});

async function metrics(page){
  return page.evaluate(()=>{
    const main=document.querySelector('main'),style=getComputedStyle(main);
    const box=node=>node.getBoundingClientRect().toJSON();
    const reader=box(main),navigation=box(document.querySelector('#exam-navigation'));
    const rail=box(document.querySelector('#reference-sidebar'));
    const left=parseFloat(style.paddingLeft),right=parseFloat(style.paddingRight);
    const interaction=document.querySelector('[data-interaction]');
    return {viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
      reader,navigation,rail,contentWidth:reader.width-left-right,left,right,
      interaction:interaction?box(interaction):null,
      columns:interaction?getComputedStyle(interaction.querySelector('.conduction-panels')).gridTemplateColumns:null};
  });
}

async function resize(page,width){
  await page.setViewportSize({width,height:1100});
  // Allow sidebar motion and Astro/Svelte resize observers to settle.
  await page.waitForTimeout(220);
  const size=await metrics(page);
  assert(size.overflow<=1,`No page-wide overflow: ${JSON.stringify(size)}`);
  assert(Math.abs(size.left-size.right)<1,'Reader gutters remain symmetric');
  if(size.interaction)assert(size.interaction.width<=size.contentWidth+1,'Interaction fits the reader');
  return size;
}

async function continuous(page,widths){
  let previous;
  const samples=[];
  for(const width of widths){
    const size=await resize(page,width);
    if(previous){
      const delta=width-previous.viewport;
      assert(size.contentWidth>=previous.contentWidth-.1,
        `A wider window must not narrow the reader: ${JSON.stringify({previous,size})}`);
      assert(size.contentWidth-previous.contentWidth<=delta+.5,
        `Reader must grow continuously, not jump to a different width cap: ${JSON.stringify({previous,size})}`);
    }
    samples.push(size);previous=size;
  }
  return samples;
}

try{
  for(const locale of ['zh','en'])for(const theme of ['light','dark']){
    const context=await browser.newContext({viewport:{width:1181,height:1100},reducedMotion:'reduce'});
    try{
      await context.addInitScript(({key,locale,theme})=>{
        if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({
          version:1,locale,theme,sidebars:{navigation:false,references:false}
        }));
      },{key:course.storageKey,locale,theme});
      const page=await context.newPage(),errors=[];
      page.setDefaultTimeout(12000);
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${base}/problems/p2-f26-q6/`);
      await page.waitForSelector('[data-study-ready=true]');
      if(locale==='zh'&&fontCSS)await page.addStyleTag({content:fontCSS});
      await page.evaluate(()=>document.fonts.ready);
      await page.locator('[data-part=p2-f26-q6-a] .part-trigger').click();
      await page.waitForSelector('[data-interaction=full-converter][data-ready=true]');
      await page.locator('[data-interaction] [role=slider]').focus();
      await page.keyboard.press('End');
      const samples=await continuous(page,[320,375,390,549,550,551,799,800,801,1024,1160,1180,1181,1200,1280,1440,1699,1700,1701,1920,2560]);
      const middle=samples.find(size=>size.viewport===1160);
      assert(middle.contentWidth>=middle.viewport*.9,'With sidebars closed, use at least 90% of this intermediate width');
      assert(samples.at(-1).reader.width<=1200,'Very wide screens retain a comfortable reader cap');
      for(const width of [390,1160,1181,1700]){
        await resize(page,width);
        await page.locator('[data-interaction]').scrollIntoViewIfNeeded();
        await page.screenshot({path:`${output}/${locale}-${theme}-${width}.png`});
      }
      // Opening either desktop sidebar releases only its own space; width-cap
      // changes must not introduce another shrink at 1180px or 1700px.
      await resize(page,1440);
      const nav=page.locator('[data-sidebar-toggle=navigation]'),ref=page.locator('[data-sidebar-toggle=references]');
      await nav.click();
      const navigationSamples=await continuous(page,[1024,1160,1180,1181,1440,1699,1700,1701,1920]);
      await ref.click();
      const bothSamples=await continuous(page,[1181,1280,1440,1699,1700,1701,1920]);
      const both=bothSamples.find(size=>size.viewport===1440);
      await resize(page,1440);await nav.click();
      const referenceOnly=await metrics(page);
      assert(referenceOnly.contentWidth>both.contentWidth,'Collapsing navigation makes more space available');
      await ref.click();
      const closed=await metrics(page);
      assert(closed.contentWidth>=referenceOnly.contentWidth,'Collapsing references never narrows the reader');
      await nav.click();await ref.click();
      // Compact controls open Sheets without overwriting saved desktop choices.
      for(const width of [390,800]){
        await resize(page,width);await nav.click();
        await page.locator('#mobile-exam-navigation').waitFor({state:'visible'});
        await page.keyboard.press('Escape');
        await page.locator('#mobile-exam-navigation').waitFor({state:'detached'});
        await ref.click();await page.locator('#mobile-reference-sidebar').waitFor({state:'visible'});
        await page.keyboard.press('Escape');
        await page.locator('#mobile-reference-sidebar').waitFor({state:'detached'});
      }
      await resize(page,1180);await ref.click();
      await page.locator('#mobile-reference-sidebar').waitFor({state:'visible'});
      await page.keyboard.press('Escape');await page.locator('#mobile-reference-sidebar').waitFor({state:'detached'});
      await resize(page,1440);
      assert.equal(await nav.getAttribute('aria-expanded'),'true');
      assert.equal(await ref.getAttribute('aria-expanded'),'true');
      await page.waitForFunction(key=>{
        const saved=JSON.parse(localStorage.getItem(key));
        return saved.sidebars.navigation&&saved.sidebars.references;
      },course.storageKey);
      await page.reload();await page.waitForSelector('[data-study-ready=true]');
      assert.equal(await nav.getAttribute('aria-expanded'),'true');
      assert.equal(await ref.getAttribute('aria-expanded'),'true');
      assert.deepEqual(errors,[]);
      checks.push({locale,theme,samples,navigationSamples,bothSamples});
      console.log('PASS fluid reader, intermediate widths, desktop panels and phone Sheets',locale,theme);
    }finally{await context.close();}
  }
  // The same sizing must work before hydration; no JS viewport measurements.
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1181,height:1100},reducedMotion:'reduce'});
  try{
    const page=await context.newPage();
    await page.goto(`${base}/problems/p2-f26-q6/`);
    // Playwright can set preferences in its isolated world with page JS disabled.
    await page.evaluate(()=>{
      document.documentElement.dataset.navigation='closed';
      document.documentElement.dataset.references='closed';
    });
    const samples=await continuous(page,[390,800,801,1160,1180,1181,1699,1700,1701,1920]);
    assert(await page.locator('[data-part=p2-f26-q6-a] .study-figure img').isVisible());
    checks.push({noJavaScript:true,samples});
  }finally{await context.close();}
  await writeFile(`${output}/report.json`,JSON.stringify({checks},null,2)+'\n');
}finally{await browser.close();}
