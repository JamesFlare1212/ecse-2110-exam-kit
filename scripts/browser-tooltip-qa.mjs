// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs bun scripts/browser-tooltip-qa.mjs
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {course} from '../content/course.ts';
import {exams} from '../content/catalog.server.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.QA_URL ?? 'http://127.0.0.1:4173';
const output = process.env.QA_TOOLTIP_ARTIFACTS ?? 'artifacts/tooltips';
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const results = [];
await mkdir(output, {recursive: true});
try {
  for (const locale of ['en', 'zh']) for (const theme of ['light', 'dark']) for (const width of [1440, 375]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, hasTouch: width < 500, reducedMotion: 'reduce'});
    await context.addInitScript(({key, locale, theme}) => localStorage.setItem(key, JSON.stringify({version: 1, locale, theme, sidebars: {navigation: false, references: true}})), {key: course.storageKey, locale, theme});
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    // Native exit animations can leave a closed hint visible for a frame.
    const tooltip = page.locator('[data-slot=tooltip-content]:not([data-state=closed]):visible');
    const menu = page.locator('[data-slot=dropdown-menu-content][data-state=open]');
    async function hint(trigger, expected, keyboard = false) {
      assert.equal(await trigger.getAttribute('title'), null, 'No competing browser tooltip');
      await trigger.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
      if (keyboard) {await page.keyboard.press('Tab'); await trigger.focus();}
      else await trigger.hover();
      await tooltip.waitFor({timeout: 5000}).catch(async error => {
        throw new Error(`Missing tooltip ${expected}; trigger ${await trigger.evaluate(node => node.outerHTML)}; focus ${await page.evaluate(() => document.activeElement?.outerHTML)}`, {cause: error});
      });
      assert.equal(await tooltip.count(), 1, 'The shared Provider opens only one tooltip');
      assert.equal(await tooltip.innerText(), expected);
      assert.ok((await trigger.getAttribute('aria-describedby')).split(' ').includes(await tooltip.getAttribute('id')));
      const bounds = await tooltip.boundingBox();
      assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1, 'Tooltip stays inside the viewport');
      await page.keyboard.press('Escape');
      await tooltip.waitFor({state: 'hidden'});
      await page.mouse.move(0, 0);
    }
    try {
      await page.goto(`${base}/problems/p2-f26-q4/`);
      await page.waitForSelector('[data-study-ready=true]');
      const crumb = page.locator('.study-breadcrumb');
      const path = crumb.locator('[data-breadcrumb-menu=path]');
      const collapsed = await path.isVisible();
      const trigger = collapsed ? path : crumb.locator('[data-breadcrumb-menu=questions]');
      const paper = exams.find(exam => exam.id === 'p2-f26');
      const paperLabel = [paper.term[locale], paper.year].filter(value => value !== null).join(' ');
      await hint(trigger, collapsed ? `${course.code} / Exam 2 / ${paperLabel}` : paperLabel);
      await hint(crumb.locator('[aria-current=page]'), await page.locator('#problem-title').innerText(), true);
      assert.equal(await crumb.locator('[aria-current=page]').getAttribute('data-slot'), 'breadcrumb-page');
      if (width === 1440) {
        const courseTrigger = crumb.locator('[data-breadcrumb-menu=course]');
        await hint(courseTrigger, `${course.code} · ${locale === 'zh' ? '选择考试组' : 'Choose an exam group'}`, true);
        await page.keyboard.press('Enter');
      } else await trigger.tap();
      await menu.waitFor();
      await tooltip.waitFor({state: 'hidden'});
      await page.keyboard.press('Escape');
      await menu.waitFor({state: 'hidden'});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('button button,a button,button a').count(), 0, 'Composed triggers must not nest controls');

      console.log('Checking waveform tooltips', locale, theme, width);
      await page.locator('[data-part=p2-f26-q4-a] .part-trigger').click();
      const widget = page.locator('[data-interaction=semi-converter][data-ready=true]');
      await widget.waitFor();
      const row = widget.locator('[data-signal=v].conduction-wave-row');
      assert.equal(await row.getAttribute('data-slot'), 'button');
      const reference = await row.locator('.sr-only').innerText();
      const before = await row.getAttribute('aria-pressed');
      const descriptions = (await row.getAttribute('aria-describedby')).split(' ');
      await row.scrollIntoViewIfNeeded(); await page.waitForTimeout(120);
      await page.mouse.move(0, 0); await row.hover(); await tooltip.waitFor();
      assert.equal(await tooltip.innerText(), reference);
      const described = (await row.getAttribute('aria-describedby')).split(' ');
      assert.ok(descriptions.every(id => described.includes(id)), 'Measurement and live-value descriptions survive the tooltip');
      assert.equal(await row.getAttribute('aria-pressed'), before, 'Hover never changes the selected measurement');
      await page.screenshot({path: `${output}/wave-${locale}-${theme}-${width}.png`});
      await page.keyboard.press('Escape');
      if (width < 500) await row.tap(); else await row.click();
      assert.notEqual(await row.getAttribute('aria-pressed'), before);
      await page.keyboard.press('Tab'); await row.focus(); await page.keyboard.press('Space');
      assert.equal(await row.getAttribute('aria-pressed'), before, 'Keyboard toggling is still native');
      assert.equal(await widget.getAttribute('data-angle'), '0.00');

      console.log('Checking source tooltips', locale, theme, width);
      await page.goto(`${base}/problems/e1-f26-q5/`);
      await page.waitForSelector('[data-study-ready=true]');
      if (width === 1440) {
        const source = page.locator('.reference-rail .formula-source-name').first();
        await hint(source, await source.getAttribute('aria-label'), true);
      }
      await page.locator('.solution-section-heading button').click();
      const formula = page.locator('.formula-link-inline:visible').first();
      await formula.hover();
      const preview = page.locator('[data-slot=hover-card-content]:visible');
      await preview.waitFor();
      const source = preview.locator('.formula-source-name');
      await source.hover(); await tooltip.waitFor();
      assert.equal(await tooltip.innerText(), await source.getAttribute('aria-label'));
      await preview.getByRole('button', {name: locale === 'zh' ? '打开原页并定位' : 'Locate on original page', exact: true}).click();
      const dialog = page.locator('.source-dialog'); await dialog.waitFor();
      const zoom = dialog.locator('.zoom-label');
      assert.equal(await zoom.getAttribute('data-slot'), 'button');
      await hint(zoom, locale === 'zh' ? '适合页宽' : 'Fit page width', true);
      await dialog.getByRole('button', {name: locale === 'zh' ? '放大' : 'Zoom in', exact: true}).click();
      assert.notEqual(await zoom.innerText(), '100%');
      await zoom.click(); assert.equal(await zoom.innerText(), '100%');
      assert.equal(await zoom.evaluate(node => node.getBoundingClientRect().height), 36);
      await page.screenshot({path: `${output}/source-${locale}-${theme}-${width}.png`});
      await page.keyboard.press('Escape'); await dialog.waitFor({state: 'hidden'});
      assert.equal(await page.locator('[title]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, []);
      results.push({locale, theme, width, passed: true});
      console.log('PASS native tooltip composition, focus, source metadata, zoom and measurement toggles', locale, theme, width);
    } catch (error) {
      await page.screenshot({path: `${output}/failure-${locale}-${theme}-${width}.png`});
      throw error;
    } finally {await context.close();}
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({results}, null, 2));
  await browser.close();
}
