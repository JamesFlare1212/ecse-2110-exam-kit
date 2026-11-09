<script lang="ts">
  import {onMount,tick} from 'svelte';
  import * as Breadcrumb from '#lib/components/ui/breadcrumb';
  import * as DropdownMenu from '#lib/components/ui/dropdown-menu';
  import * as Tooltip from '#lib/components/ui/tooltip';
  import {buttonVariants} from '#lib/components/ui/button';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import Check from '@lucide/svelte/icons/check';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import {course} from '../../../content/course';
  import {DEFAULT_PROBLEM_ID,followProblemLink,problemPath} from '#lib/problem-navigation';
  import {breadcrumbLayout,type BreadcrumbLayout,type BreadcrumbWidths} from '#lib/breadcrumb-layout';
  import type {Catalog} from '#lib/catalog';
  import type {ExamInfo,Locale,ProblemIndex} from '#lib/types';

  let {catalog,exam,problem,locale,onselect}:{
    catalog:Catalog;exam:ExamInfo;problem:Pick<ProblemIndex,'id'|'number'|'title'>;
    locale:Locale;onselect:(id:string)=>void;
  }=$props();
  const t=(zh:string,en:string)=>locale==='zh'?zh:en;
  const home=$derived(catalog.findProblem(DEFAULT_PROBLEM_ID).problem.id);
  const groups=$derived([...new Set(catalog.exams.map(paper=>paper.number))].map(number=>({
    number,entry:catalog.exams.filter(paper=>paper.number===number).at(-1)!.problems[0].id,
  })));
  const papers=$derived(catalog.exams.filter(paper=>paper.number===exam.number).toReversed());
  const questions=$derived(catalog.findProblem(problem.id).exam.problems);
  const paperLabel=(paper:ExamInfo)=>[paper.term[locale],paper.year].filter(value=>value!==null).join(' ');
  let navigating=false;
  let breadcrumb=$state<HTMLElement|null>(null);
  let measurements=$state<HTMLDivElement|null>(null);
  let layout=$state<BreadcrumbLayout|'auto'>('auto');
  let openMenu=$state<'path'|'course'|'papers'|'questions'|null>(null);
  // Touch menus can retain trigger focus; do not leave its hint behind the menu.
  let openTooltip=$state<'path'|'course'|'questions'|'current'|null>(null);
  let layoutFocus:HTMLElement|null=null;

  onMount(()=>{
    const root=breadcrumb!;
    let disposed=false;
    const measure=()=>{
      const available=root.getBoundingClientRect().width;
      if(!available)return;
      const width=(name:string)=>measurements!.querySelector<HTMLElement>(`[data-measure="${name}"]`)!.getBoundingClientRect().width;
      const list=root.querySelector<HTMLElement>('[data-slot="breadcrumb-list"]')!;
      const widths:BreadcrumbWidths={
        course:width('course'),courseIcon:width('courseIcon'),group:width('group'),paper:width('paper'),
        current:width('current'),path:width('path'),
        separator:root.querySelector<HTMLElement>('.breadcrumb-current-separator')!.getBoundingClientRect().width,
        gap:parseFloat(getComputedStyle(list).columnGap)||0,
      };
      const next=breadcrumbLayout(available,widths);
      if(next===layout)return;
      const active=document.activeElement;
      layout=next;openTooltip=null;
      void tick().then(()=>{
        if(disposed)return;
        const trigger=openMenu?root.querySelector<HTMLElement>(`[data-breadcrumb-menu="${openMenu}"]`):null;
        const hiddenMenu=trigger&&!trigger.getClientRects().length;
        const hiddenFocus=active instanceof HTMLElement&&root.contains(active)&&!active.getClientRects().length;
        if(!hiddenMenu&&!hiddenFocus)return;
        const destination=root.querySelector<HTMLElement>(`[data-breadcrumb-menu="${next==='partial'||next==='compact'?'path':'questions'}"]`);
        if(hiddenMenu){layoutFocus=destination;openMenu=null;}
        void tick().then(()=>{if(!disposed)destination?.focus({preventScroll:true});});
      });
    };
    // The root receives only the space left by real controls. The inert natural-
    // width row also changes on locale, paper, course-code and font updates.
    const observer=new ResizeObserver(measure);
    observer.observe(root);observer.observe(measurements!);
    measure();
    return()=>{disposed=true;observer.disconnect();};
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

{#snippet examDestinations()}
  <DropdownMenu.Group data-breadcrumb-section="groups" aria-label={t('考试组','Exam groups')}>
    {#each groups as group(group.number)}
      {@render destination(group.entry,`Exam ${group.number}`,group.number===exam.number)}
    {/each}
  </DropdownMenu.Group>
{/snippet}

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

<Breadcrumb.Root bind:ref={breadcrumb} class="study-breadcrumb" data-layout={layout} aria-label={t('面包屑导航','Breadcrumb')}>
  <Breadcrumb.List class="flex-nowrap gap-1 sm:gap-1">
    <Breadcrumb.Item class="breadcrumb-collapsed shrink-0">
      <DropdownMenu.Root open={openMenu==='path'} onOpenChange={open=>openMenu=open?'path':null}>
        <Tooltip.Root disabled={Boolean(openMenu)} bind:open={()=>!openMenu&&openTooltip==='path',open=>openTooltip=open&&!openMenu?'path':null}>
          <Tooltip.Trigger>
            {#snippet child({props})}
              <DropdownMenu.Trigger {...props} data-slot="dropdown-menu-trigger" class={buttonVariants({variant:'ghost',size:'icon-sm'})}
                data-breadcrumb-menu="path" aria-label={t('展开导航路径','Open navigation path')}>
                <Ellipsis aria-hidden="true"/>
              </DropdownMenu.Trigger>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>{course.code} / Exam {exam.number} / {paperLabel(exam)}</Tooltip.Content>
        </Tooltip.Root>
        <DropdownMenu.Content class="w-80 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          <DropdownMenu.Group data-breadcrumb-section="course" aria-label={course.code}>
            {@render destination(home,t('返回课程入口','Course home'),false)}
          </DropdownMenu.Group>
          <DropdownMenu.Separator/>
          {@render examDestinations()}
          <DropdownMenu.Separator/>
          <DropdownMenu.Group data-breadcrumb-section="papers" aria-label={t('试卷与练习','Exams & practice')}>
            {#each papers as paper(paper.id)}
              {@render destination(paper.problems[0].id,paperLabel(paper),paper.id===exam.id)}
            {/each}
          </DropdownMenu.Group>
          <DropdownMenu.Separator/>
          <DropdownMenu.Group data-breadcrumb-section="questions" aria-label={paperLabel(exam)}>
            {#each questions as question(question.id)}
              {@render destination(question.id,`${t('第 '+question.number+' 题','Q'+question.number)} · ${question.title[locale]}`,question.id===problem.id,question.id===problem.id)}
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="breadcrumb-partial shrink-0"/>
    <Breadcrumb.Item class="breadcrumb-upstream breadcrumb-course shrink-0">
      <DropdownMenu.Root open={openMenu==='course'} onOpenChange={open=>openMenu=open?'course':null}>
        <Tooltip.Root disabled={Boolean(openMenu)} bind:open={()=>!openMenu&&openTooltip==='course',open=>openTooltip=open&&!openMenu?'course':null}>
          <Tooltip.Trigger>
            {#snippet child({props:tooltipProps})}
              <DropdownMenu.Trigger {...tooltipProps}>
                {#snippet child({props})}
                  <Breadcrumb.Link {...props} data-slot="breadcrumb-link" type={undefined} class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}
                    href={problemPath(home)} data-breadcrumb-menu="course"
                    aria-label={t(`${course.code} · 选择考试组`,`${course.code} · Choose an exam group`)}
                    onclick={event=>{props.onclick?.(event);if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)event.preventDefault();}}>
                    <GraduationCap data-icon="inline-start" class="breadcrumb-course-icon" aria-hidden="true"/>
                    <span class="breadcrumb-course-name">{course.code}</span><ChevronDown data-icon="inline-end" aria-hidden="true"/>
                  </Breadcrumb.Link>
                {/snippet}
              </DropdownMenu.Trigger>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>{t(`${course.code} · 选择考试组`,`${course.code} · Choose an exam group`)}</Tooltip.Content>
        </Tooltip.Root>
        <DropdownMenu.Content class="w-64 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          {@render examDestinations()}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="breadcrumb-upstream shrink-0"/>
    <Breadcrumb.Item class="breadcrumb-upstream shrink-0">
      <DropdownMenu.Root open={openMenu==='papers'} onOpenChange={open=>openMenu=open?'papers':null}>
        <DropdownMenu.Trigger class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}
          data-breadcrumb-menu="papers" aria-label={t(`Exam ${exam.number} · 选择试卷`,`Exam ${exam.number} · Choose a paper`)}>
          Exam {exam.number}<ChevronDown data-icon="inline-end" aria-hidden="true"/>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-80 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          <DropdownMenu.Group data-breadcrumb-section="papers" aria-label={t('试卷与练习','Exams & practice')}>
            {#each papers as paper(paper.id)}
              {@render destination(paper.problems[0].id,paperLabel(paper),paper.id===exam.id)}
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="breadcrumb-upstream shrink-0"/>
    <Breadcrumb.Item class="breadcrumb-paper min-w-0 shrink">
      <DropdownMenu.Root open={openMenu==='questions'} onOpenChange={open=>openMenu=open?'questions':null}>
        <Tooltip.Root disabled={Boolean(openMenu)} bind:open={()=>!openMenu&&openTooltip==='questions',open=>openTooltip=open&&!openMenu?'questions':null}>
          <Tooltip.Trigger>
            {#snippet child({props})}
              <DropdownMenu.Trigger {...props} data-slot="dropdown-menu-trigger" class={buttonVariants({variant:'ghost',size:'sm',class:'min-w-0 max-w-full shrink px-1'})}
                data-breadcrumb-menu="questions"
                aria-label={t(`${paperLabel(exam)} · 选择题目`,`${paperLabel(exam)} · Choose a problem`)}>
                <span class="truncate">{paperLabel(exam)}</span><ChevronDown data-icon="inline-end" aria-hidden="true"/>
              </DropdownMenu.Trigger>
            {/snippet}
          </Tooltip.Trigger>
          <Tooltip.Content>{paperLabel(exam)}</Tooltip.Content>
        </Tooltip.Root>
        <DropdownMenu.Content class="w-80 max-w-[calc(100vw-2rem)]" collisionPadding={12} onCloseAutoFocus={returnFocus}>
          <DropdownMenu.Group data-breadcrumb-section="questions" aria-label={paperLabel(exam)}>
            {#each questions as question(question.id)}
              {@render destination(question.id,`${t('第 '+question.number+' 题','Q'+question.number)} · ${question.title[locale]}`,question.id===problem.id,question.id===problem.id)}
            {/each}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Breadcrumb.Item>
    <Breadcrumb.Separator class="breadcrumb-current-separator shrink-0"/>
    <Breadcrumb.Item class="shrink-0">
      <Tooltip.Root disabled={Boolean(openMenu)} bind:open={()=>!openMenu&&openTooltip==='current',open=>openTooltip=open&&!openMenu?'current':null}>
        <Tooltip.Trigger type={undefined}>
          {#snippet child({props})}
            <Breadcrumb.Page {...props} data-slot="breadcrumb-page" aria-label={t(`第 ${problem.number} 题：${problem.title.zh}`,`Problem ${problem.number}: ${problem.title.en}`)}>
              <span class="breadcrumb-current-full">{t(`第 ${problem.number} 题`,`Q${problem.number}`)}</span><span class="breadcrumb-current-short" aria-hidden="true">Q{problem.number}</span>
            </Breadcrumb.Page>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>{problem.title[locale]}</Tooltip.Content>
      </Tooltip.Root>
    </Breadcrumb.Item>
  </Breadcrumb.List>
  <!-- Non-interactive native-size samples: never duplicate links, IDs or current-page semantics. -->
  <div class="breadcrumb-measurements" aria-hidden="true" inert>
    <div bind:this={measurements} class="breadcrumb-measure-row text-sm">
      <span data-measure="course" data-slot="button" class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}><GraduationCap data-icon="inline-start" class="hidden"/>{course.code}<ChevronDown data-icon="inline-end"/></span>
      <span data-measure="courseIcon" data-slot="button" class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}><GraduationCap data-icon="inline-start"/><ChevronDown data-icon="inline-end"/></span>
      <span data-measure="group" data-slot="button" class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}>Exam {exam.number}<ChevronDown data-icon="inline-end"/></span>
      <span data-measure="paper" data-slot="button" class={buttonVariants({variant:'ghost',size:'sm',class:'px-1'})}>{paperLabel(exam)}<ChevronDown data-icon="inline-end"/></span>
      <span data-measure="path" data-slot="button" class={buttonVariants({variant:'ghost',size:'icon-sm'})}><Ellipsis/></span>
      <span data-measure="current">{t(`第 ${problem.number} 题`,`Q${problem.number}`)}</span>
    </div>
  </div>
</Breadcrumb.Root>
