import type { InOneLanguage } from './types';

export const CONTENT_LOCALES = { en: 'en', zh: 'zh-cn' } as const;
export function localeFromPath(path: string) {
  const folder = path.replaceAll('\\', '/').split('/').at(-4);
  if (folder === 'en') return 'en';
  if (folder === 'zh-cn') return 'zh';
  throw new Error(`${path}: expected an en/ or zh-cn/ paper directory`);
}

/** Pair stable identities; each language keeps its own complete Markdown solution. */
export function joinTranslations<T>(en: InOneLanguage<T>, zh: InOneLanguage<T>, path: string): T {
  function join(a: unknown, b: unknown, at: string): unknown {
    if (/(?:^|\.)(?:title|topic|statement|prompt|figureCaption|caption|solution|guide|note|term)$/.test(at)
      || /\.lectures\[\d+\]\.label$/.test(at)) {
      if (at.endsWith('.note') && (a === undefined || b === undefined))
        return { ...(typeof a === 'string' ? { en: a } : {}), ...(typeof b === 'string' ? { zh: b } : {}) };
      if (typeof a !== 'string' || typeof b !== 'string') throw new Error(`${at}: both language files must provide text`);
      return { en: a, zh: b };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (/\.(?:parts|problems)$/.test(at) && a.length === b.length) {
        const ids = new Map(b.map(item => [item.id, item]));
        if (ids.size === a.length && a.every(item => ids.has(item.id)))
          return a.map((value, index) => join(value, ids.get(value.id), `${at}[${index}]`));
        throw new Error(`${at}: language files must have the same stable IDs`);
      }
      if (a.length === b.length) return a.map((value, index) => join(value, b[index], `${at}[${index}]`));
    } else if (a && b && typeof a === 'object' && typeof b === 'object') {
      const first = a as Record<string, unknown>, second = b as Record<string, unknown>;
      const keys = [...new Set([...Object.keys(first), ...Object.keys(second)])];
      if (keys.every(key => key === 'note' || Object.hasOwn(first,key) && Object.hasOwn(second,key)))
        return Object.fromEntries(keys.map(key => [key, join(first[key], second[key], `${at}.${key}`)]));
    } else if (a === b) return a;
    throw new Error(`${at}: language files must agree on IDs, scores and source metadata`);
  }
  return join(en, zh, path) as T;
}
