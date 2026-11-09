import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {breadcrumbLayout, type BreadcrumbWidths} from '../src/lib/breadcrumb-layout';

const widths: BreadcrumbWidths = {course:104, courseIcon:44, group:80, paper:200, current:35, path:32, separator:14, gap:4};

describe('Content-aware breadcrumb fitting', () => {
  test('uses all available space before progressively hiding context', () => {
    expect(breadcrumbLayout(500, widths)).toBe('full');
    expect(breadcrumbLayout(365, widths)).toBe('full');
    expect(breadcrumbLayout(364.5, widths)).toBe('icon');
    expect(breadcrumbLayout(305, widths)).toBe('icon');
    expect(breadcrumbLayout(304.5, widths)).toBe('partial');
    expect(breadcrumbLayout(191, widths)).toBe('partial');
    expect(breadcrumbLayout(190.5, widths)).toBe('compact');
  });

  test('short labels and locale changes determine thresholds, not a viewport breakpoint', () => {
    expect(breadcrumbLayout(330, {...widths, paper:40})).toBe('full');
    expect(breadcrumbLayout(330, widths)).toBe('icon');
    expect(breadcrumbLayout(330, {...widths, group:160})).toBe('partial');
    expect(breadcrumbLayout(370, widths)).toBe('full');
    expect(breadcrumbLayout(370, {...widths, course:200})).toBe('icon');
    expect(breadcrumbLayout(400, {...widths, gap:12})).toBe('icon');
  });

  test('growing available space never hides more context and fractional sizes remain stable', () => {
    const rank = {compact:0, partial:1, icon:2, full:3};
    let previous = 0;
    for (let available=0; available<=1000; available+=0.25) {
      const current = rank[breadcrumbLayout(available, widths)];
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
    for (const available of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(breadcrumbLayout(available, widths)).toBe('compact');
  });

  test('measurement follows allocated width and natural labels without duplicate interactive semantics', () => {
    const source = readFileSync('src/lib/components/StudyBreadcrumb.svelte', 'utf8');
    expect(source).toContain('observer.observe(root);observer.observe(measurements!)');
    expect(source).toContain('aria-hidden="true" inert');
    expect(source).not.toContain('--collapsed-path');
    const samples = source.slice(source.indexOf('<div class="breadcrumb-measurements"'));
    expect(samples).not.toMatch(/<a\b|<button\b|<Breadcrumb\.Page\b|aria-current|\bid=/);
    expect(source).toContain('if(!hiddenMenu&&!hiddenFocus)return;');
  });
});
