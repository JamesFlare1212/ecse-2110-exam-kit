import assert from 'node:assert/strict';

const storageKey = 'ecse2100-fieldnotes-v1';

/** Check the root at the swap itself, before rerun scripts can conceal a theme flash. */
export async function checkThemeNavigation(browser, base, record) {
  const scenarios = [
    { name: 'Desktop dark preference with a light system', theme: 'dark', colorScheme: 'light', dark: true },
    { name: 'Desktop light preference with a dark system', theme: 'light', colorScheme: 'dark', dark: false },
    { name: 'Desktop system theme and appearance changes', theme: 'system', colorScheme: 'dark', dark: true },
    { name: 'Phone dark preference', theme: 'dark', colorScheme: 'light', dark: true, phone: true },
  ];
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: scenario.phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      colorScheme: scenario.colorScheme,
      reducedMotion: 'reduce',
    });
    try {
      await context.addInitScript(({ key, theme }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, locale: 'zh', theme }));
      }, { key: storageKey, theme: scenario.theme });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const selected = id => page.waitForFunction(id =>
        document.querySelector('[data-study-ready="true"]')?.getAttribute('data-problem') === id, id);
      async function appearance(dark) {
        await page.waitForFunction(dark => document.documentElement.classList.contains('dark') === dark
          && document.documentElement.style.colorScheme === (dark ? 'dark' : 'light'), dark);
        assert.equal(await page.getByRole('button', { name: dark ? '切换浅色主题' : '切换深色主题', exact: true }).count(), 1);
        await page.waitForFunction(dark => {
          const src = document.querySelector('.figure-image img')?.getAttribute('src');
          return src?.endsWith('.svg') && src.endsWith('-dark.svg') === dark;
        }, dark);
      }
      await page.goto(`${base}/problems/e2-s26-q3/`);
      await selected('e2-s26-q3');
      await appearance(scenario.dark);
      if (scenario.theme === 'system') {
        await page.emulateMedia({ colorScheme: 'light' });
        await appearance(false);
        await page.emulateMedia({ colorScheme: 'dark' });
        await appearance(true);
      }
      await page.evaluate(() => {
        window.__fieldnotesThemeSwaps = [];
        document.addEventListener('astro:after-swap', () => {
          window.__fieldnotesThemeSwaps.push({ dark: document.documentElement.classList.contains('dark'), scheme: document.documentElement.style.colorScheme });
        });
      });
      if (scenario.phone) {
        await page.getByRole('button', { name: '打开试卷导航', exact: true }).click();
        await page.getByRole('dialog').locator('a.question-link[href="/problems/e2-s26-q4/"]').click();
      } else {
        await page.locator('a.question-link[href="/problems/e2-s26-q4/"]').click();
      }
      await selected('e2-s26-q4');
      await appearance(scenario.dark);
      await page.goBack(); await selected('e2-s26-q3'); await appearance(scenario.dark);
      await page.goForward(); await selected('e2-s26-q4'); await appearance(scenario.dark);
      const swaps = await page.evaluate(() => window.__fieldnotesThemeSwaps);
      assert.equal(swaps.length, 3, `${scenario.name}: each navigation uses the client router`);
      assert.deepEqual(swaps, Array.from({ length: 3 }, () => ({ dark: scenario.dark, scheme: scenario.dark ? 'dark' : 'light' })),
        `${scenario.name}: theme must already be correct at astro:after-swap`);
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).theme, storageKey), scenario.theme);
      await page.reload(); await selected('e2-s26-q4'); await appearance(scenario.dark);
      assert.deepEqual(errors, []);
      record(`${scenario.name} survives question navigation, history and reload without a light-theme swap`);
    } finally {
      await context.close();
    }
  }
}
