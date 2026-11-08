import katex from 'katex';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import type { Root, RootContent, PhrasingContent, ListItem } from 'mdast';
import { mathClosingPunctuation } from '../../content/text';

export function renderMath(tex: string, displayMode = false) {
  return katex.renderToString(tex, {displayMode, throwOnError:false, strict:'ignore', trust:false, output:'htmlAndMathml'});
}
function escape(text: string) {
  return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
export function renderText(text: string) {
  const tree = fromMarkdown(text, { extensions: [math()], mdastExtensions: [mathFromMarkdown()] });
  return renderMarkdownNode(tree, text);
}

/** Phrasing-safe Markdown also works inside accordion buttons and captions. */
function renderMarkdownNode(node: Root | RootContent | PhrasingContent | ListItem, source: string): string {
  const render = (child: RootContent | PhrasingContent | ListItem) => renderMarkdownNode(child, source);
  const children = () => {
    if (!('children' in node)) return '';
    const nodes = node.children;
    return nodes.map((child, index) => {
      const punctuation = mathClosingPunctuation(child, nodes[index + 1], source);
      if (punctuation) return `<span class="math-with-punctuation">${render(child)}${escape(punctuation)}</span>`;
      const preceding = index > 0 ? mathClosingPunctuation(nodes[index - 1], child, source) : '';
      return preceding && child.type === 'text' ? render({ ...child, value: child.value.slice(preceding.length) }) : render(child);
    }).join('');
  };
  switch (node.type) {
    case 'root': return node.children.map(render).join('<br><br>');
    case 'paragraph': case 'listItem': return children();
    case 'text': return escape(node.value).replaceAll('\n', '<br>');
    case 'inlineMath': return renderMath(node.value, source.slice(node.position?.start.offset ?? 0).startsWith('$$'));
    case 'math': return renderMath(node.value, true);
    case 'emphasis': return `<em>${children()}</em>`;
    case 'strong': return `<strong>${children()}</strong>`;
    case 'inlineCode': return `<code>${escape(node.value)}</code>`;
    case 'code': return `<code class="markdown-code-block">${escape(node.value)}</code>`;
    case 'break': return '<br>';
    case 'link': {
      const url = node.url.trim();
      const safe = !/[\u0000-\u001f]/.test(url) && !url.startsWith('//')
        && (!/^[a-z][a-z\d+.-]*:/i.test(url) || /^(?:https?:|mailto:)/i.test(url));
      return safe ? `<a href="${escape(url)}"${node.title ? ` title="${escape(node.title)}"` : ''}>${children()}</a>` : children();
    }
    case 'list': return `<span class="markdown-list" role="list">${node.children.map((item, index) =>
      `<span class="markdown-list-item" role="listitem"><span aria-hidden="true">${node.ordered ? `${(node.start ?? 1) + index}.` : '•'}</span><span>${render(item)}</span></span>`,
    ).join('')}</span>`;
    case 'blockquote': return `<span class="markdown-quote">${children()}</span>`;
    case 'heading': return `<strong>${children()}</strong>`;
    case 'html': return escape(node.value);
    case 'image': case 'imageReference': return escape(node.alt ?? '');
    case 'linkReference': return children();
    case 'thematicBreak': return '<span class="markdown-rule" role="separator"></span>';
    case 'definition': return '';
  }
  return 'value' in node ? escape(String(node.value)) : children();
}

/** Text alternatives use KaTeX's Unicode MathML, without spoken TeX commands. */
export function plainText(text: string) {
  return text.replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, (_, display, inline) => {
    const html = renderMath(display ?? inline);
    return (html.match(/<math\b[^>]*>([\s\S]*?)<\/math>/)?.[1] ?? '')
      .replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(
        code.startsWith('x') ? parseInt(code.slice(1), 16) : Number(code),
      ))
      .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
  });
}
