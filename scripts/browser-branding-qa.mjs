// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs bun scripts/browser-branding-qa.mjs
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {papers} from '../content/catalog.server.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173';
const output = process.env.QA_BRAND_ARTIFACTS ?? 'artifacts/branding';
const sample = papers.flatMap(paper => paper.exam.problems).find(q => q.id !== course.defaultProblemId);
const part = sample.parts[0].id;
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const results = [];
try {
  for (const locale of ['zh', 'en']) for (const theme of ['light', 'dark']) for (const width of [320, 390, 1024, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    await context.addInitScript(({key, locale, theme, part, problem}) => localStorage.setItem(key, JSON.stringify({
      version: 1, locale, theme, completed: {[part]: true}, bookmarks: {[problem]: true},
    })), {key: course.storageKey, locale, theme, part, problem: sample.id});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${base}/problems/${sample.id}/`, {waitUntil: 'domcontentloaded'});
      await page.waitForSelector('[data-study-ready=true]');
      await page.evaluate(() => document.fonts.ready);
      assert.ok((await page.title()).includes(` · ${course.brand} · ${course.code}`));
      assert.equal(await page.locator('.reading-footer > span').textContent(), course.brand);
      const compact = width <= 800;
      const toggle = page.locator('[data-sidebar-toggle=navigation]');
      if (compact) await toggle.click();
      const panel = page.locator(compact ? '#mobile-exam-navigation' : '#exam-navigation');
      const brand = panel.locator('.brand');
      await brand.waitFor({state: 'visible'});
      assert.equal(await brand.locator('strong').textContent(), course.brand);
      assert.equal(await brand.locator('.brand-course-code').textContent(), course.code);
      assert.equal(await brand.locator('.brand-course-title').textContent(), course.title[locale]);
      assert.equal(await brand.getAttribute('href'), `/problems/${course.defaultProblemId}/`);
      const layout = await brand.evaluate(brand => {
        const mark = brand.querySelector('.brand-mark').getBoundingClientRect();
        const title = brand.querySelector('.brand-course-title');
        const bounds = brand.getBoundingClientRect();
        const texts = [...brand.querySelectorAll('strong,.brand-course-code,.brand-course-title')].flatMap(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          return [...range.getClientRects()].map(r => ({left: r.left, right: r.right, top: r.top, bottom: r.bottom}));
        });
        return {brandWidth: bounds.width, brandHeight: bounds.height, mark: [mark.width, mark.height],
          font: parseFloat(getComputedStyle(title).fontSize), whiteSpace: getComputedStyle(title).whiteSpace,
          fits: texts.every(r => r.left >= bounds.left && r.right <= bounds.right + .5 && r.top >= bounds.top && r.bottom <= bounds.bottom + .5),
          scrolls: brand.scrollWidth > brand.clientWidth};
      });
      assert.deepEqual(layout.mark, [36, 36], 'The logo must remain square, never flex-shrink');
      assert.ok(layout.font >= 12, 'Localized course titles stay at a readable metadata size');
      assert.notEqual(layout.whiteSpace, 'nowrap');
      assert.ok(layout.fits && !layout.scrolls, 'All brand text fits without clipping');
      if (compact) {
        assert.ok(await panel.evaluate(panel => {
          const close = panel.querySelector('[data-slot=sheet-close]').getBoundingClientRect();
          return [...panel.querySelectorAll('.brand strong,.brand-course-code,.brand-course-title')].every(node => {
            const r = node.getBoundingClientRect();
            return r.right <= close.left || r.left >= close.right || r.bottom <= close.top || r.top >= close.bottom;
          });
        }), 'The mobile close button must not overlap any branding');
      }
      await brand.screenshot({path: `${output}/${locale}-${theme}-${width}.png`});
      await brand.focus();
      assert.ok(await brand.evaluate(node => node === document.activeElement));
      await page.keyboard.press('Enter');
      await page.waitForURL(`**/problems/${course.defaultProblemId}/`);
      await page.waitForFunction(id => document.querySelector('[data-study-ready=true]')?.dataset.problem === id, course.defaultProblemId);
      if (compact) await panel.waitFor({state: 'detached'});
      const changeLocale = page.getByRole('button', {name: locale === 'zh' ? 'Switch to English' : '切换为中文', exact: true});
      await changeLocale.click();
      await page.waitForFunction(locale => document.documentElement.lang === (locale === 'zh' ? 'en' : 'zh-CN'), locale);
      if (compact) await toggle.click();
      assert.equal(await panel.locator('.brand-course-title').textContent(), course.title[locale === 'zh' ? 'en' : 'zh']);
      if (compact) await page.keyboard.press('Escape');
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), course.storageKey);
      assert.equal(saved.completed[part], true, 'Existing completion survives the display rename and navigation');
      assert.equal(saved.bookmarks[sample.id], true, 'Existing bookmarks survive');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      results.push({locale, theme, width, ...layout});
    } finally { await context.close(); }
  }
  // Error pages must use the configured name too, not the retired wordmark.
  const page = await browser.newPage();
  await page.goto(`${base}/404.html`);
  await page.waitForSelector('[data-error-ready=true]');
  assert.equal(await page.locator('[data-slot=empty-header] > p').textContent(), `404 · ${course.brand}`);
  assert.ok((await page.title()).includes(` · ${course.brand} · `));
  await page.close();
  await writeFile(`${output}/report.json`, JSON.stringify({passed: true, results}, null, 2));
  console.log(`Verified branding, readable localized course titles, home navigation and saved state in ${results.length} desktop/phone cases, plus the 404 page.`);
} finally { await browser.close(); }
