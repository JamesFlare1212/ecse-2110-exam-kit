import {parseText,type TextNode} from '../../content/text';
import {plainText} from '../../src/lib/math';

/** Ignore only presentation: Markdown containers, TeX layout, spacing and math glyph variants. */
export function semanticMarkdown(source:string):string {
  function visit(node:TextNode):string {
    if(node.type==='math'||node.type==='inlineMath')return plainText(`$${node.value}$`);
    if(node.type==='text'||node.type==='code'||node.type==='inlineCode')return node.value;
    if(node.type==='image')return node.alt??'';
    return 'children'in node?node.children.map(visit).join(' '):'';
  }
  return visit(parseText(source)).normalize('NFC').replace(/[\s\u200b-\u200f\u2060-\u2064\ufeff]/gu,'').replace(/−/g,'-').replace(/∘/g,'°').replace(/⋅/g,'·');
}
