import {expect, test} from 'bun:test';
import {includesSearch} from '../src/lib/search';
import {problemPath} from '../src/lib/problem-navigation';

test('search matches displayed math, Unicode symbols and units despite TeX spacing', () => {
  expect(includesSearch('The load is $Z_L=50\\,\\Omega$.','50 Ω')).toBe(true);
  expect(includesSearch('长度 $L=2\\,\\mathrm{m}$','2 m')).toBe(true);
  expect(includesSearch('波长 $\\lambda$','λ')).toBe(true);
  expect(includesSearch('Gauss’s law','GAUSS')).toBe(true);
  expect(includesSearch('电压 $V=12\\,\\mathrm{V}$','13 V')).toBe(false);
});

test('part destinations retain their stable IDs in shareable links', () => {
  expect(problemPath('e1-f26-q1','e1-f26-q1-ai')).toBe('/problems/e1-f26-q1/#e1-f26-q1-ai');
  expect(problemPath('e1-f26-q1')).toBe('/problems/e1-f26-q1/');
});
