import {describe, expect, test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {papers} from '../content/catalog.server';

const plots = new Set(['e1-f26-q6-phasor', 'e2-s25-q4-power-angle',
  'p2-f26-q4-waveforms', 'p2-f26-q5-waveforms', 'p2-f26-q6-waveforms']);

describe('Complete existing-diagram migration', () => {
  test('all fourteen circuits use Schemdraw and all five scientific plots retain a truthful plotting backend', () => {
    let circuits = 0, graphs = 0;
    for (const paper of papers) for (const locale of ['en', 'zh'] as const) {
      const directory = resolve(paper.directories[locale], 'assets/figures');
      const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8')) as {
        schemdraw: string; figures: string[]; sourceSha256: Record<string, string>;
        figureEngines: Record<string, {engine: string; elementCount: number}>;
      };
      expect(manifest.schemdraw).toBe('0.23');
      expect(Object.keys(manifest.figureEngines).sort()).toEqual(manifest.figures);
      for (const name of manifest.figures) {
        const engine = manifest.figureEngines[name];
        const plot = plots.has(name);
        expect(engine.engine).toBe(plot ? 'Matplotlib' : 'Schemdraw + Matplotlib');
        expect(engine.elementCount > 0).toBe(!plot);
        for (const suffix of ['', '-dark']) {
          const svg = readFileSync(resolve(directory, `${name}${suffix}.svg`), 'utf8');
          expect(svg.includes('id="schemdraw-')).toBe(!plot);
          expect(svg).toContain('<text');
        }
        if (locale === 'en') plot ? graphs++ : circuits++;
      }
      for (const [source, sha] of Object.entries(manifest.sourceSha256))
        expect(createHash('sha256').update(readFileSync(resolve(source))).digest('hex')).toBe(sha);
      expect(manifest.sourceSha256['scripts/circuit_drawing.py']).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(circuits).toBe(14);
    expect(graphs).toBe(5);
  });
  test('the compact half-controlled bridge has its own small canvas and body-sized labels in every locale/theme', () => {
    for (const locale of ['en', 'zh-cn']) for (const suffix of ['', '-dark']) {
      const svg = readFileSync(resolve(`content/${locale}/practice2_f26/assets/figures/p2-f26-q4${suffix}.svg`), 'utf8');
      const bounds = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)!;
      expect(Number(bounds[1])).toBeLessThanOrEqual(380);
      expect(Number(bounds[2])).toBeLessThanOrEqual(310);
      const labels = [...svg.matchAll(/<tspan[^>]*font-size: ([\d.]+)px[^>]*>([SDRLiv+−])<\/tspan>/g)];
      expect(labels).toHaveLength(12);
      for (const label of labels) expect(Number(label[1])).toBeGreaterThanOrEqual(18);
      expect(svg).toContain(locale === 'en' ? 'FIGURE P10.4' : '图 P10.4');
    }
  });
  test('the renderer dependency is offline-only, pinned and absent from the frontend dependency list', () => {
    expect(readFileSync(resolve('scripts/requirements-figures.txt'), 'utf8')).toContain('schemdraw==0.23');
    expect(readFileSync(resolve('package.json'), 'utf8')).not.toContain('schemdraw');
  });
});
