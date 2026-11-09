<script lang="ts">
  import {onMount,tick} from 'svelte';
  import * as Breadcrumb from '#lib/components/ui/breadcrumb';
  import * as DropdownMenu from '#lib/components/ui/dropdown-menu';
  import {buttonVariants} from '#lib/components/ui/button';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import Check from '@lucide/svelte/icons/check';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import {course} from '../../../content/course';
  import {DEFAULT_PROBLEM_ID,followProblemLink,problemPath} from '#lib/problem-navigation';
  import type {Catalog} from '#lib/catalog';
  import type {ExamInfo,Locale,ProblemIndex} from '#lib/types';

  let {catalog,exam,problem,locale,onselect}:{
    catalog:Catalog;exam:ExamInfo;problem:Pick<ProblemIndex,'id'|'number'|'title'>;
    locale:Locale;onselect:(id:string)=>void;
  }=$props();
  const t=(zh:string,en:string)=>locale==='zh'?zh:en;
  const home=$derived(catalog.findProblem(DEFAULT_PROBLEM_ID).problem.id);
  const papers=$derived(catalog.exams.filter(paper=>paper.number===exam.number).toReversed());
  const questions=$derived(catalog.findProblem(problem.id).exam.problems);
  const paperLabel=(paper:ExamInfo)=>[paper.term[locale],paper.year].filter(value=>value!==null).join(' ');
  let navigating=false;
  let breadcrumb=$state<HTMLElement|null>(null);
  let openMenu=$state<'path'|'papers'|'questions'|null>(null);
  let layoutFocus:HTMLElement|null=null;

  onMount(()=>{
    const root=breadcrumb!;
    const workspace=root.closest('.workspace')!;
    let compact=getComputedStyle(root).getPropertyValue('--collapsed-path').trim()==='1';
    const observer=new ResizeObserver(()=>{
      const next=getComputedStyle(root).getPropertyValue('--collapsed-path').trim()==='1';
      if(next===compact)return;
      compact=next;
      const active=document.activeElement;
      const hiddenFocus=active instanceof HTMLElement&&root.contains(active)&&!active.getClientRects().length;
      if(openMenu||hiddenFocus){
        const destination=root.querySelector<HTMLElement>(`[data-breadcrumb-menu="${next?'path':'questions'}"]`);
        if(openMenu){layoutFocus=destination;openMenu=null;}
        void tick().then(()=>destination?.focus({preventScroll:true}));
      }
    });
    observer.observe(workspace);
    return()=>observer.disconnect();
  });

  function select(event:MouseEvent,id:string){
    followProblemLink(event,()=>{navigating=true;onselect(id);});
  }
  function returnFocus(event:Event){
    // Astro navigation owns destination focus; Escape/outside dismissal still
    // returns to the menu trigger through Bits UI's normal focus handling.
    if(navigating){event.preventDefault();navigating=false;layoutFocus=null;}
    else if(layoutFocus){event.preventDefault();layoutFocus.focus({preventScroll:true});layoutFocus=null;}
  }
</script>

