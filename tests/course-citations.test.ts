import {describe,expect,test} from 'bun:test';
import {readFileSync,existsSync} from 'node:fs';
import {unlinkedCourseCitations} from '../content/course-citations';
import {papers,documentsByLocale} from '../content/catalog.server';
import {pageReferences} from '../content/text';
import {assetSource} from '../content/papers.server';

describe('Clickable course-material citations',()=>{
  test('finds named lectures, ranges, combined lectures and parallel page references in both languages',()=>{
    expect(unlinkedCourseCitations('Use Lecture 9, pages 5–6.')).toEqual([{text:'Lecture 9, pages 5–6',doc:'lecture-09',pages:[5,6]}]);
    expect(unlinkedCourseCitations('使用第 9 讲第 5、6 页。')).toEqual([{text:'第 9 讲第 5、6 页',doc:'lecture-09',pages:[5,6]}]);
    expect(unlinkedCourseCitations('Lecture 11–12, PDF page 23')).toEqual([{text:'Lecture 11–12, PDF page 23',doc:'lecture-11-12',pages:[23]}]);
    expect(unlinkedCourseCitations('见第 9 讲。')[0].pages).toEqual([]);
  });
  test('also catches unlinked page-only continuations after a linked source, including across inline math',()=>{
    const source='[Lecture 6, PDF page 6](/pages/lecture-06/6.webp)';
    expect(unlinkedCourseCitations(`Use ${source} with $V=RI$, and the definition from page 10.`)).toEqual([{text:'page 10',doc:'lecture-06',pages:[10]}]);
    expect(unlinkedCourseCitations('使用[第 6 讲第 6 页](/pages/lecture-06/6.webp)的关系及第 10 页的定义。')).toEqual([{text:'第 10 页',doc:'lecture-06',pages:[10]}]);
    expect(unlinkedCourseCitations(`${source} and [page 10](/pages/lecture-06/10.webp).`)).toEqual([]);
  });
  test('accepts individually linked endpoints without changing visible citation wording',()=>{
    expect(unlinkedCourseCitations('[第 9 讲第 5](/pages/lecture-09/5.webp)–[6 页](/pages/lecture-09/6.webp)')).toEqual([]);
    expect(unlinkedCourseCitations('[Lecture 10, pages 18](/pages/lecture-10/18.webp) and [24](/pages/lecture-10/24.webp)')).toEqual([]);
    expect(unlinkedCourseCitations('Lecture 9, pages [5](/pages/lecture-09/5.webp)–[6](/pages/lecture-09/6.webp).')).toEqual([]);
    expect(unlinkedCourseCitations('第 9 讲第 [5](/pages/lecture-09/5.webp)、[6](/pages/lecture-09/6.webp) 页。')).toEqual([]);
    expect(unlinkedCourseCitations('Lecture 9, [page 5](/pages/lecture-10/5.webp).')[0].doc).toBe('lecture-09');
  });
  test('ignores code/math and never guesses a paper page from a preceding lecture',()=>{
    for(const source of ['`Lecture 9, page 5`','```md\nLecture 9, page 5\n```','$\\text{Lecture 9, page 5}$'])expect(unlinkedCourseCitations(source)).toEqual([]);
    expect(unlinkedCourseCitations('[Lecture 4, PDF page 25](/pages/lecture-04/25.webp); the official answer on solution PDF page 3 explains this.')).toEqual([]);
    expect(unlinkedCourseCitations('[第 4 讲第 25 页](/pages/lecture-04/25.webp)说明原理；官方解答 PDF 第 3 页给出解释。')).toEqual([]);
    expect(unlinkedCourseCitations('[Lecture 4, page 25](/pages/lecture-04/25.webp). PDF page 3 is a separate source.')).toEqual([]);
  });
  test('all discovered guides, solutions, correction notes and captions have linked lecture citations',()=>{
    let articles=0;
    for(const paper of papers)for(const question of paper.exam.problems)for(const locale of ['en','zh'] as const){
      articles++;
      const fields={guide:question.guide[locale],note:question.note?.[locale],caption:question.figureCaption?.[locale],
        ...Object.fromEntries(question.parts.flatMap(part=>[[`${part.id}.solution`,part.solution[locale]],[`${part.id}.note`,part.note?.[locale]],[`${part.id}.caption`,part.figureCaption?.[locale]]]))};
      for(const [field,body] of Object.entries(fields))if(body){
        expect(unlinkedCourseCitations(body),`${paper.name}/${question.id}/${locale}/${field}`).toEqual([]);
        for(const reference of pageReferences(body,documentsByLocale[locale])){
          const doc=documentsByLocale[locale][reference.doc];
          expect(existsSync(assetSource(`${doc.pageBase}/${reference.page}.webp`))).toBe(true);
        }
      }
    }
    expect(articles).toBeGreaterThan(0);
  });
  test('the reported winding-design citation opens both actual lecture pages in both languages',()=>{
    const question=papers.flatMap(p=>p.exam.problems).find(q=>q.id==='e2-s25-q5');
    if(!question)return;
    for(const locale of ['en','zh'] as const)expect(pageReferences(question.parts[0].solution[locale],documentsByLocale[locale])).toEqual([{doc:'lecture-09',page:5},{doc:'lecture-09',page:6}]);
  });
  test('AGENTS explicitly requires citations beside claims instead of relying on navigation references',()=>{
    const instructions=readFileSync('AGENTS.md','utf8');
    expect(instructions).toContain('Course-material citations in authored prose must be clickable inline links beside the claim.');
    expect(instructions).toContain('Do not leave “Lecture 9, pages 5–6”');
    expect(instructions).toContain('docs/solution-style.md');
  });
});
