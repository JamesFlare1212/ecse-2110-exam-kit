<script lang="ts">
  import * as Accordion from '#lib/components/ui/accordion';
  import * as Alert from '#lib/components/ui/alert';
  import { Button } from '#lib/components/ui/button';
  import { Badge } from '#lib/components/ui/badge';
  import Check from '@lucide/svelte/icons/check';
  import Info from '@lucide/svelte/icons/info';
  import FileText from '@lucide/svelte/icons/file-text';
  import RichText from './RichText.svelte';
  import SolutionBody from './SolutionBody.svelte';
  import Figure from './Figure.svelte';
  import type { Part, SourceRef, ExamInfo } from '#lib/types';
  import type { StudyState } from '#lib/study.svelte';
  let {part,study,exam,dark,assetBase,onsource,sizes}: {assetBase:string;sizes:Record<string,[number,number,number]>;part:Part;study:StudyState;exam:ExamInfo;dark:boolean;onsource:(s:SourceRef)=>void}=$props();
  const done=$derived(Boolean(study.completed[part.id]));
  const sourceNote=$derived(part.note?.[study.locale]);
  function source(solution=false){onsource({doc:solution?exam.solutionDoc:exam.doc,page:solution?part.solutionPage:part.sourcePage,label:{zh:solution?'解答来源页':'试题来源页',en:solution?'Solution source page':'Question source page'}});}
</script>
<Accordion.Item value={part.id} class="problem-part" data-part={part.id}>
  <Accordion.Trigger class="part-trigger" level={3}><span class:complete={done} class="part-letter">{part.label}{#if done}<Check aria-label={study.locale==='zh'?'已掌握':'Mastered'}/>{/if}</span><span class="part-prompt" lang={study.locale==='zh'?'zh-CN':'en'} data-original-prompt><RichText text={part.prompt[study.locale]}/></span>{#if part.points>0}<Badge variant="outline">{part.points} {study.locale==='zh'?'分':'pts'}</Badge>{/if}</Accordion.Trigger>
  {#if part.questionFigure}<div class="part-question-figure"><Figure {assetBase} size={sizes[part.questionFigure.name]} name={part.questionFigure.name} locale={study.locale} {dark} caption={part.questionFigure.caption} original={part.questionFigure.source} {onsource}/></div>{/if}
  <Accordion.Content class="part-content">
      <SolutionBody body={part.solution[study.locale]} partId={part.id} locale={study.locale} documents={study.catalog.documents} {onsource}/>
      {#if part.figure}<Figure {assetBase} size={sizes[part.figure]} name={part.figure} locale={study.locale} {dark} caption={part.figureCaption}/>{/if}
      {#if sourceNote}<Alert.Root class="solution-note"><Info aria-hidden="true"/><Alert.Title>{study.locale==='zh'?'核对说明':'Source check'}</Alert.Title><Alert.Description><RichText text={sourceNote}/></Alert.Description></Alert.Root>{/if}
    <div class="part-actions">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant={done?'secondary':'outline'} size="sm" aria-label={`${study.locale==='zh'?'小问':'Part'} ${part.label}: ${study.locale==='zh'?(done?'已掌握 · 撤销':'标记已掌握'):(done?'Mastered · undo':'Mark as mastered')}`} onclick={()=>study.completed[part.id]=!done}><Check data-icon="inline-start" aria-hidden="true"/>{study.locale==='zh'?(done?'已掌握 · 撤销':'标记已掌握'):(done?'Mastered · undo':'Mark as mastered')}</Button>
      </div>
      <div class="flex items-center gap-1"><Button size="sm" variant="ghost" onclick={()=>source()} aria-label={`${study.locale==='zh'?'小问':'Part'} ${part.label}: ${study.locale==='zh'?'查看本问原题':'View original question'}`}><FileText data-icon="inline-start" aria-hidden="true"/>p.{part.sourcePage}</Button><Button size="sm" variant="link" aria-label={`${study.locale==='zh'?'小问':'Part'} ${part.label}: ${study.locale==='zh'?'解答来源':'Solution source'}`} onclick={()=>source(true)}>{study.locale==='zh'?'解答来源':'Solution source'}</Button></div>
    </div>
  </Accordion.Content>
</Accordion.Item>
