import {strict as assert} from 'node:assert';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
const{chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.QA_URL||'http://127.0.0.1:4173',out='artifacts/content-typography';await mkdir(out,{recursive:true});
const ecse=course.id==='ecse-2110';
const listSizes=ecse?{'e1-f26-q4':3,'e1-f26-q6':2,'p1-f26-q9':2,'p1-f26-q10':2}:{};
const targets=new Set(ecse?[...Object.keys(listSizes),'p2-f26-q1','p1-f26-q1']:[]);
const ids=exams.flatMap(e=>e.problems.map(q=>q.id));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),checks=[];
try{
 for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,1440]){
  const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await c.addInitScript(({key,locale,theme})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme})),{key:course.storageKey,locale,theme});
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  for(const id of ids){
   await p.goto(`${base}/problems/${id}/`,{waitUntil:'domcontentloaded'});await p.waitForSelector('[data-study-ready=true]');await p.evaluate(()=>document.fonts.ready);
   const statement=p.locator('.original-statement');assert(await statement.isVisible());
   const metrics=await statement.evaluate(e=>({height:e.getBoundingClientRect().height,math:e.querySelectorAll('.katex').length,blankBreaks:e.querySelectorAll('br+br').length,flow:e.querySelector('.markdown-flow')?getComputedStyle(e.querySelector('.markdown-flow')).gap:null}));
   assert.equal(metrics.blankBreaks,0,`${id}: authored block spacing must not contain blank br pairs`);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id} page overflow at ${width}/${locale}`);
   if(id in listSizes)assert.equal(await statement.getByRole('listitem').count(),listSizes[id]);
   if(ecse&&id==='p2-f26-q1')assert(metrics.math>=5,'Every stated armature quantity must render as KaTeX');
   if(ecse&&id==='p1-f26-q9'){const tex=await statement.locator('annotation[encoding="application/x-tex"]').allTextContents();assert(tex.some(t=>t.includes('9{:}5')));assert(tex.some(t=>t.includes('37{:}5')));}
   if(ecse&&id==='p1-f26-q1'){
    const blocks=await statement.locator('.markdown-flow>.markdown-block').evaluateAll(es=>es.map(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})));
    assert.equal(blocks.length,4);for(let i=1;i<blocks.length;i++)assert(Math.abs(blocks[i].top-blocks[i-1].bottom-8)<1);
    assert.equal(await statement.locator('.markdown-math .katex-display').first().evaluate(e=>getComputedStyle(e).marginTop),'0px');
   }
   if(targets.has(id)){
    if(locale==='zh'&&process.env.QA_CJK_CSS){await p.addStyleTag({content:await readFile(process.env.QA_CJK_CSS,'utf8')});await p.evaluate(()=>document.fonts.ready);}
    await statement.screenshot({path:`${out}/after-${id}-${locale}-${theme}-${width}.png`});
    if(id==='p1-f26-q10')assert.equal(await p.locator('[data-part="p1-f26-q10-c"] .part-prompt').getByRole('listitem').count(),3);
   }
   checks.push({id,locale,theme,width,...metrics});
  }
  assert.deepEqual(errors,[]);await c.close();
 }
 // Narrow width checks for all six reported cases and local display-math overflow.
 {const c=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'}),p=await c.newPage();for(const id of [...targets].filter(id=>ids.includes(id))){await p.goto(`${base}/problems/${id}/`);await p.waitForSelector('[data-study-ready=true]');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${id}: 320px overflow`);}await c.close();}
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2));console.log(`PASS ${checks.length} localized/theme/viewport question layouts; list structure, KaTeX quantities, source colon decimals and compact formula gaps`);
}finally{await browser.close();}
