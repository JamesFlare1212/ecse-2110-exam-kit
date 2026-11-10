import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

const read=(path:string)=>readFileSync(path,'utf8');
test('client optimization includes every resolved re-export of Astro’s virtual transition facade',()=>{
 const config=read('astro.config.ts');
 const client=config.match(/environments:\s*\{\s*client:\s*\{\s*optimizeDeps:\s*\{\s*include:\s*\[([^]*?)\]/)?.[1];
 expect(client).toBeDefined();
 const configured=[...client!.matchAll(/'(astro\/virtual-modules\/transitions-[^']+)'/g)].map(match=>match[1]);
 const astro=dirname(Bun.resolveSync('astro/package.json',process.cwd()));
 const plugin=read(join(astro,'dist/transitions/vite-plugin-transitions.js'));
 const actual=[...new Set([...plugin.matchAll(/from "(astro\/virtual-modules\/transitions-[^"]+)"/g)].map(match=>match[1]))];
 expect(actual.length).toBeGreaterThan(0);expect(configured.sort()).toEqual(actual.sort());
 for(const dependency of configured)expect(Bun.resolveSync(dependency,process.cwd())).toBeTruthy();
 expect(config).not.toContain('ignoreOutdatedRequests');
 expect(config).not.toMatch(/devToolbar:\s*\{\s*enabled:\s*false/);
});

test('cold navigation owns a unique temporary cache and server, while preserving browser failure assertions',()=>{
 const source=read('scripts/browser-cold-dev-qa.mjs');
 expect(source).toContain("mkdtemp(join(tmpdir(),'fieldnotes-cold-dev-'))");
 expect(source).toContain("cacheDir:join(cache,'vite')");
 expect(source).toContain("server:{host:'127.0.0.1',port:0}");
 expect(source).toContain('QA_URL:url');expect(source).toContain('process.exitCode=exitCode');
 expect(source).toContain('await server?.stop()');expect(source).toContain('await rm(cache,');
 const browser=read('scripts/browser-converter-navigation-qa.mjs');
 expect(browser).toContain("page.on('pageerror',error=>errors.push(error.message))");
 expect(browser).toContain('assert.deepEqual(errors,[])');
 expect(source).not.toContain('astro dev stop');
});
