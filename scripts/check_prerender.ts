/** Validate Astro's deliverable HTML and isolated per-page island data. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { problemEntries } from '../src/lib/catalog.server';
import { DEFAULT_PROBLEM_ID, problemPath } from '../src/lib/problem-navigation';
import { renderText } from '../src/lib/math';

const root = resolve(import.meta.dir, '..', 'build');
assert.ok(readFileSync(resolve(root, '404.html'), 'utf8').includes('startup-status'), 'readable static error fallback');
const ids = problemEntries.map(({ problem }) => problem.id).sort();
assert.deepEqual(readdirSync(resolve(root, 'problems')).sort(), ids);
const defaultId = problemEntries.find(entry => entry.problem.id === DEFAULT_PROBLEM_ID)?.problem.id ?? problemEntries[0].problem.id;
assert.ok(readFileSync(resolve(root, 'index.html'), 'utf8').includes(problemPath(defaultId)));

let parts = 0;
for (const { problem } of problemEntries) {
  const directory = resolve(root, 'problems', problem.id);
  const html = readFileSync(resolve(directory, 'index.html'), 'utf8');
  const fontPreloads = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => tag)
    .filter(tag => /rel="preload"/.test(tag) && /as="font"/.test(tag))
    .map(tag => /href="([^"]+)"/.exec(tag)![1]);
  assert.ok(fontPreloads.every(href => href.startsWith('/_astro/') && !href.includes('noto-sans-sc')),
    `${problem.id}: only small local reading fonts may be preloaded`);
  const fontBytes = fontPreloads.reduce((sum, href) => sum + statSync(resolve(root, '.' + href)).size, 0);
  assert.ok(fontBytes <= 64 * 1024, `${problem.id}: font preload budget exceeded (${fontBytes} bytes)`);
  const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  assert.ok(document.includes(`data-problem="${problem.id}"`), `${problem.id}: page identity`);
  assert.ok(document.includes(`>${problem.title.zh}</h1>`), `${problem.id}: prerendered title`);
  assert.ok(document.includes(renderText(problem.statement.zh)), `${problem.id}: prerendered statement`);
  for (const part of problem.parts) {
    assert.ok(document.includes(renderText(part.prompt.zh)), `${part.id}: prerendered question`);
    parts++;
  }

  const islands = [...html.matchAll(/<astro-island\b[^>]*\bprops="([^"]+)"/g)];
  assert.equal(islands.length, 1, `${problem.id}: one connected study island`);
  const encoded = islands[0][1].replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  // Astro tags serialized values: 0 = object/scalar, 1 = array. Our page
  // data is intentionally plain JSON, with no executable values or classes.
  function revive(value: unknown): unknown {
    assert.ok(Array.isArray(value), 'Astro value must have a type tag');
    const [type, raw] = value;
    if (type === 1) return raw.map(revive);
    assert.equal(type, 0, `Unexpected serialized data type ${type}`);
    if (raw && typeof raw === 'object') return Object.fromEntries(Object.entries(raw).map(([key, entry]) => [key, revive(entry)]));
    return raw;
  }
  const payload = JSON.parse(encoded);
  const data = revive(payload.data) as import('../content/types').StudyPageData;
  assert.deepEqual(data.problem, problem, `${problem.id}: lossless hydration data`);
  assert.ok(!('problems' in data.exam), `${problem.id}: exam metadata excludes other solutions`);
  for (const exam of data.examIndex) for (const question of exam.problems) {
    assert.ok(!('guide' in question), `${problem.id}: index excludes guides`);
    for (const part of question.parts) assert.ok(!('solution' in part), `${problem.id}: index excludes solutions`);
  }
}
console.log(`Prerender verified: ${ids.length} problem HTML pages, ${parts} question parts, isolated page data.`);
