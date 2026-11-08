import {describe, expect, test} from 'bun:test';
import {maxSourceZoom, MIN_SOURCE_ZOOM, stepSourceZoom} from '../src/lib/source-zoom';
import {renderText} from '../src/lib/math';

describe('Responsive source reading', () => {
  test('narrow readers can reach native source detail while desktops retain the existing range', () => {
    expect(maxSourceZoom(242, 1100)).toBe(580);
    expect(maxSourceZoom(312, 1100)).toBe(460);
    expect(maxSourceZoom(900, 1100)).toBe(200);
    expect(242 * maxSourceZoom(242, 1100) / 100).toBeGreaterThanOrEqual(1375);
    expect(maxSourceZoom(100, 1100)).toBe(800);
  });
  test('unmeasured readers and invalid source sizes have bounded fallbacks', () => {
    expect(maxSourceZoom(0)).toBe(200);
    expect(maxSourceZoom(Number.NaN)).toBe(200);
    expect(maxSourceZoom(242, 0)).toBe(maxSourceZoom(242));
  });
  test('zoom keeps fine steps at page-fit, larger steps for close reading, and clamps endpoints', () => {
    expect(stepSourceZoom(100, 1, 580)).toBe(120);
    expect(stepSourceZoom(200, 1, 580)).toBe(250);
    expect(stepSourceZoom(550, 1, 580)).toBe(580);
    expect(stepSourceZoom(580, 1, 580)).toBe(580);
    expect(stepSourceZoom(230, -1, 580)).toBe(200);
    expect(stepSourceZoom(200, -1, 580)).toBe(180);
    expect(stepSourceZoom(80, -1, 580)).toBe(MIN_SOURCE_ZOOM);
  });
});

describe('Inline math punctuation', () => {
  test('closing Chinese and English punctuation stays with inline math without altering its TeX', () => {
    const html = renderText('固定 $\\rho_0$。');
    expect(html).toContain('class="math-with-punctuation"');
    expect(html.endsWith('。</span>')).toBe(true);
    expect(html).toContain('\\rho_0');
    expect(renderText('$x$, then continue.')).toContain(',</span> then continue.');
  });
  test('ordinary words, display equations and code do not acquire punctuation glue', () => {
    for (const source of ['$x$ and $y$', '$$\nx=1\n$$\n\nNext.', '`$x$。`'])
      expect(renderText(source)).not.toContain('math-with-punctuation');
    expect(renderText('$x$。<script>alert(1)</script>')).not.toContain('<script>');
  });
});
