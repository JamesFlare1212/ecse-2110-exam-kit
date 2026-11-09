import {expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {course, pageTitle, parseCourseConfig} from '../content/course';

const raw = JSON.parse(readFileSync('content/course.json', 'utf8'));

test('Flux is configured once for the course and every localized page title', () => {
  expect(course.brand).toBe('Flux');
  expect(pageTitle('半控桥与续流')).toBe('半控桥与续流 · Flux · ECSE 2110');
  expect(pageTitle('Half-controlled bridge')).toBe('Half-controlled bridge · Flux · ECSE 2110');
  const renamed = parseCourseConfig({...raw, brand: 'Another workspace'});
  expect(pageTitle('A problem', renamed)).toBe('A problem · Another workspace · ECSE 2110');
});

test('a display rename preserves saved records and older course configurations', () => {
  expect(course.storageKey).toBe('ecse2110-fieldnotes-v1');
  const {brand: _, ...legacy} = raw;
  const original = parseCourseConfig(legacy);
  expect(original.brand).toBe('Fieldnotes');
  const {brand: oldBrand, ...before} = original;
  const {brand: newBrand, ...after} = course;
  expect(before).toEqual(after);
  expect(oldBrand).not.toBe(newBrand);
});

test('brand configuration stays plain text and strict without weakening the course schema', () => {
  for (const brand of ['', '  ', '<script>bad</script>', 'two\nlines', 3, null])
    expect(() => parseCourseConfig({...raw, brand})).toThrow('brand must be plain nonempty text');
  expect(() => parseCourseConfig({...raw, brnad: 'Typo'})).toThrow('course must contain exactly');
});

test('navigation and browser favicon share one local, theme-aware magnetic-flux mark', () => {
  const navigation = readFileSync('src/lib/components/Navigation.svelte', 'utf8');
  const base = readFileSync('src/layouts/Base.astro', 'utf8');
  const icon = readFileSync('src/lib/assets/favicon.svg', 'utf8');
  expect(navigation).toContain("'#lib/assets/favicon.svg?raw'");
  expect(base).toContain("'#lib/assets/favicon.svg'");
  expect(icon).toContain('viewBox="0 0 40 40"');
  expect(icon).toContain('var(--primary, #ad5030)');
  expect(icon).toContain('var(--primary-foreground, #ffffff)');
  expect(icon).toContain('<ellipse');
  expect(icon).not.toMatch(/<(?:script|image|foreignObject)\b/);
  expect(navigation).toContain('{course.title[study.locale]}');
  expect(navigation).not.toContain('toUpperCase()');
  expect(navigation).not.toContain('Fieldnotes');
  expect(readFileSync('src/lib/components/StudyDesk.svelte', 'utf8')).toContain('<footer class="reading-footer"><span>{course.brand}</span>');
  expect(readFileSync('src/lib/components/ErrorPage.svelte', 'utf8')).toContain('{status} · {course.brand}');
});
