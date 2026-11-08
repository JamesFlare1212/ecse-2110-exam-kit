<script lang="ts">
  import * as Tabs from '#lib/components/ui/tabs';
  import * as Card from '#lib/components/ui/card';
  import { Button } from '#lib/components/ui/button';
  import { Badge } from '#lib/components/ui/badge';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Link from '@lucide/svelte/icons/link';
  import FileText from '@lucide/svelte/icons/file-text';
  import Math from './Math.svelte';
  import FormulaLink from './FormulaLink.svelte';
  import { problemFormulas } from '#lib/catalog';
  import { course, sourceName } from '../../../content/course';
  import type { Problem, Locale, SourceRef, SourceDocument } from '#lib/types';
  let {problem,locale,documents,onsource,onlibrary,tab=$bindable('formulas')}: {problem:Problem;locale:Locale;tab?:string;documents:Record<string,SourceDocument>;onsource:(s:SourceRef)=>void;onlibrary:(kind:string)=>void}=$props();
  const formulas=$derived(problemFormulas(problem,locale));
</script>
<div class="reference-content">
  <div class="rail-heading"><span><Link aria-hidden="true"/>{locale==='zh'?'知识连接':'Connected knowledge'}</span><Badge variant="outline">{formulas.length+problem.lectures.length}</Badge></div>
  <p class="rail-intro">{locale==='zh'?'让每一步推导，都有据可循。':'A source behind every step.'}</p>
  <Tabs.Root bind:value={tab}>
    <Tabs.List class="w-full"><Tabs.Trigger value="formulas">{locale==='zh'?'公式表':'Crib sheet'}</Tabs.Trigger><Tabs.Trigger value="lectures">{locale==='zh'?'课件':'Lecture notes'}</Tabs.Trigger></Tabs.List>
    <Tabs.Content value="formulas">
      <div class="rail-formulas">
        {#each formulas as formula,i(formula.id)}
          <section class="rail-formula">
            <div class="rail-formula-number">{String(i+1).padStart(2,'0')} <span>{sourceName(formula.source.doc,documents).toUpperCase()} · P.{formula.source.page}</span></div>
            <FormulaLink {documents} {formula} {locale} {onsource}/>
            <div class="rail-equation"><Math {locale} tex={formula.math} display/></div>
          </section>
        {/each}
        <Button variant="outline" class="w-full" onclick={()=>onlibrary('crib')}><FileText data-icon="inline-start" aria-hidden="true"/>{locale==='zh'?'浏览完整公式表':'Browse the full crib sheet'}<ArrowUpRight data-icon="inline-end" aria-hidden="true"/></Button>
      </div>
    </Tabs.Content>
    <Tabs.Content value="lectures">
      <div class="lecture-links">
        {#each problem.lectures as lecture,i(`${lecture.doc}-${lecture.page}`)}
          <Button variant="ghost" class="lecture-link" onclick={()=>onsource(lecture)}><span class="lecture-index">{course.resources.lectures.find(entry=>entry.doc===lecture.doc)?.label??'↗'}</span><span class="lecture-text"><strong>{lecture.label[locale]}</strong><small>{sourceName(lecture.doc,documents)} · p.{lecture.page}</small></span><ArrowUpRight aria-hidden="true"/></Button>
        {/each}
        <Button variant="outline" class="w-full" onclick={()=>onlibrary('lectures')}><BookOpen data-icon="inline-start" aria-hidden="true"/>{locale==='zh'?`浏览全部 ${course.resources.lectures.length} 讲`:`Browse all ${course.resources.lectures.length} lectures`}</Button>
      </div>
    </Tabs.Content>
  </Tabs.Root>
  <Card.Root size="sm" class="source-guide">
    <Card.Header><Card.Title><BookOpen aria-hidden="true"/>{locale==='zh'?'从原式出发':'Start from the source'}</Card.Title><Card.Description>{locale==='zh'?'悬浮公式名称可查看原式；点击后，橙框将标出它在原始资料中的位置。':'Hover a formula name to preview its source. Click to find it inside an orange box on the original page.'}</Card.Description></Card.Header>
    <Card.Content><span class="source-guide-sample"><span></span>{locale==='zh'?'精确到页与区域':'Linked to a page and region'}</span></Card.Content>
    <Card.Footer><span>{locale==='zh'?'PDF 页码 · 本地课程资料':'PDF pages · local course sources'}</span></Card.Footer>
  </Card.Root>
</div>
