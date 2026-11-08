<script lang="ts">
  import { tick } from 'svelte';
  import * as Dialog from '#lib/components/ui/dialog';
  import * as Empty from '#lib/components/ui/empty';
  import * as Field from '#lib/components/ui/field';
  import { Button } from '#lib/components/ui/button';
  import { Input } from '#lib/components/ui/input';
  import SearchIcon from '@lucide/svelte/icons/search';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { formulasForExam, type Catalog } from '#lib/catalog';
  import { problemPath, followProblemLink } from '#lib/problem-navigation';
  import { includesSearch } from '#lib/search';
  import type {Locale,SourceRef} from '#lib/types';
  let {open=$bindable(false),locale,catalog,examNumber,onselect,onsource}: {open?:boolean;locale:Locale;catalog:Catalog;examNumber:number;onselect:(id:string,part?:string)=>void;onsource:(s:SourceRef)=>void}=$props();
  let query=$state('');
  let navigating=false;
  let results=$state<HTMLDivElement>();
  const normalized=$derived(query.trim().toLowerCase());
  const matches=$derived(catalog.problemEntries.flatMap(({problem,exam})=>{
    const parts=normalized?problem.parts.filter(p=>includesSearch(p.prompt.zh+' '+p.prompt.en,normalized)):[];
    if(parts.length)return parts.map(part=>({problem,exam,part}));
    return !normalized||includesSearch([problem.title.zh,problem.title.en,problem.topic.zh,problem.topic.en,problem.statement.zh,problem.statement.en,`exam ${exam.number}`,String(exam.year ?? '')].join(' '),normalized)?[{problem,exam,part:undefined}]:[];
  }));
  const formulaMatches=$derived(normalized?formulasForExam(examNumber).filter(f=>includesSearch(f.title.zh+' '+f.title.en+' $'+f.math+'$',normalized)):[]);
  $effect(()=>{normalized;void tick().then(()=>{if(results)results.scrollTop=0;});});
  $effect(()=>{if(open)navigating=false;});
</script>
<Dialog.Root bind:open>
  <Dialog.Content onCloseAutoFocus={(event)=>{if(navigating)event.preventDefault();}} closeLabel={locale==='zh'?'关闭':'Close'} class="search-dialog sm:max-w-2xl">
    <Dialog.Header><Dialog.Title>{locale==='zh'?'搜索题目与公式':'Search problems and formulas'}</Dialog.Title><Dialog.Description>{locale==='zh'?`搜索全部 ${catalog.problemEntries.length} 题、${catalog.totalParts} 个小问与公式，中英文都可以。`:`Search all ${catalog.problemEntries.length} problems, ${catalog.totalParts} subparts and formulas in either language.`}</Dialog.Description></Dialog.Header>
    <Field.Group><Field.Field><Field.Label class="sr-only" for="global-search">{locale==='zh'?'搜索题目或公式':'Search problems or formulas'}</Field.Label><Input id="global-search" bind:value={query} placeholder={locale==='zh'?'输入题目、概念或公式名称…':'Enter a problem, concept or formula name…'}/></Field.Field></Field.Group>
    <p class="search-count" role="status" aria-live="polite">{matches.length+formulaMatches.length} {locale==='zh'?'个匹配结果':'matching results'}</p>
    <div bind:this={results} class="search-results" role="region" aria-label={locale==='zh'?'搜索结果':'Search results'}>
      {#if formulaMatches.length}<p class="search-group-label">{locale==='zh'?'公式':'FORMULAS'}</p>{/if}
      {#each formulaMatches as f(f.id)}<Button variant="ghost" class="search-result" onclick={()=>{navigating=true;open=false;onsource(f.source);}}><SearchIcon data-icon="inline-start" aria-hidden="true"/><span><strong>{f.title[locale]}</strong><small>{f.source.label[locale]}</small></span><ArrowUpRight aria-hidden="true"/></Button>{/each}
      {#if matches.length}<p class="search-group-label">{locale==='zh'?'题目':'PROBLEMS'}</p>{/if}
      {#each matches as {exam,problem,part}(part?.id??problem.id)}<Button variant="ghost" class="search-result" href={problemPath(problem.id,part?.id)} onclick={(event)=>followProblemLink(event,()=>{navigating=true;open=false;onselect(problem.id,part?.id);})}><span class="search-question-number">{String(problem.number).padStart(2,'0')}</span><span><strong>{problem.title[locale]}{#if part} · {locale==='zh'?'小问':'Part'} {part.label}{/if}</strong><small>Exam {exam.number} · {exam.term[locale]} {exam.year} · {problem.parts.length} {locale==='zh'?'小问':'parts'}</small></span><ArrowUpRight aria-hidden="true"/></Button>{/each}
      {#if !matches.length&&!formulaMatches.length}<Empty.Root><Empty.Header><Empty.Media variant="icon"><SearchIcon aria-hidden="true"/></Empty.Media><Empty.Title>{locale==='zh'?'暂时没有匹配结果':'No matching results'}</Empty.Title><Empty.Description>{locale==='zh'?'试试较短的关键词，或换一种语言搜索。':'Try a shorter keyword or search in the other language.'}</Empty.Description></Empty.Header></Empty.Root>{/if}
    </div>
    <p class="search-hint">{locale==='zh'?'使用 Tab 选择结果，Enter 打开，Esc 关闭。':'Tab to a result, Enter to open, Esc to close.'}</p>
  </Dialog.Content>
</Dialog.Root>
