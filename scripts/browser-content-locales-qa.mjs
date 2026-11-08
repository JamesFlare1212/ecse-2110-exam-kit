import assert from 'node:assert/strict';

/** Both reading widths must load the chosen language's own physical paper assets. */
export async function checkContentLocales(browser, base, record) {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/problems/e2-s26-q3/`);
      await page.waitForFunction(() => document.querySelector('[data-study-ready="true"]'));
      for (const locale of ['zh-cn', 'en', 'zh-cn']) {
        const english = locale === 'en';
        if ((await page.locator('html').getAttribute('lang') === 'en') !== english) {
          await page.getByRole('button', { name: english ? 'Switch to English' : '切换为中文', exact: true }).click();
        }
        const prefix = `/papers/${locale}/exam2_s26/`;
        await page.getByRole('tab', { name: english ? 'Problem & solution' : '题目与推导', exact: true }).click();
        await page.getByRole('radio', { name: english ? 'Recreated SVG' : '矢量复刻', exact: true }).first().click();
        await page.waitForFunction(prefix => document.querySelector('.figure-image img')?.getAttribute('src')?.startsWith(prefix + 'figures/'), prefix);
        await page.getByRole('radio', { name: english ? 'Original' : '原始插图', exact: true }).first().click();
        assert.ok((await page.locator('.figure-image img').first().getAttribute('src')).startsWith(prefix + 'original-figures/'));
        await page.getByRole('tab', { name: english ? 'Source pages' : '试卷原页', exact: true }).click();
        assert.ok((await page.locator('.original-page-card img').first().getAttribute('src')).startsWith(prefix + 'pages/'));
        await page.getByRole('button', { name: english ? /^Inspect page \d+$/ : /^放大查看第 \d+ 页$/ }).first().click();
        const dialog = page.locator('.source-dialog');
        await dialog.waitFor();
        assert.ok((await dialog.locator('.source-paper img').getAttribute('src')).startsWith(prefix + 'pages/'));
        assert.ok((await dialog.locator('a[download]').getAttribute('href')).startsWith(prefix + 'sources/'));
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      record(`${width}px language switching uses separate SVG, crop, PDF page and download copies`);
    } finally { await context.close(); }
  }
}
