import { expect, test } from 'bun:test';
import { readSavedLocale, saveLocale, STORAGE_KEY } from '../src/lib/locale';

function withStorage(raw: string | null, run: (stored: () => string | null) => void) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let value = raw;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => key === STORAGE_KEY ? value : null,
    setItem: (key: string, next: string) => { if (key === STORAGE_KEY) value = next; },
  } });
  try { run(() => value); }
  finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('changing language on an error page preserves study and legacy records', () => {
  const saved = { version: 1, locale: 'en', selected: 'e1-f25-q1', theme: 'dark',
    completed: { 'e9-f99-q1-a': true }, bookmarks: { 'e1-f25-q1': true },
    revealed: { 'e1-f25-q1-a': 3 }, notes: { 'e1-f25-q1': 'Legacy note' },
    sidebars: { navigation: false, references: true } };
  withStorage(JSON.stringify(saved), stored => {
    expect(readSavedLocale()).toBe('en');
    saveLocale('zh');
    expect(JSON.parse(stored()!)).toEqual({ ...saved, locale: 'zh' });
    expect(readSavedLocale()).toBe('zh');
  });
});

test('locale recovery leaves unsupported and malformed stored records intact', () => {
  for (const raw of [JSON.stringify({ version: 2, locale: 'en', completed: { saved: true } }), 'null', '[]', '{']) {
    withStorage(raw, stored => {
      expect(readSavedLocale()).toBe('zh');
      saveLocale('en');
      expect(stored()).toBe(raw);
    });
  }
});

test('an error page can save a language before any problem has been visited', () => {
  withStorage(null, stored => {
    saveLocale('en');
    expect(JSON.parse(stored()!)).toEqual({ version: 1, locale: 'en' });
    expect(readSavedLocale()).toBe('en');
  });
});
