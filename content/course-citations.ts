import {parseText,type TextNode} from './text';

export interface UnlinkedCourseCitation {text:string;doc:string;pages:number[]}
const lectureNumber=String.raw`\d+(?:\s*[–—-]\s*\d+)?`;
const pageNumbers=String.raw`\d+(?:\s*(?:[–—-]|、|,|\band\b)\s*\d+)*`;
const tokens=new RegExp([
  String.raw`第\s*(${lectureNumber})\s*讲(?:\s*PDF)?\s*第\s*(${pageNumbers})\s*页`,
  String.raw`\bLecture\s+(${lectureNumber}),?\s*(?:PDF\s+)?pages?\s+(${pageNumbers})`,
  String.raw`第\s*(${lectureNumber})\s*讲|\bLecture\s+(${lectureNumber})`,
  // An explicit change to an exam/solution source ends lecture-page inheritance.
  String.raw`\b(?:official (?:answer|solution)|solution PDF|source PDF)\b|官方解答|解答\s*PDF|源\s*PDF|原资料`,
  String.raw`第\s*(${pageNumbers})\s*页|\b(?:PDF\s+)?pages?\s+(${pageNumbers})`,
  String.raw`[。.!?！？]`,
].join('|'),'giu');
const lectureId=(number:string)=>'lecture-'+number.split(/\s*[–—-]\s*/).map(n=>n.padStart(2,'0')).join('-');
function pages(text:string):number[]{
  return text.split(/\s*(?:、|,|\band\b)\s*/).flatMap(part=>{
    const [start,end]=part.split(/\s*[–—-]\s*/).map(Number);
    return end===undefined?[start]:Array.from({length:Math.max(0,Math.min(end-start+1,200))},(_,i)=>start+i);
  });
}

/** Lint authored prose, never synthesize links at render time. Existing links,
 * math and code are left alone. A page-only continuation inherits the lecture
 * only within its sentence, including across emphasis, links and inline math.
 */
export function unlinkedCourseCitations(source:string):UnlinkedCourseCitation[]{
  const result:UnlinkedCourseCitation[]=[];
  function paragraph(node:TextNode){
    let document:string|undefined,pending:UnlinkedCourseCitation|undefined;
    function finish(){if(pending)result.push(pending);pending=undefined;document=undefined;}
    function inline(node:TextNode,linked=false){
      if(['math','inlineMath','code','inlineCode','image'].includes(node.type))return;
      if(node.type==='link'){
        const doc=/^\/pages\/(lecture-\d+(?:-\d+)?)\/[1-9]\d*\.webp$/.exec(node.url)?.[1];
        if(doc){if(pending?.doc===doc)pending=undefined;else if(document!==doc)finish();document=doc;}
      }
      if(node.type==='text'){
        for(const match of node.value.matchAll(tokens)){
          const number=match[1]??match[3]??match[5]??match[6];
          const pageList=match[2]??match[4]??match[7]??match[8];
          if(number){const doc=lectureId(number);if(document!==doc)finish();document=doc;}
          if(number||pageList){
            if(!linked&&document){
              const citation={text:match[0],doc:document,pages:pageList?pages(pageList):[]};
              // Allow “Lecture 9, pages [5](...)–[6](...)” without requiring
              // the document name itself to repeat a link.
              if(number&&!pageList)pending=citation;else result.push(citation);
            }
          }else finish();
        }
      }else if('children'in node)node.children.forEach(child=>inline(child,linked||node.type==='link'));
    }
    inline(node);finish();
  }
  function visit(node:TextNode){
    if(node.type==='paragraph'||node.type==='heading')paragraph(node);
    else if('children'in node)node.children.forEach(visit);
  }
  visit(parseText(source));return result;
}
