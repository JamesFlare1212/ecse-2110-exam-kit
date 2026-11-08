import {expect, test} from 'bun:test';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

test('asset preparation visits both locales and stops if source verification fails', async () => {
  const root = resolve(import.meta.dir, '..');
  const workspace = mkdtempSync(join(tmpdir(), 'fieldnotes-asset-scripts-'));
  const log = join(workspace, 'calls.log');
  // Exercise the actual package script without rendering or modifying paper assets.
  writeFileSync(join(workspace, 'python3'), `#!/bin/sh
printf '%s\\n' "$*" >> "$ASSET_PREPARE_LOG"
if [ "$ASSET_PREPARE_FAIL_ZH" = "1" ] && [ "$*" = "scripts/prepare_sources.py --locale zh-cn" ]; then
  exit 7
fi
`, {mode: 0o755});
  const run = async (fail: boolean) => {
    writeFileSync(log, '');
    const child = Bun.spawn([process.execPath, 'run', 'assets:prepare'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${workspace}:${process.env.PATH ?? ''}`,
        ASSET_PREPARE_LOG: log,
        ASSET_PREPARE_FAIL_ZH: fail ? '1' : '0',
      },
      stdout: 'pipe', stderr: 'pipe',
    });
    const [code, stdout, stderr] = await Promise.all([
      child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
    ]);
    return {code, output: stdout + stderr, calls: readFileSync(log, 'utf8').trim().split('\n')};
  };
  try {
    const complete = await run(false);
    expect(complete.code, complete.output).toBe(0);
    expect(complete.calls).toEqual([
      'scripts/prepare_sources.py --locale en',
      'scripts/prepare_sources.py --locale zh-cn',
      'scripts/render_excerpts.py',
      'scripts/generate_figures.py',
    ]);
    const failed = await run(true);
    expect(failed.code, failed.output).not.toBe(0);
    expect(failed.calls).toEqual(complete.calls.slice(0, 2));
  } finally {
    rmSync(workspace, {recursive: true, force: true});
  }
});
