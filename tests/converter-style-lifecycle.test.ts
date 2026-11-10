import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';

const read=(file:string)=>readFileSync(file,'utf8');

test('persistent workspace statically owns optional converter and circuit CSS while scripts stay lazy',()=>{
  expect(read('src/layouts/Base.astro')).toContain("import '../styles/layout.css'");
  expect(read('src/styles/layout.css')).toContain("@import './converter.css'");
  expect(read('src/lib/components/SolutionFigure.svelte')).toContain("import('./Converter.svelte')");
  for(const component of ['Converter','ConductionCircuit']){
    const source=read(`src/lib/components/${component}.svelte`);
    expect(source).not.toMatch(/<style\b/);
    expect(source).toContain('src/styles/converter.css');
  }
  const css=read('src/styles/converter.css');
  expect(css).toContain('.conduction-visualization { display:flex;');
  expect(css).toContain('.conduction-transport { display:grid;');
  expect(css).toContain('.conduction-circuit .probe-line { fill:none;');
  expect(css).toContain('.conduction-circuit .conduction-measurement[data-enabled=false] { display:none; }');
  expect(css).not.toContain(':global(');
  // Moving scoped Svelte styles must not introduce unqualified document resets.
  expect(css).not.toMatch(/(?:^|[{}])\s*(?:h[1-6]|p|svg|path|circle|text)\s*[{,]/);
});
