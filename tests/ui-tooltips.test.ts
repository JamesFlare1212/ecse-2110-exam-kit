import {expect, test} from 'bun:test';
import {readdirSync, readFileSync} from 'node:fs';

const component = (name: string) => readFileSync(`src/lib/components/${name}.svelte`, 'utf8');

test('application UI hints use shadcn Tooltip instead of browser title attributes', () => {
  for (const name of readdirSync('src/lib/components').filter(name => name.endsWith('.svelte'))) {
    const markup = readFileSync(`src/lib/components/${name}`, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    expect(markup).not.toMatch(/\stitle\s*=/);
  }
  for (const name of ['StudyBreadcrumb', 'SourceViewer', 'Converter', 'FormulaLink', 'ReferenceRail']) {
    expect(component(name)).toContain("import * as Tooltip from '#lib/components/ui/tooltip'");
    expect(component(name)).toContain('<Tooltip.Content>');
  }
});

test('tooltips share the workspace provider while source previews remain Hover Cards', () => {
  expect(component('StudyDesk').match(/<Tooltip.Provider\b/g)).toHaveLength(1);
  expect(component('FormulaLink')).toContain('<HoverCard.Root');
  expect(component('FormulaLink')).toContain('<HoverCard.Content');
});

test('composed waveform tooltips retain their measurement and live-value descriptions', () => {
  const source = component('Converter');
  expect(source).toContain("props['aria-describedby']");
  expect(source).toContain('${id}-wave-help ${id}-${m.key}-reference ${id}-${m.key}-value');
  expect(source).toContain('<Tooltip.Trigger onclick={()=>toggle(m.key)}>');
});
