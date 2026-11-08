import {expect, test} from 'bun:test';
import {statSync} from 'node:fs';
import {criticalFontInlineLimit} from '../scripts/font-assets';

const fonts='node_modules/katex/dist/fonts/';

test('only the two critical WOFF2 formula faces are explicitly embedded', () => {
  for(const name of ['Main-Regular','Math-Italic']) {
    expect(criticalFontInlineLimit(`/project/${fonts}KaTeX_${name}.woff2`)).toBe(true);
    expect(criticalFontInlineLimit(`C:\\project\\${fonts.replaceAll('/','\\')}KaTeX_${name}.woff2`)).toBe(true);
  }
});

test('other font families, formats and paper assets retain Vite defaults', () => {
  for(const path of [
    `${fonts}KaTeX_Main-Regular.woff`,`${fonts}KaTeX_Main-Regular.ttf`,
    `${fonts}KaTeX_Main-Bold.woff2`,`${fonts}KaTeX_AMS-Regular.woff2`,
    'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    'node_modules/@fontsource-variable/noto-sans-sc/files/noto-sans-sc-chinese-simplified-wght-normal.woff2',
    'content/en/exam1_f00/assets/KaTeX_Main-Regular.woff2',
    'content/en/exam1_f00/assets/figures/e1-f00-q1.svg',
  ])expect(criticalFontInlineLimit(path)).toBeUndefined();
});

test('critical formula faces stay below the explicit 50 KiB embedded-font budget', () => {
  const bytes=['Main-Regular','Math-Italic'].reduce((sum,name)=>sum+statSync(`${fonts}KaTeX_${name}.woff2`).size,0);
  expect(bytes).toBeLessThan(50*1024);
});
