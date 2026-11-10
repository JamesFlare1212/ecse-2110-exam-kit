// Initial focus follows the printed part, not a component-wide four-probe preset.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';
const entries=exams.flatMap(exam=>exam.problems.flatMap(problem=>problem.parts.filter(part=>part.interaction).map(part=>({problem:problem.id,part:part.id,...part.interaction}))));
if(!entries.length){console.log('SKIP: no converter interactions mounted');process.exit(0);}
const requested={
 'p2-f26-q3-a':['i0'],
 'p2-f26-q4-a':['i0','v0','is1','is2','id1','id2','i','vs1'],
 'p2-f26-q5-biv':['v','i','v0','i0'],
 'p2-f26-q6-a':['v','i','v0','i0'],
};
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base=process.env.QA_URL||'http://127.0.0.1:4173',out=process.env.QA_DEFAULTS_ARTIFACTS||'artifacts/converter-defaults';
const fontCSS=process.env.QA_CJK_CSS?await readFile(process.env.QA_CJK_CSS,'utf8'):'';
const checks=[];await mkdir(out,{recursive:true});
async function selection(widget,expected){
 const rows=widget.locator('.conduction-wave-row'),keys=await rows.evaluateAll(nodes=>nodes.filter(node=>node.getAttribute('aria-pressed')==='true').map(node=>node.dataset.signal));
 assert.deepEqual(keys.sort(),[...expected].sort());
 assert.equal((await widget.locator('.conduction-count').textContent()).trim(),`${expected.length} / ${await rows.count()}`);
 const visible=await widget.locator('.conduction-measurement:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.signal));assert.deepEqual(visible.sort(),[...expected].sort());
 assert.equal(await widget.getAttribute('data-playing'),'false');
}
async function open(page,entry){
 await page.waitForSelector(`[data-problem="${entry.problem}"][data-study-ready=true]`);await page.locator(`[data-part="${entry.part}"] .part-trigger`).click();await page.waitForSelector('[data-interaction][data-ready=true]');return page.locator('[data-interaction]');
}
try{
 for(const entry of entries)for(const locale of ['en','zh'])for(const theme of ['light','dark'])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'reduce'});
  try{
   await context.addInitScript(({key,locale,theme,part})=>localStorage.setItem(key,JSON.stringify({version:1,locale,theme,notes:{[part]:'preserved'},sidebars:{navigation:false,references:false}})),{key:course.storageKey,locale,theme,part:entry.part});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`${base}/problems/${entry.problem}/`);const widget=await open(page,entry),expected=requested[entry.part]||entry.defaultSignals;
   if(locale==='zh'&&fontCSS)await page.addStyleTag({content:fontCSS});await page.evaluate(()=>document.fonts.ready);
   assert.deepEqual([...entry.defaultSignals].sort(),[...expected].sort());await selection(widget,expected);
   const count=await widget.locator('.conduction-wave-row').count(),traces=await widget.locator('.wave-reference').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d')));
   await widget.screenshot({path:`${out}/${entry.problem}-${locale}-${theme}-${width}.png`});
   // Gray rows remain present and revealable; turning a requested row off is local state.
   const key=expected[0];await widget.locator(`.conduction-wave-row[data-signal=${key}]`).click();await selection(widget,expected.filter(value=>value!==key));
   assert.equal(await widget.locator('.conduction-wave-row').count(),count);assert.deepEqual(await widget.locator('.wave-reference').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d'))),traces);
   const language=page.getByRole('button',{name:locale==='en'?'切换为中文':'Switch to English',exact:true});await language.click();await page.waitForSelector('[data-interaction][data-ready=true]');await selection(widget,expected.filter(value=>value!==key));
   const nextLocale=locale==='en'?'zh':'en',themeButton=page.getByRole('button',{name:nextLocale==='zh'?(theme==='light'?'切换深色主题':'切换浅色主题'):(theme==='light'?'Switch to dark mode':'Switch to light mode'),exact:true});await themeButton.click();await page.waitForSelector('[data-interaction][data-ready=true]');await selection(widget,expected.filter(value=>value!==key));
   await widget.locator(`.conduction-wave-row[data-signal=${key}]`).click();await selection(widget,expected);
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),course.storageKey);assert.equal(saved.notes[entry.part],'preserved');assert.equal(saved.defaultSignals,undefined,'Transient probe selection never becomes a progress preference');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);checks.push({part:entry.part,locale,theme,width,defaultSignals:expected,manualTogglePreserved:true,languageThemePreserved:true,legacyRecordsPreserved:true});
  }finally{await context.close();}
 }
 // Native Astro navigation between different questions cannot leak the old focus preset.
 {const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  try{
   await context.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,locale:'en',theme:'light',sidebars:{navigation:true,references:false}})),course.storageKey);
   const page=await context.newPage();await page.goto(`${base}/problems/${entries[0].problem}/`);
   for(const [index,entry]of entries.entries()){
    if(index)await page.locator(`a[href="/problems/${entry.problem}/"]`).first().click();
    const widget=await open(page,entry);await selection(widget,requested[entry.part]||entry.defaultSignals);await widget.locator('.conduction-wave-row').first().click();
   }
   checks.push({nativeNavigation:true,questionPresetsIsolated:true});
  }finally{await context.close();}
 }
 await writeFile(`${out}/report.json`,JSON.stringify({checks},null,2)+'\n');console.log(`PASS ${checks.length} question-focused default selections, toggles, language/theme and native-navigation cases`);
}finally{await browser.close();}
