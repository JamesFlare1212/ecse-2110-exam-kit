import assert from 'node:assert/strict';

const storageKey = 'ecse2100-fieldnotes-v1';

/** Exercise startup before hydration, plus localized normal and error-page flows. */
export async function checkI18n(browser, base, record) {
  for (const failScripts of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    try {
      await context.addInitScript(key => {
        if(location.protocol==='http:')localStorage.setItem(key, JSON.stringify({ version: 1, locale: 'en' }));
      }, storageKey);
      await context.route('**/*', async route => {
        if (route.request().resourceType() === 'script') {
          await gate;
          if (failScripts) return route.abort();
        }
        await route.continue();
      });
      const page = await context.newPage();
      await page.goto(`${base}/problems/e1-f26-q1/`, { waitUntil: 'commit' });
      await page.waitForFunction(() => document.getElementById('problem-title'));
      assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).visibility), 'visible');
      assert.ok(await page.locator('#problem-title').isVisible());
      assert.ok(await page.locator('[data-original-statement]').isVisible());
      assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
      // Static questions stay readable while the saved language awaits hydration.
      await page.waitForTimeout(3200);
      assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).visibility), 'visible');
      assert.ok(await page.locator('#problem-title').isVisible());
      release();
      if (!failScripts) await page.waitForFunction(() => document.querySelector('[data-study-ready="true"]'));
      assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).visibility), 'visible');
      assert.equal(await page.locator('html').getAttribute('lang'), failScripts ? 'zh-CN' : 'en');
      assert.equal(await page.locator('#problem-title').textContent(), failScripts ? '传输线基础' : 'Transmission Line Fundamentals');
      record(failScripts ? 'Failed application scripts preserve readable static Chinese with the correct document language'
        : 'Static questions remain readable until hydration applies saved English');
    } finally {
      release();
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/problems/e1-f26-q1/`);
    await page.waitForFunction(() => document.querySelector('[data-study-ready="true"]'));
    assert.equal(await page.locator('.problem-kicker').textContent(), '题目 01');
    assert.ok((await page.locator('.course-eyebrow').textContent()).includes('学习桌'));
    assert.equal(await page.locator('.resource-label').textContent(), '学习资料');
    assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).includes('份历年试卷'));
    assert.equal(await page.getByText('原题措辞', { exact: true }).count(), 1);
    await page.getByRole('tab', { name: '试卷原页', exact: true }).click();
    const alts = await page.locator('.original-page-card img').evaluateAll(images => images.map(img => img.alt));
    assert.ok(alts.every(alt => /秋季 2026 · 第 \d+ 页$/.test(alt)));
    await page.getByRole('button', { name: /^放大查看第 \d+ 页$/ }).first().click();
    assert.match(await page.locator('.source-paper img').getAttribute('alt'), /，第 \d+ 页$/);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
    assert.equal(await page.locator('.problem-kicker').textContent(), 'PROBLEM 01');
    assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).includes('back exams'));
    const englishAlts = await page.locator('.original-page-card img').evaluateAll(images => images.map(img => img.alt));
    assert.ok(englishAlts.every(alt => /Fall 2026, page \d+$/.test(alt)));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-study-ready="true"]'));
    assert.equal(await page.locator('#problem-title').textContent(), 'Transmission Line Fundamentals');
    await page.setViewportSize({ width: 375, height: 812 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Open exam navigation', exact: true }).click();
    assert.equal(await page.getByRole('dialog').locator('.resource-label').textContent(), 'YOUR RESOURCES');
    await page.keyboard.press('Escape');
    record('Desktop and phone interface labels, metadata, source-image alternatives and English reload follow the global language');

    const saved = await page.evaluate(key => {
      const data = JSON.parse(localStorage.getItem(key));
      data.completed['e9-f99-q1-a'] = true;
      data.bookmarks['e1-f25-q1'] = true;
      data.notes = { 'e9-f99-q1': 'Preserved legacy record' };
      localStorage.setItem(key, JSON.stringify(data));
      return data;
    }, storageKey);
    await page.goto(`${base}/problems/e99-f99-q999/`);
    await page.getByRole('heading', { name: 'Problem not found', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).visibility), 'visible');
    await page.getByRole('button', { name: '切换为中文', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: '找不到这道题', exact: true }).count(), 1);
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).locale === 'zh', storageKey);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey), { ...saved, locale: 'zh' });
    await page.getByRole('link', { name: '返回习题室', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[data-study-ready="true"]'));
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    record('Localized static 404 fallback changes language, preserves all study records and returns to a valid problem on a phone');
  } finally { await context.close(); }
}
