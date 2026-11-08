import type { Locale } from './types';
import { course } from '../../content/course';

export const STORAGE_KEY = course.storageKey;

export function readSavedLocale(): Locale {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return data.version === 1 && data.locale === 'en' ? 'en' : 'zh';
  } catch { return 'zh'; }
}

/** Change the error-page language without replacing saved study records. */
export async function saveLocale(locale: Locale) {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    try { await navigator.locks.request(STORAGE_KEY, () => writeLocale(locale)); }
    catch { /* Keep the existing record if coordination is unavailable. */ }
  } else writeLocale(locale);
}

function writeLocale(locale: Locale) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    if (data.version !== undefined && data.version !== 1) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1, locale }));
  } catch { /* The language can still change when storage is unavailable. */ }
}
