// Optional: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs bun scripts/browser-original-crops-qa.mjs
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {papers} from '../content/catalog.server.ts';
import {course} from '../content/course.ts';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.env.QA_BASE ?? 'http://127.0.0.1:4173';
const output = process.env.QA_ORIGINAL_CROP_ARTIFACTS ?? 'artifacts/original-crops';
const samples = papers.flatMap(paper => paper.exam.problems.flatMap(question =>
  [question.figure, ...question.parts.map(part => part.questionFigure?.name)].filter(Boolean)
    .map(name => ({paper, question, name}))));
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const results = [];
try {
  for (const locale of ['en', 'zh']) for (const theme of ['light', 'dark']) for (const width of [390, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    await context.addInitScript(({key, locale, theme}) =>
      localStorage.setItem(key, JSON.stringify({version: 1, locale, theme})),
    {key: course.storageKey, locale, theme});
    try {
      for (const {paper, question, name} of samples) {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
          await page.goto(`${base}/problems/${question.id}/`, {waitUntil: 'domcontentloaded'});
          await page.waitForSelector('[data-study-ready=true]');
          await page.evaluate(() => document.fonts.ready);
          const figure = page.locator(`[data-figure="${name}"]`);
          // Part-specific printed figures may be inside a collapsed part.
          if (!await figure.isVisible()) {
            const part = question.parts.find(part => part.questionFigure?.name === name);
            assert.ok(part, 'A hidden question figure must belong to a part');
            await page.locator(`#${part.id} [data-slot=accordion-trigger]`).click();
          }
          await figure.scrollIntoViewIfNeeded();
          const image = figure.locator('.figure-image img');
          await image.evaluate(image => image.decode());
          const before = await figure.boundingBox();
          await figure.getByRole('radio').nth(1).click();
          await page.waitForFunction(name => {
            const image = document.querySelector(`[data-figure="${name}"] .figure-image img`);
            return image?.src.includes('/original-figures/') && image.complete && image.naturalWidth > 0;
          }, name);
          const original = await image.getAttribute('src');
          assert.equal(original, `${paper.assetBase[locale]}/original-figures/${name}.webp`);
          const bytes = await readFile(resolve(paper.directories[locale], 'assets/original-figures', `${name}.webp`));
          const expectedSize = [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
          assert.deepEqual(await image.evaluate(image => [image.naturalWidth, image.naturalHeight]), expectedSize);
          const after = await figure.boundingBox();
          assert.ok(Math.abs(after.height - before.height) < .5, 'Original switching preserves the drawing height');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No page-wide overflow');
          assert.equal(await figure.locator('.original-figure').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
          await figure.screenshot({path: `${output}/${name}-${locale}-${theme}-${width}.png`});
          await figure.getByRole('button', {name: locale === 'zh' ? '放大图示' : 'Enlarge figure', exact: true}).click();
          const enlarged = page.locator('.figure-enlarged img');
          await enlarged.evaluate(image => image.decode());
          assert.equal(await enlarged.getAttribute('src'), original, 'Enlargement keeps the selected diagram-only crop');
          await page.keyboard.press('Escape');
          assert.deepEqual(errors, []);
          results.push({name, locale, theme, width, originalSize: expectedSize, height: after.height});
        } finally { await page.close(); }
      }
    } finally { await context.close(); }
  }
  await writeFile(`${output}/report.json`, JSON.stringify({passed: true, results}, null, 2));
  console.log(`Verified ${samples.length} original question figures in ${results.length} locale/theme/viewport cases.`);
} finally { await browser.close(); }
