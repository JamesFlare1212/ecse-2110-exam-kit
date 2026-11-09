import {expect, test} from 'bun:test';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {papers} from '../content/catalog.server';

// Audited against the original PDF pages, not the independent solution drawings.
const audited = [
  {paper: 'exam1_f26', name: 'e1-f26-q5', size: [594, 356]},
  {paper: 'exam1_s25', name: 'e1-s25-q3', size: [916, 376]},
  {paper: 'exam1_s25', name: 'e1-s25-q5', size: [526, 184]},
  {paper: 'exam1_s25', name: 'e1-s25-q6', size: [566, 316]},
  {paper: 'practice1_f26', name: 'p1-f26-q2', size: [356, 88],
    points: [79, 122, 178, 44], prompt: [0.118, 0.096, 0.766, 0.118]},
  {paper: 'practice1_f26', name: 'p1-f26-q3', size: [140, 224],
    points: [77, 133, 70, 112], prompt: [0.118, 0.096, 0.766, 0.211]},
  // The printed FIGURE P10.4 caption sits outside the circuit, not a device label.
  {paper: 'practice2_f26', name: 'p2-f26-q4', size: [318, 224],
    points: [73, 223, 159, 112], prompt: [0.117, 0.129, 0.767, 0.296]},
  {paper: 'practice2_f26', name: 'p2-f26-q6', size: [478, 328],
    points: [70, 235, 239, 164], prompt: [0.105, 0.122, 0.779, 0.38]},
];
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

function webpSize(path: string) {
  const bytes = readFileSync(path);
  expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
  expect(bytes.toString('ascii', 8, 16)).toBe('WEBPVP8 ');
  expect([...bytes.subarray(23, 26)]).toEqual([0x9d, 0x01, 0x2a]);
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

test('the original-crop audit covers every mounted original-image counterpart, including part figures', () => {
  const mounted = papers.flatMap(paper => paper.exam.problems.flatMap(q =>
    [q.figureOriginal === false ? undefined : q.figure, ...q.parts.map(p => p.questionFigure?.name)].filter(Boolean)));
  expect(mounted.sort()).toEqual(audited.map(crop => crop.name).sort());
});

test('both locales own the audited diagram-only crops, not wide question screenshots', () => {
  for (const crop of audited) {
    const paths = ['en', 'zh-cn'].map(locale => resolve('content', locale, crop.paper,
      'assets/original-figures', `${crop.name}.webp`));
    for (const path of paths) {
      expect(lstatSync(path).isSymbolicLink()).toBe(false);
      expect(webpSize(path)).toEqual(crop.size);
    }
    expect(lstatSync(paths[0]).ino).not.toBe(lstatSync(paths[1]).ino);
  }
});

test('practice crops isolate complete circuits without changing printed-prompt provenance', () => {
  for (const crop of audited) {
    if (!crop.points) continue;
    const registries = ['en', 'zh-cn'].map(locale => {
      const directory = resolve('content', locale, crop.paper);
      const path = resolve(directory, 'figure-sources.json');
      const registry = json(path);
      const source = registry.figures[crop.name];
      expect(source.region).toEqual(crop.prompt);
      const panels = registry.panels[crop.name];
      expect(panels).toHaveLength(1);
      const sizes = json(resolve(directory, 'documents.json'))[source.doc].sizes[source.page - 1];
      panels[0].forEach((value: number, index: number) => {
        expect(value).toBeGreaterThan(0);
        expect(value * sizes[index % 2]).toBeCloseTo(crop.points![index], 3);
      });
      const [x, y, width, height] = panels[0];
      expect(x + width).toBeLessThanOrEqual(1);
      expect(y + height).toBeLessThanOrEqual(1);
      const manifest = json(resolve(directory, 'assets/figures/manifest.json'));
      expect(manifest.sourceSha256[`content/${locale}/${crop.paper}/figure-sources.json`])
        .toBe(createHash('sha256').update(readFileSync(path)).digest('hex'));
      return registry;
    });
    expect(registries[0]).toEqual(registries[1]);
  }
});
