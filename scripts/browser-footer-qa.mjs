// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs bun scripts/browser-footer-qa.mjs
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173';
const output = process.env.QA_FOOTER_ARTIFACTS ?? 'artifacts/footer';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const results = [];
async function geometry(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.evaluate(() => {
    const footer = document.querySelector('.reading-footer');
    const main = document.querySelector('.main-content');
    const rect = footer.getBoundingClientRect();
    const content = document.querySelector('.problem-tabs').getBoundingClientRect();
    return {bottom: rect.bottom + scrollY, top: rect.top + scrollY,
      contentBottom: content.bottom + scrollY, height: innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      padding: parseFloat(getComputedStyle(main).paddingBottom),
      position: getComputedStyle(footer).position,
      overflow: document.documentElement.scrollWidth > innerWidth};
  });
}
async function checkShort(page) {
  const state = await geometry(page);
  assert.equal(state.position, 'static', 'The footer stays in ordinary document flow');
  assert.ok(Math.abs(state.bottom + state.padding - state.height) < 1, 'Short-page footer sits at the viewport bottom with the reader inset');
  assert.ok(state.top >= state.contentBottom - .5, 'The footer never covers content');
  assert.equal(state.documentHeight, state.height, 'A short page does not gain artificial scrolling');
  assert.equal(state.overflow, false);
  return state;
}
try {
  for (const locale of ['zh', 'en']) for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 2400}, reducedMotion: 'reduce'});
    await context.addInitScript(({key, locale, theme}) => localStorage.setItem(key, JSON.stringify({version: 1, locale, theme})),
      {key: course.storageKey, locale, theme});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${base}/problems/p2-f26-q2/`, {waitUntil: 'domcontentloaded'});
      await page.waitForSelector('[data-study-ready=true]');
      await page.evaluate(() => document.fonts.ready);
      const collapsed = await checkShort(page);
      const toggle = page.locator('.solution-section-heading button');
      await toggle.click();
      await page.waitForFunction(() => document.querySelector('.solution-section-heading button').getAttribute('aria-expanded') === 'true');
      await page.setViewportSize({width, height: 900});
      const expanded = await geometry(page);
      assert.ok(expanded.top > expanded.height, 'Expanded solutions push the footer below the viewport');
      assert.ok(expanded.top >= expanded.contentBottom - .5, 'Expanded solutions remain above the footer');
      assert.ok(Math.abs(expanded.bottom + expanded.padding - expanded.documentHeight) < 1);
      assert.equal(expanded.position, 'static');
      await page.locator('.reading-footer').scrollIntoViewIfNeeded();
      await page.screenshot({path: `${output}/${locale}-${theme}-${width}-expanded.png`});
      await toggle.click();
      await page.setViewportSize({width, height: 2400});
      await page.evaluate(() => scrollTo(0, 0));
      await checkShort(page);
      if (width > 800) {
        for (const side of ['navigation', 'references']) {
          await page.locator(`[data-sidebar-toggle=${side}]`).click();
          await checkShort(page);
          await page.locator(`[data-sidebar-toggle=${side}]`).click();
          await checkShort(page);
        }
      }
      await page.getByRole('tab', {name: locale === 'zh' ? '试卷原页' : 'Source pages', exact: true}).click();
      const source = await geometry(page);
      assert.ok(source.top >= source.contentBottom - .5, 'Source pages push the footer after all page images');
      await page.getByRole('tab', {name: locale === 'zh' ? '题目与推导' : 'Problem & solution', exact: true}).click();
      await checkShort(page);
      await page.screenshot({path: `${output}/${locale}-${theme}-${width}-collapsed.png`});
      await page.setViewportSize({width: width === 390 ? 1440 : 390, height: 2400});
      await checkShort(page);
      await page.emulateMedia({media: 'print'});
      assert.equal(await page.locator('.workspace').evaluate(node => getComputedStyle(node).minHeight), '0px');
      assert.equal(await page.locator('.reading-footer').evaluate(node => getComputedStyle(node).marginTop), '0px');
      assert.deepEqual(errors, []);
      results.push({locale, theme, width, collapsed, expanded});
    } finally { await context.close(); }
  }
  await writeFile(`${output}/report.json`, JSON.stringify({passed: true, results}, null, 2));
  console.log(`Verified dynamic footers in ${results.length} locale/theme/desktop-phone cases: collapse/expand, resize, sidebars, source tabs and print.`);
} finally { await browser.close(); }
