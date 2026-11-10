import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('converter slider uses native exact coordinates without adding snap stops or changing precision',()=>{
 const source=read('src/lib/components/Converter.svelte');
 const slider=source.match(/<Slider\b[^]*?\/>/)![0];
 expect(slider).toContain('thumbPositioning="exact"');
 expect(slider).toContain('min={0} max={360} step={.1}');
 expect(slider).toContain('class="h-8"');
 expect(source).toContain('left:${angle/360*100}%');
 expect(source).toContain('const boundaries=$derived([0,alpha,180,180+alpha,360])');
 expect(slider).toContain('thumbValueText=');expect(slider).toContain('thumbDescriptionId=');
});

test('converter owns a local thumb-above-ticks stack and keeps labels outside the row centerline',()=>{
 const css=read('src/styles/converter.css');
 expect(css).toMatch(/\.conduction-visualization \.conduction-phase \{[^}]*position:relative;[^}]*isolation:isolate;/);
 expect(css).toContain('.conduction-phase [data-slot=slider-thumb] { z-index:1; }');
 expect(css).toMatch(/\.conduction-boundaries \{ position:absolute; top:100%; inset-inline:0; z-index:0;/);
 expect(css).toMatch(/\.conduction-transport \{[^}]*padding-bottom:12px;/);
 expect(css).toContain('.conduction-transport { padding-bottom:24px; }');
 expect(css).toMatch(/\.conduction-boundaries>span::before \{[^}]*top:-18px; left:50%; transform:translateX\(-50%\);/);
 expect(css).toContain('.conduction-boundaries>span:last-child::before { left:100%; }');
 // Raising the whole root would hide the ticks behind the track itself.
 expect(css).not.toMatch(/\.conduction-phase \[data-slot=slider\] \{[^}]*z-index:/);
 for(const path of ['.github/workflows/ci.yml','README.md'])expect(read(path)).toContain('scripts/browser-converter-slider-qa.mjs');
});
