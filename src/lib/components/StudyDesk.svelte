<script lang="ts">
  import {onMount,tick,untrack} from 'svelte';
  import {navigate,type TransitionBeforeSwapEvent} from 'astro:transitions/client';
  import {preserveNavigationScroll} from '#lib/navigation-scroll';
  import {BitsConfig} from 'bits-ui';
  import * as Tabs from '#lib/components/ui/tabs';
  import * as Accordion from '#lib/components/ui/accordion';
  import * as Sheet from '#lib/components/ui/sheet';
  import * as Tooltip from '#lib/components/ui/tooltip';
  import * as Alert from '#lib/components/ui/alert';
  import {Button,buttonVariants} from '#lib/components/ui/button';
  import {Separator} from '#lib/components/ui/separator';
  import FileText from '@lucide/svelte/icons/file-text';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import BookmarkCheck from '@lucide/svelte/icons/bookmark-check';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import PanelRight from '@lucide/svelte/icons/panel-right';
  import PanelLeft from '@lucide/svelte/icons/panel-left';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import Layers from '@lucide/svelte/icons/layers';
  import ChevronsUp from '@lucide/svelte/icons/chevrons-up';
  import Info from '@lucide/svelte/icons/info';
  import Navigation from '#lib/components/Navigation.svelte';
  import StudyBreadcrumb from '#lib/components/StudyBreadcrumb.svelte';
  import ReferenceRail from '#lib/components/ReferenceRail.svelte';
  import SourceViewer from '#lib/components/SourceViewer.svelte';
  import SourcePage from '#lib/components/SourcePage.svelte';
  import Library from '#lib/components/Library.svelte';
  import Figure from '#lib/components/Figure.svelte';
  import RichText from '#lib/components/RichText.svelte';
  import ReferencedText from '#lib/components/ReferencedText.svelte';
  import ProblemPart from '#lib/components/ProblemPart.svelte';
  import {StudyState,STORAGE_KEY} from '#lib/study.svelte';
  import {course,pageTitle,sourceName,studyDescription} from '../../../content/course';
  import {provideFormulaPreviews} from '#lib/formula-preview.svelte';
  import {createCatalog} from '#lib/catalog';
  import {problemPath} from '#lib/problem-navigation';
  import type {SourceRef,StudyPageData} from '#lib/types';

  let {data}:{data:StudyPageData}=$props();
  const formulaPreviews=provideFormulaPreviews();
  const study:StudyState=untrack(()=>new StudyState(()=>catalog,data.problem.id));
  const catalog=$derived(createCatalog(data.examIndex,data.documents[study.locale]));
  const assetBase=$derived(data.assetBase[study.locale]);
  const documents=$derived(catalog.documents);
  let systemDark=$state(false);
  const dark=$derived(study.theme==='dark'||(study.theme==='system'&&systemDark));
  const problem=$derived(data.problem);
  const exam=$derived(data.exam);
  const completed=$derived(study.count(problem.parts.map(p=>p.id)));
  const originalPages=$derived([...new Set([...problem.parts.map(p=>p.sourcePage),problem.originalFigure.page])].sort((a,b)=>a-b));
  let view=$state('learn');
  let openParts=$state<string[]>([]);
  let source=$state<SourceRef|null>(null);
  let navOpen=$state(false);
  let railOpen=$state(false);
  let compactNavigation=$state(false);
  let compactReferences=$state(false);
  let libraryOpen=$state(false);
  let libraryKind=$state('crib');
  let mobileNavExam=$state<string|undefined>();
  let mobileRailTab=$state('formulas');
  let sourceTrigger: HTMLElement | null = null;
  let libraryTrigger: HTMLElement | null = null;
  let libraryOrigin: 'navigation' | 'references' = 'navigation';
  let libraryFromSheet = false;
  let restoreTraversalFocus=$state<(()=>void)|undefined>();
  const t=(zh:string,en:string)=>study.locale==='zh'?zh:en;
  const navigationLabel=$derived(compactNavigation?t('打开试卷导航','Open exam navigation'):t(study.navigationOpen?'收起试卷导航':'展开试卷导航',study.navigationOpen?'Collapse exam navigation':'Expand exam navigation'));
  const referencesLabel=$derived(compactReferences?t('打开公式与课件','Open formulas and lectures'):t(study.referencesOpen?'收起公式与课件侧栏':'展开公式与课件侧栏',study.referencesOpen?'Collapse reference sidebar':'Expand reference sidebar'));

  $effect(()=>{study.selected=problem.id;mobileNavExam=exam.id;openParts=[];view='learn';formulaPreviews.active=null;});
  $effect(()=>{const serialized=study.serialize();if(study.ready)untrack(()=>study.persist(serialized));});
  $effect(()=>{problem.id;if(study.ready)untrack(()=>restoreTraversalFocus?.());});
  $effect(()=>{if(study.ready){document.documentElement.classList.toggle('dark',dark);document.documentElement.lang=study.locale==='zh'?'zh-CN':'en';document.documentElement.style.colorScheme=dark?'dark':'light';document.documentElement.dataset.navigation=study.navigationOpen?'open':'closed';document.documentElement.dataset.references=study.referencesOpen?'open':'closed';}});
  $effect(()=>{
    if(!study.ready)return;
    document.title=pageTitle(problem.title[study.locale]);
    document.querySelector('meta[name="description"]')?.setAttribute('content',studyDescription(study.locale,catalog.exams.length,catalog.totalParts));
  });

  function library(kind:string,origin:'navigation'|'references'='navigation'){
    libraryTrigger=document.activeElement instanceof HTMLElement?document.activeElement:null;
    libraryOrigin=origin;
    libraryFromSheet=Boolean(libraryTrigger?.closest('#mobile-exam-navigation, #mobile-reference-sidebar'));
    libraryKind=kind;libraryOpen=true;navOpen=false;railOpen=false;
  }
  function returnFromLibrary(event:Event){
    event.preventDefault();
    if(!libraryFromSheet&&libraryTrigger?.isConnected&&!libraryTrigger.closest('[inert], [hidden]')&&libraryTrigger.getClientRects().length){
      libraryTrigger.focus({preventScroll:true});
    }else{
      document.querySelector<HTMLElement>(`[data-sidebar-toggle="${libraryOrigin}"]`)?.focus({preventScroll:true});
    }
  }
  function openSource(ref:SourceRef){sourceTrigger=document.activeElement as HTMLElement;source=ref;railOpen=false;}
  function returnFromSource(event: Event){
    if(sourceTrigger?.isConnected&&!sourceTrigger.closest('[inert], [hidden]')){event.preventDefault();sourceTrigger.focus({preventScroll:true});}
    else{event.preventDefault();document.querySelector<HTMLElement>('[data-sidebar-toggle="references"]')?.focus({preventScroll:true});}
  }
  function panelCloseFocus(event: Event){if(source||libraryOpen)event.preventDefault();}
  async function select(id:string){
    if(!catalog.problemIds.has(id))return;
    navOpen=false;view='learn';
    await navigate(problemPath(id));await tick();
    // A newer navigation (including Back) owns scrolling and focus now.
    if(problem.id!==id||location.pathname!==problemPath(id))return;
    window.scrollTo({top:0,behavior:'instant'});document.getElementById('problem-title')?.focus({preventScroll:true});
  }
  function toggleSolutions(){
    if(openParts.length){openParts=[];return;}
    openParts=problem.parts.map(p=>p.id);
  }
  function focusOutsidePanel(id:string,toggle:string){
    if(document.getElementById(id)?.contains(document.activeElement))
      document.querySelector<HTMLElement>('[data-sidebar-toggle="'+toggle+'"]')?.focus({preventScroll:true});
  }
  function toggleNavigation(){
    if(compactNavigation)navOpen=!navOpen;
    else{if(study.navigationOpen)focusOutsidePanel('exam-navigation','navigation');study.navigationOpen=!study.navigationOpen;}
  }
  function toggleReferences(){
    if(compactReferences)railOpen=!railOpen;
    else{if(study.referencesOpen)focusOutsidePanel('reference-sidebar','references');study.referencesOpen=!study.referencesOpen;}
  }
  onMount(()=>{
    let traversal:string|null=null;
    const beforeNavigation=(event:Event)=>{const next=event as Event & {navigationType:string;to:URL};traversal=next.navigationType==='traverse'?next.to.pathname:null;};
    const restoreReadingFocus=()=>{
      if(!traversal||location.pathname!==traversal||problemPath(problem.id).replace(/\/$/,'')!==traversal.replace(/\/$/,''))return;
      const destination=traversal;
      requestAnimationFrame(async()=>{
        await tick();
        if(traversal!==destination||location.pathname!==destination)return;
        const candidates=[...document.querySelectorAll<HTMLElement>('main button, main a, main [tabindex="0"]')];
        const target=candidates.find(node=>{const box=node.getBoundingClientRect();return box.height>0&&box.top>=80&&box.top<innerHeight-20;});
        target?.focus({preventScroll:true});
        traversal=null;
      });
    };
    restoreTraversalFocus=restoreReadingFocus;
    const beforeSwap=(event:TransitionBeforeSwapEvent)=>{
      const nextId=event.newDocument.querySelector<HTMLElement>('main[data-problem]')?.dataset.problem;
      const next=catalog.problemEntries.find(entry=>entry.problem.id===nextId);
      // Opening another paper already changes the directory before its link is
      // clicked. Preserve that position too; only a different Exam tab replaces
      // the directory and intentionally starts at the top.
      if(next?.exam.number!==exam.number)return;
      const scroller=document.querySelector<HTMLElement>('#exam-navigation .nav-body');
      if(scroller)preserveNavigationScroll(event,scroller);
    };
    document.addEventListener('astro:before-preparation',beforeNavigation);
    document.addEventListener('astro:before-swap',beforeSwap);
    document.addEventListener('astro:page-load',restoreReadingFocus);
    const preference=matchMedia('(prefers-color-scheme: dark)');systemDark=preference.matches;
    const onAppearance=(event:MediaQueryListEvent)=>systemDark=event.matches;preference.addEventListener('change',onAppearance);
    const navLayout=matchMedia('(max-width: 800px)'),refLayout=matchMedia('(max-width: 1180px)');
    compactNavigation=navLayout.matches;compactReferences=refLayout.matches;
    const onNavLayout=(event:MediaQueryListEvent)=>{if(event.matches)focusOutsidePanel('exam-navigation','navigation');compactNavigation=event.matches;if(!event.matches)navOpen=false;};
    const onRefLayout=(event:MediaQueryListEvent)=>{if(event.matches)focusOutsidePanel('reference-sidebar','references');compactReferences=event.matches;if(!event.matches)railOpen=false;};
    navLayout.addEventListener('change',onNavLayout);refLayout.addEventListener('change',onRefLayout);
    study.restore();study.selected=problem.id;study.ready=true;
    const stored=(event:StorageEvent)=>{if(event.key===STORAGE_KEY)untrack(()=>study.sync(event.newValue));};
    window.addEventListener('storage',stored);
    const hashPart=()=>{
      let id:string;
      try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
      if(problem.parts.some(p=>p.id===id)){
        openParts=[id];
        void tick().then(()=>requestAnimationFrame(()=>{
          if(location.hash!=='#'+encodeURIComponent(id))return;
          const target=document.querySelector<HTMLElement>(`[data-part="${id}"] .part-trigger`);
          target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'});
        }));
      }
    };
    hashPart();document.addEventListener('astro:page-load',hashPart);
    const keydown=(event:KeyboardEvent)=>{
      if([...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(node=>node.getClientRects().length))return;
      if((event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='b'){event.preventDefault();toggleNavigation();}
    };
    window.addEventListener('keydown',keydown);
    return()=>{preference.removeEventListener('change',onAppearance);navLayout.removeEventListener('change',onNavLayout);refLayout.removeEventListener('change',onRefLayout);window.removeEventListener('keydown',keydown);window.removeEventListener('storage',stored);document.removeEventListener('astro:page-load',hashPart);document.removeEventListener('astro:before-preparation',beforeNavigation);document.removeEventListener('astro:before-swap',beforeSwap);document.removeEventListener('astro:page-load',restoreReadingFocus);};
  });
</script>

<a class="skip-link" href="#main-content">{t('跳至题目','Skip to problem')}</a>
<BitsConfig defaultPortalTo="#fieldnotes-overlays">
<Tooltip.Provider delayDuration={250}>
  <div class="app-shell" data-navigation={study.navigationOpen?'open':'closed'}>
    <aside id="exam-navigation" class="desktop-navigation" aria-label={t('试卷导航','Exam navigation')} aria-hidden={compactNavigation||!study.navigationOpen} inert={compactNavigation||!study.navigationOpen}><Navigation {study} onselect={select} onlibrary={library}/></aside>
    <div class="workspace">
      <header class="topbar">
        <div class="toolbar-navigation">
          <Tooltip.Root>
            <Tooltip.Trigger onclick={toggleNavigation}>
              {#snippet child({props})}
                <Button {...props} data-slot="button" variant="ghost" size="icon" highlightExpanded={false} class="active:not-aria-[haspopup]:translate-y-0" data-sidebar-toggle="navigation" aria-label={navigationLabel} aria-controls={compactNavigation?'mobile-exam-navigation':'exam-navigation'} aria-expanded={compactNavigation?navOpen:study.navigationOpen} aria-keyshortcuts="Control+b Meta+b"><PanelLeft aria-hidden="true"/></Button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" align="start" sideOffset={8} collisionPadding={12}>{navigationLabel}{#if !compactNavigation} · Ctrl / ⌘ B{/if}</Tooltip.Content>
          </Tooltip.Root>
          <Separator orientation="vertical" class="h-5 data-vertical:self-center"/>
          <StudyBreadcrumb {catalog} {exam} {problem} locale={study.locale} onselect={select}/>
        </div>
        <div class="toolbar-actions">
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'sm'})} onclick={()=>study.locale=study.locale==='zh'?'en':'zh'} aria-label={t('Switch to English','切换为中文')}><span class="language-switch">{study.locale==='zh'?'EN':'中文'}</span></Tooltip.Trigger><Tooltip.Content>{t('切换为英文','Switch to Chinese')}</Tooltip.Content></Tooltip.Root>
          <Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'icon'})} onclick={()=>study.theme=dark?'light':'dark'} aria-label={t(dark?'切换浅色主题':'切换深色主题',dark?'Switch to light mode':'Switch to dark mode')}>{#if dark}<Sun aria-hidden="true"/>{:else}<Moon aria-hidden="true"/>{/if}</Tooltip.Trigger><Tooltip.Content>{t(dark?'浅色主题':'深色主题',dark?'Light mode':'Dark mode')}</Tooltip.Content></Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger onclick={toggleReferences}>
              {#snippet child({props})}
                <Button {...props} data-slot="button" variant="ghost" size="icon" highlightExpanded={false} class="active:not-aria-[haspopup]:translate-y-0" data-sidebar-toggle="references" aria-label={referencesLabel} aria-controls={compactReferences?'mobile-reference-sidebar':'reference-sidebar'} aria-expanded={compactReferences?railOpen:study.referencesOpen}><PanelRight aria-hidden="true"/></Button>
              {/snippet}
            </Tooltip.Trigger>
            <Tooltip.Content side="bottom" align="end" sideOffset={8} collisionPadding={12}>{referencesLabel}</Tooltip.Content>
          </Tooltip.Root>
        </div>
      </header>
      <div class="reading-layout" data-references={study.referencesOpen?'open':'closed'}>
        <main id="main-content" class="main-content" data-problem={problem.id} data-study-ready={study.ready}>
          <div class="problem-title-row"><div><p class="problem-kicker">{t('题目','PROBLEM')} {String(problem.number).padStart(2,'0')}</p><h1 id="problem-title" lang={study.locale==='zh'?'zh-CN':'en'} tabindex="-1">{problem.title[study.locale]}</h1></div><Tooltip.Root><Tooltip.Trigger class={buttonVariants({variant:'outline',size:'icon'})} onclick={()=>study.bookmarks[problem.id]=!study.bookmarks[problem.id]} aria-label={t(study.bookmarks[problem.id]?'取消收藏':'收藏此题',study.bookmarks[problem.id]?'Remove bookmark':'Bookmark problem')} aria-pressed={Boolean(study.bookmarks[problem.id])}>{#if study.bookmarks[problem.id]}<BookmarkCheck aria-hidden="true"/>{:else}<Bookmark aria-hidden="true"/>{/if}</Tooltip.Trigger><Tooltip.Content>{t(study.bookmarks[problem.id]?'已收藏':'留待再次练习',study.bookmarks[problem.id]?'Saved':'Save for another attempt')}</Tooltip.Content></Tooltip.Root></div>
          <p class="problem-subtitle">{problem.topic[study.locale]}<span>·</span>{t('先写方程，再代入数值。','Start with the equation. Then work through the numbers.')}</p>
          <div class="problem-lectures lecture-badges"><GraduationCap aria-hidden="true"/>{#each [...new Set(problem.lectures.map(l=>l.doc))] as doc(doc)}<Button variant="ghost" size="sm" onclick={()=>openSource(problem.lectures.find(l=>l.doc===doc)!)}>{sourceName(doc,documents)}</Button>{/each}</div>
          {#if study.storageError}<Alert.Root class="storage-status"><Info aria-hidden="true"/><Alert.Title>{t('浏览器存储暂不可用','Browser storage is unavailable')}</Alert.Title><Alert.Description>{t('本次更改尚未保存，原记录保持不变。可继续练习并重试。','Changes are not saved; your original record is preserved. Keep working and retry.')}</Alert.Description><Button variant="outline" size="sm" onclick={()=>study.persist(study.serialize())}>{t('重试保存','Retry saving')}</Button></Alert.Root>{/if}
          <Tabs.Root bind:value={view} class="problem-tabs">
            <Tabs.List variant="line" class="problem-tab-list"><Tabs.Trigger value="learn"><Layers aria-hidden="true"/>{t('题目与推导','Problem & solution')}</Tabs.Trigger><Tabs.Trigger value="source"><FileText aria-hidden="true"/>{t('试卷原页','Source pages')}</Tabs.Trigger></Tabs.List>
            <Tabs.Content value="learn">
              <section class="problem-statement" aria-label={t('题目条件','Problem statement')}><div class="section-label"><span>01</span>{t('试卷原题','THE ORIGINAL QUESTION')}</div><div class="original-statement" lang={study.locale==='zh'?'zh-CN':'en'} data-original-statement><RichText text={problem.statement[study.locale]}/></div></section>
              {#if problem.figure && !problem.figureAtParts}<Figure {assetBase} size={data.figureSizes[study.locale][problem.figure]} name={problem.figure} locale={study.locale} {dark} caption={problem.figureCaption} original={problem.figureOriginal===false?undefined:problem.originalFigure}/>{/if}
              <div class="solution-actions"><Button variant="ghost" size="sm" data-solution-toggle onclick={toggleSolutions} aria-controls="worked-parts" aria-expanded={openParts.length>0}>{#if openParts.length}{t('收起全部解答','Collapse all solutions')}<ChevronsUp data-icon="inline-end" aria-hidden="true"/>{:else}{t('展开全部解答','Reveal all solutions')}<Layers data-icon="inline-end" aria-hidden="true"/>{/if}</Button></div>
              <Accordion.Root id="worked-parts" type="multiple" bind:value={openParts}>{#each problem.parts as part(part.id)}<ProblemPart {assetBase} sizes={data.figureSizes[study.locale]} {part} {study} {exam} {dark} active={openParts.includes(part.id)&&!source&&!libraryOpen&&!navOpen&&!railOpen} onsource={openSource}/>{/each}</Accordion.Root>
              {#if problem.note?.[study.locale]}<Alert.Root class="problem-model-note"><Info aria-hidden="true"/><Alert.Title>{t('模型与原题说明','Model & source note')}</Alert.Title><Alert.Description><ReferencedText text={problem.note[study.locale]!} locale={study.locale} {documents} onsource={openSource}/></Alert.Description></Alert.Root>{/if}
              <div class="problem-completion"><div><CircleCheck aria-hidden="true"/><span>{completed}/{problem.parts.length} {t('小问已掌握','parts mastered')}</span></div><span>{t('掌握后自行标记，进度自动保存。','Mark your understanding; progress saves automatically.')}</span></div>
            </Tabs.Content>
            <Tabs.Content value="source"><div class="source-tab-heading"><p>{t('查看试卷 PDF、插图与题号。重制卷会在页内注明。点击页面可放大查看。','Exam PDF, figures and numbering. Reconstructed editions are identified on the page. Open any page to inspect it.')}</p>{#if !exam.questionsOnly}<Alert.Root><Info aria-hidden="true"/><Alert.Description>{t('来源 PDF 为题目与解答合并版本，原页会显示答案。练习可使用“题目与推导”中的网页原生题目。','This source PDF combines questions and solutions. Source pages show answers; use the native problem view for practice.')}</Alert.Description></Alert.Root>{/if}</div>
              {#each originalPages as page(page)}<SourcePage doc={documents[exam.doc]} {page} locale={study.locale} alt={t(`Exam ${exam.number} · ${exam.term.zh} ${exam.year ?? ''} · 第 ${page} 页`,`Exam ${exam.number}, ${exam.term.en} ${exam.year ?? ''}, page ${page}`)} onopen={()=>openSource({doc:exam.doc,page,label:{zh:'原始试题',en:'Original exam'}})}/>{/each}
            </Tabs.Content>
          </Tabs.Root>
          <footer class="reading-footer"><span>{course.brand}</span><p>{t('把答案连回原理。','Connect the answer to the idea.')}<small>{course.code} · {catalog.totalParts} {t('小问','worked parts')}</small></p></footer>
        </main>
        <aside id="reference-sidebar" class="reference-rail" aria-label={t('公式与课件引用','Formula and lecture references')} aria-hidden={compactReferences||!study.referencesOpen} inert={compactReferences||!study.referencesOpen}><ReferenceRail {documents} {problem} locale={study.locale} onsource={openSource} onlibrary={(kind)=>library(kind,'references')}/></aside>
      </div>
    </div>
  </div>
  <Sheet.Root bind:open={navOpen}><Sheet.Content onCloseAutoFocus={panelCloseFocus} id="mobile-exam-navigation" closeLabel={t('关闭','Close')} side="left" class="mobile-nav-sheet"><Sheet.Header class="sr-only"><Sheet.Title>{t('试卷与资料导航','Exams and resources')}</Sheet.Title><Sheet.Description>{t('选择试卷、题目或学习资料。','Choose an exam, problem or course resource.')}</Sheet.Description></Sheet.Header><Navigation bind:openExam={mobileNavExam} {study} onselect={select} onlibrary={library}/></Sheet.Content></Sheet.Root>
  <Sheet.Root bind:open={railOpen}><Sheet.Content onCloseAutoFocus={panelCloseFocus} id="mobile-reference-sidebar" closeLabel={t('关闭','Close')} side="right" class="reference-sheet"><Sheet.Header><Sheet.Title>{t('公式与课程连接','Formulas and lectures')}</Sheet.Title><Sheet.Description>{t('查看本题使用的公式与对应讲义。','The equations and lecture pages used in this problem.')}</Sheet.Description></Sheet.Header><ReferenceRail bind:tab={mobileRailTab} {documents} {problem} locale={study.locale} onsource={openSource} onlibrary={(kind)=>library(kind,'references')}/></Sheet.Content></Sheet.Root>
  <Library bind:open={libraryOpen} bind:kind={libraryKind} {study} onsource={openSource} onselect={select} onCloseAutoFocus={returnFromLibrary}/>
  <SourceViewer {source} {documents} locale={study.locale} onCloseAutoFocus={returnFromSource} onclose={()=>source=null}/>
</Tooltip.Provider>
</BitsConfig>
