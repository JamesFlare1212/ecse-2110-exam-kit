<script lang="ts">
  import { tick } from 'svelte';
  import { includesSearch } from '#lib/search';
  import * as Dialog from '#lib/components/ui/dialog';
  import * as Tabs from '#lib/components/ui/tabs';
  import * as Empty from '#lib/components/ui/empty';
  import { Button } from '#lib/components/ui/button';
  import { Input } from '#lib/components/ui/input';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import FileText from '@lucide/svelte/icons/file-text';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { formulasForExam } from '#lib/catalog';
  import { course, formulaSheetFor } from '../../../content/course';
  import { problemPath, followProblemLink } from '#lib/problem-navigation';
  import FormulaLink from './FormulaLink.svelte';
  import Math from './Math.svelte';
  import RichText from './RichText.svelte';
  import type { SourceRef } from '#lib/types';
  import type { StudyState } from '#lib/study.svelte';
  let {open=$bindable(false),kind=$bindable('crib'),study,onsource,onselect,onCloseAutoFocus}: {open?:boolean;kind?:string;study:StudyState;onsource:(s:SourceRef)=>void;onselect:(id:string)=>void;onCloseAutoFocus?:(event:Event)=>void}=$props();
  let navigating=false;
  $effect(()=>{if(open)navigating=false;});
  let query=$state('');
  let scroller=$state<HTMLDivElement>();
  $effect(()=>{query;void tick().then(()=>{if(scroller)scroller.scrollTop=0;});});
  const examNumber=$derived(study.catalog.findProblem(study.selected).exam.number);
  const filtered=$derived(formulasForExam(examNumber).filter(f=>includesSearch(f.title.zh+' '+f.title.en+' $'+f.math+'$',query)));
  const bookmarks=$derived(study.catalog.problemEntries.filter(({problem})=>study.bookmarks[problem.id]));
  const lectures=course.resources.lectures;
  const sheetId=$derived(formulaSheetFor(examNumber));
  const sheet=$derived(sheetId?study.catalog.documents[sheetId]:undefined);
</script>
<Dialog.Root bind:open>
  <Dialog.Content onCloseAutoFocus={(event)=>{if(navigating)event.preventDefault();else onCloseAutoFocus?.(event);}} closeLabel={study.locale==='zh'?'关闭':'Close'} class="library-dialog sm:max-w-4xl">
    <Dialog.Header><Dialog.Title>{study.locale==='zh'?'课程资料库':'The course library'}</Dialog.Title><Dialog.Description>{study.locale==='zh'?`原始公式、${lectures.length} 讲课件与收藏题目，随时回到出处。`:`Original formulas, all ${lectures.length} lectures and your saved problems.`}</Dialog.Description></Dialog.Header>
    <Tabs.Root bind:value={kind}>
      <Tabs.List><Tabs.Trigger value="crib"><FileText aria-hidden="true"/>{study.locale==='zh'?`公式表 · Exam ${examNumber}`:`Crib sheet · Exam ${examNumber}`}</Tabs.Trigger><Tabs.Trigger value="lectures"><BookOpen aria-hidden="true"/>{study.locale==='zh'?'课件':'Lecture notes'}</Tabs.Trigger><Tabs.Trigger value="bookmarks"><Bookmark aria-hidden="true"/>{study.locale==='zh'?'收藏':'Saved'}</Tabs.Trigger></Tabs.List>
      <Tabs.Content value="crib">
        <div class="library-formula-toolbar"><label for="formula-search" class="sr-only">{study.locale==='zh'?'搜索公式':'Search formulas'}</label><Input id="formula-search" bind:value={query} placeholder={study.locale==='zh'?'搜索公式名称或符号…':'Search formula names or symbols…'}/>{#if sheet}<Button variant="outline" onclick={()=>onsource({doc:sheet!.id,page:1,label:{zh:'完整公式表',en:'Full crib sheet'}})}>{study.locale==='zh'?`完整 ${sheet.pages} 页`:`All ${sheet.pages} pages`}<ArrowUpRight data-icon="inline-end" aria-hidden="true"/></Button>{/if}</div>
        <div class="library-scroll" bind:this={scroller}>
          {#each filtered as formula(formula.id)}
            <div class="library-formula">
              <FormulaLink documents={study.catalog.documents} {formula} locale={study.locale} {onsource}/>
              <div class="library-formula-body">
                <Math locale={study.locale} tex={formula.math} display/>
                {#if formula.note}<p><RichText text={formula.note[study.locale]}/></p>{/if}
              </div>
            </div>
          {:else}<Empty.Root><Empty.Header><Empty.Title>{study.locale==='zh'?'未找到公式':'No formulas found'}</Empty.Title><Empty.Description>{study.locale==='zh'?'试试中文或英文的物理量名称。':'Try a physical quantity in English or Chinese.'}</Empty.Description></Empty.Header></Empty.Root>{/each}
        </div>
      </Tabs.Content>
      <Tabs.Content value="lectures"><div class="library-scroll lecture-library">
        {#each lectures as lecture(lecture.doc)}{@const doc=study.catalog.documents[lecture.doc]}<Button variant="ghost" class="library-lecture" onclick={()=>onsource({doc:doc.id,page:1,label:lecture.title})}><span class="library-lecture-number">{lecture.label}</span><span><strong>{lecture.title[study.locale]}</strong><small>Lecture {lecture.label} · {doc.pages} {study.locale==='zh'?'页':'pages'}</small></span><ArrowUpRight aria-hidden="true"/></Button>{:else}<Empty.Root><Empty.Header><Empty.Title>{study.locale==='zh'?'尚未配置课程讲义':'No lecture notes configured'}</Empty.Title><Empty.Description>{study.locale==='zh'?'题目引用的其它资料仍可从对应来源链接打开。':'Other cited sources remain available through their source links.'}</Empty.Description></Empty.Header></Empty.Root>{/each}
      </div></Tabs.Content>
      <Tabs.Content value="bookmarks"><div class="library-scroll">
        {#each bookmarks as {problem,exam}(problem.id)}<Button variant="ghost" class="saved-problem" href={problemPath(problem.id)} onclick={(event)=>followProblemLink(event,()=>{navigating=true;onselect(problem.id);open=false;})}><Bookmark data-icon="inline-start" aria-hidden="true"/><span><strong>{problem.title[study.locale]}</strong><small>Exam {exam.number} · {exam.term[study.locale]} {exam.year} · Q{problem.number}</small></span><ArrowUpRight aria-hidden="true"/></Button>
        {:else}<Empty.Root><Empty.Header><Empty.Media variant="icon"><Bookmark aria-hidden="true"/></Empty.Media><Empty.Title>{study.locale==='zh'?'把值得再做的题留下':'Keep the problems worth revisiting'}</Empty.Title><Empty.Description>{study.locale==='zh'?'点击题目标题旁的收藏按钮，即可在这里找到。':'Use the bookmark button next to a problem title to save it here.'}</Empty.Description></Empty.Header></Empty.Root>{/each}
      </div></Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
