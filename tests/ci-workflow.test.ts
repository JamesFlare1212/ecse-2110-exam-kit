import {expect,test} from 'bun:test';
import {existsSync,readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {browserSuites} from '../scripts/browser-ci-suites';
const workflow=parse(readFileSync('.github/workflows/ci.yml','utf8'));

test('CI isolates browser suites from the unit/build job and keeps all shards bounded',()=>{
 const app=workflow.jobs['app-checks'],browser=workflow.jobs.browser;
 for(const run of ['bun run content:check','bun run check','bun test','bun run build'])expect(app.steps.some((step:any)=>step.run===run)).toBe(true);
 expect(app.steps.some((step:any)=>step.run?.includes('browser-'))).toBe(false);
 expect(app.outputs.sha).toBe('${{ steps.revision.outputs.sha }}');
 expect(app.steps[0].with.ref).toBe('${{ inputs.ref || github.sha }}');
 expect(browser.steps[0].with.ref).toBe('${{ needs.app-checks.outputs.sha }}');
 expect(browser.needs).toBe('app-checks');expect(browser['timeout-minutes']).toBe(15);
 expect(browser.strategy['fail-fast']).toBe(false);
 expect(browser.strategy.matrix.suite).toEqual(Object.keys(browserSuites));
 expect(browser.steps.find((step:any)=>step.name==='Run production browser suite').run).toContain('bun scripts/browser-ci.mjs "$QA_SUITE"');
 expect(browser.steps.find((step:any)=>step.name==='Run production browser suite').run).toContain("trap 'bun --bun astro preview stop' EXIT");
 expect(browser.steps.find((step:any)=>step.name==='Install locked dependencies and build the same ref').run).toContain('bun install --frozen-lockfile');
 const development=browser.steps.find((step:any)=>step.name==='Check lazy converter styles across development navigation');
 expect(development.if).toBe("matrix.suite == 'navigation'");expect(development.env.QA_URL).toBe('http://127.0.0.1:5173');
 expect(development.run).toContain('bun scripts/browser-converter-navigation-qa.mjs');
 expect(browser.steps.find((step:any)=>step.name==='Upload browser diagnostics on failure').with.name).toBe('browser-diagnostics-${{ matrix.suite }}');
});

test('the existing required app status cannot pass before core and every browser shard succeed',()=>{
 const gate=workflow.jobs.app;
 expect(gate.name).toBe('App checks, tests and build');expect(gate.if).toBe('always()');expect(gate.needs).toEqual(['app-checks','browser']);
 expect(gate.steps[0].env).toEqual({APP_RESULT:'${{ needs.app-checks.result }}',BROWSER_RESULT:'${{ needs.browser.result }}'});
 for(const [core,browser]of [['success','success'],['failure','success'],['cancelled','success'],['skipped','success'],['success','failure'],['success','cancelled'],['success','skipped']]){
  const result=Bun.spawnSync(['bash','-e','-c',gate.steps[0].run],{env:{...process.env,APP_RESULT:core,BROWSER_RESULT:browser},stdout:'pipe',stderr:'pipe'});
  expect(result.exitCode===0).toBe(core==='success'&&browser==='success');
 }
});

test('sharding preserves every existing browser check exactly once and adds question-owned defaults',()=>{
 const scripts:string[]=Object.values(browserSuites).flat();expect(new Set(scripts).size).toBe(scripts.length);
 const expected=['startup','course','reader-layout','reader-sections','sidebar-controls','conduction','conduction-compact','conduction-colors','converter-defaults','converter-slider','converter-waves','full-converter','converter-navigation','page-links','course-citations','content-typography'].map(name=>`scripts/browser-${name}-qa.mjs`);
 expect([...scripts].sort()).toEqual(expected.sort());for(const path of scripts)expect(existsSync(path)).toBe(true);
});

test('browser-suite runner rejects unknown names before it can run a browser or server',()=>{
 const result=Bun.spawnSync([process.execPath,'scripts/browser-ci.mjs','missing-suite'],{stdout:'pipe',stderr:'pipe'});
 expect(result.exitCode).not.toBe(0);expect(result.stderr.toString()).toContain('Unknown browser suite');
});
