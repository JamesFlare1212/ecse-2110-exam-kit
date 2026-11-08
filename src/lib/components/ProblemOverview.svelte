<script lang="ts">
  import * as Tooltip from '#lib/components/ui/tooltip';
  import { buttonVariants } from '#lib/components/ui/button';
  import GraduationCap from '@lucide/svelte/icons/graduation-cap';
  import RichText from './RichText.svelte';
  import { sourceName } from '../../../content/course';
  import type { Problem, Locale, SourceRef, SourceDocument } from '#lib/types';
  let {problem,locale,documents,onsource}: {problem:Problem;locale:Locale;documents:Record<string,SourceDocument>;onsource:(source:SourceRef)=>void}=$props();
</script>

<section class="problem-overview" aria-labelledby="overview-title" data-problem-guide>
  <h2 id="overview-title">{locale==='zh'?'先读懂这道题':'Before the derivation'}</h2>
  <div class="overview-prose"><RichText text={problem.guide[locale]}/></div>
  <div class="overview-references">
    <span>{locale==='zh'?'讲义回顾':'In the lectures'}</span>
    <div class="flex flex-wrap gap-1">
      {#each problem.lectures as lecture(lecture.doc+'-'+lecture.page)}
        <Tooltip.Root>
          <Tooltip.Trigger class={buttonVariants({variant:'ghost',size:'sm'})} onclick={()=>onsource(lecture)} aria-label={sourceName(lecture.doc,documents)+' · p.'+lecture.page+' · '+lecture.label[locale]}>
            <GraduationCap data-icon="inline-start" aria-hidden="true"/>{sourceName(lecture.doc,documents)} · p.{lecture.page}
          </Tooltip.Trigger>
          <Tooltip.Content>{lecture.label[locale]}</Tooltip.Content>
        </Tooltip.Root>
      {/each}
    </div>
  </div>
</section>