{#snippet destination(id:string,label:string,current:boolean,currentPage=false)}
  <DropdownMenu.Item>
    {#snippet child({props})}
      <a {...props} href={problemPath(id)} data-breadcrumb-target={id} aria-current={currentPage?'page':undefined}
        onclick={event=>{props.onclick?.(event);select(event,id);}}>
        <span class="min-w-0 flex-1">{label}</span>
        {#if current}<Check aria-hidden="true"/><span class="sr-only">{t('当前','Current')}</span>{/if}
      </a>
    {/snippet}
  </DropdownMenu.Item>
{/snippet}

<Breadcrumb.Root bind:ref={breadcrumb} class="study-breadcrumb" aria-label={t('面包屑导航','Breadcrumb')}>
  <Breadcrumb.List class="flex-nowrap gap-1 sm:gap-1">
    <Breadcrumb.Item class="breadcrumb-collapsed shrink-0">
      <DropdownMenu.Root open={openMenu==='path'} onOpenChange={open=>openMenu=open?'path':null}>
        <DropdownMenu.Trigger class={buttonVariants({variant:'ghost',size:'icon-sm'})}
          data-breadcrumb-menu="path" aria-label={t('展开导航路径','Open navigation path')}
          title={`${course.code} / Exam ${exam.number} / ${paperLabel(exam)}`}>
          <Ellipsis aria-hidden="true"/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-80 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          <DropdownMenu.Group data-breadcrumb-section="course">
            <DropdownMenu.GroupHeading>{course.code}</DropdownMenu.GroupHeading>
            {@render destination(home,t('返回课程入口','Course home'),false)}
          </DropdownMenu.Group>
          <DropdownMenu.Separator/>
          <DropdownMenu.Group data-breadcrumb-section="papers">
            <DropdownMenu.GroupHeading>Exam {exam.number} · {t('试卷与练习','Exams & practice')}</DropdownMenu.GroupHeading>
            {#each papers as paper(paper.id)}
              {@render destination(paper.problems[0].id,paperLabel(paper),paper.id===exam.id)}
            {/each}
          </DropdownMenu.Group>
          <DropdownMenu.Separator/>
          <DropdownMenu.Group data-breadcrumb-section="questions">
            <DropdownMenu.GroupHeading>{paperLabel(exam)}</DropdownMenu.GroupHeading>
            {#each questions as question(question.id)}
              {@render destination(question.id,`${t('第 '+question.number+' 题','Q'+question.number)} · ${question.title[locale]}`,question.id===problem.id,question.id===problem.id)}
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Item class="breadcrumb-ancestor breadcrumb-course shrink-0">
      <Breadcrumb.Link class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}
        href={problemPath(home)} title={t(`${course.code} · 返回课程入口`,`${course.code} · Course home`)}
        aria-label={t(`${course.code} · 返回课程入口`,`${course.code} · Course home`)}
        onclick={event=>followProblemLink(event,()=>onselect(home))}>
        <GraduationCap data-icon="inline-start" class="breadcrumb-course-icon" aria-hidden="true"/>
        <span class="breadcrumb-course-name">{course.code}</span>
      </Breadcrumb.Link>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="breadcrumb-ancestor shrink-0"/>
    <Breadcrumb.Item class="breadcrumb-ancestor shrink-0">
      <DropdownMenu.Root open={openMenu==='papers'} onOpenChange={open=>openMenu=open?'papers':null}>
        <DropdownMenu.Trigger class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}
          data-breadcrumb-menu="papers" aria-label={t(`Exam ${exam.number} · 选择试卷`,`Exam ${exam.number} · Choose a paper`)}>
          Exam {exam.number}<ChevronDown data-icon="inline-end" aria-hidden="true"/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-80 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          <DropdownMenu.Group data-breadcrumb-section="papers">
            <DropdownMenu.GroupHeading>Exam {exam.number} · {t('试卷与练习','Exams & practice')}</DropdownMenu.GroupHeading>
            {#each papers as paper(paper.id)}
              {@render destination(paper.problems[0].id,paperLabel(paper),paper.id===exam.id)}
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="breadcrumb-ancestor shrink-0"/>
    <Breadcrumb.Item class="breadcrumb-ancestor min-w-0 shrink">
      <DropdownMenu.Root open={openMenu==='questions'} onOpenChange={open=>openMenu=open?'questions':null}>
        <DropdownMenu.Trigger class={buttonVariants({variant:'ghost',size:'sm',class:'min-w-0 max-w-full shrink px-1'})}
          data-breadcrumb-menu="questions" title={paperLabel(exam)}
          aria-label={t(`${paperLabel(exam)} · 选择题目`,`${paperLabel(exam)} · Choose a problem`)}>
          <span class="truncate">{paperLabel(exam)}</span><ChevronDown data-icon="inline-end" aria-hidden="true"/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-80 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          <DropdownMenu.Group data-breadcrumb-section="questions">
            <DropdownMenu.GroupHeading>{paperLabel(exam)}</DropdownMenu.GroupHeading>
            {#each questions as question(question.id)}
              {@render destination(question.id,`${t('第 '+question.number+' 题','Q'+question.number)} · ${question.title[locale]}`,question.id===problem.id,question.id===problem.id)}
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="shrink-0"/>
    <Breadcrumb.Item class="shrink-0">
      <Breadcrumb.Page title={problem.title[locale]} aria-label={t(`第 ${problem.number} 题：${problem.title.zh}`,`Problem ${problem.number}: ${problem.title.en}`)}>
        <span class="breadcrumb-current-full">{t(`第 ${problem.number} 题`,`Q${problem.number}`)}</span><span class="breadcrumb-current-short" aria-hidden="true">Q{problem.number}</span>
      </Breadcrumb.Page>
    </Breadcrumb.Item>
  </Breadcrumb.List>
</Breadcrumb.Root>
