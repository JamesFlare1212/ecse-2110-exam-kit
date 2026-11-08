import {expect, test} from 'bun:test';
import {closeSync, mkdtempSync, mkdirSync, openSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

test('native type checking reports Svelte script, component prop and rune errors through aliases', async () => {
  const root = resolve(import.meta.dir, '..');
  const workspace = mkdtempSync(join(tmpdir(), 'fieldnotes-typecheck-'));
  try {
    mkdirSync(join(workspace, 'src/lib'), {recursive: true});
    symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'), 'dir');
    writeFileSync(join(workspace, 'package.json'), JSON.stringify({type: 'module'}));
    writeFileSync(join(workspace, 'svelte.config.js'), 'export default {compilerOptions: {runes: true}};');
    writeFileSync(join(workspace, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler',
        strict: true, skipLibCheck: true, allowJs: true, checkJs: true,
        types: ['svelte'], paths: {'#lib/*': ['./src/lib/*']},
      },
      include: ['src/**/*.ts', 'src/**/*.svelte'],
    }));
    writeFileSync(join(workspace, 'src/Child.svelte'), `<script lang="ts">
      let {value}: {value: number} = $props();
    </script>
    <span>{value}</span>`);
    const writeProbe = (valid: boolean) => {
      writeFileSync(join(workspace, 'src/lib/count.svelte.ts'),
        `export const count: number = $state(${valid ? '1' : '"wrong"'});`);
      writeFileSync(join(workspace, 'src/Probe.svelte'), `<script lang="ts">
        import Child from './Child.svelte';
        import {count} from '#lib/count.svelte';
        const scriptValue: number = ${valid ? '1' : '"wrong"'};
      </script>
      <Child value={${valid ? 'count' : '"wrong"'}} />
      <span>{scriptValue}</span>`);
    };
    const check = async () => {
      const log = join(workspace, 'diagnostics.log');
      const output = openSync(log, 'w');
      try {
        const child = Bun.spawn([
          'node', join(root, 'node_modules/svelte-check/bin/svelte-check'),
          '--workspace', workspace, '--tsconfig', join(workspace, 'tsconfig.json'),
          '--tsgo', '--output', 'machine-verbose',
        ], {cwd: workspace, stdout: output, stderr: output});
        const code = await child.exited;
        return {output: readFileSync(log, 'utf8'), code};
      } finally {
        closeSync(output);
      }
    };
    writeProbe(false);
    const broken = await check();
    expect(broken.code, broken.output).toBe(1);
    expect(broken.output).toContain('Probe.svelte');
    const diagnostics = broken.output.split('\n')
      .filter(line => /^\d+ \{/.test(line))
      .map(line => JSON.parse(line.slice(line.indexOf('{'))))
      .filter(row => row.type === 'ERROR');
    expect(diagnostics.filter(row => row.filename.endsWith('Probe.svelte')), broken.output).toHaveLength(2);
    expect(diagnostics.filter(row => row.filename.endsWith('count.svelte.ts')), broken.output).toHaveLength(1);
    expect(diagnostics.every(row => row.code === 2322), broken.output).toBe(true);
    writeProbe(true);
    const fixed = await check();
    expect(fixed.code, fixed.output).toBe(0);
    expect(fixed.output).not.toContain('"type":"ERROR"');
  } finally {
    rmSync(workspace, {recursive: true, force: true});
  }
}, 60_000);
