/** Keep ordinary inline formulas stable before independently fetched fonts arrive. */
export function criticalFontInlineLimit(filePath: string): true | undefined {
  // Leave every other asset on Vite's default policy. In particular, do not embed
  // all KaTeX formats/families or the much larger Inter/CJK font sets.
  return /(?:^|\/)katex\/dist\/fonts\/KaTeX_(?:Main-Regular|Math-Italic)\.woff2$/
    .test(filePath.replaceAll('\\', '/')) ? true : undefined;
}
