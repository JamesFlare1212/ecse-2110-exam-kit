import type { Catalog } from './catalog';
import type { Locale } from './types';
import { DEFAULT_PROBLEM_ID } from './problem-navigation';
import { STORAGE_KEY } from './locale';
import { mergeStudyRecords, parseStudyRecord, record, type StudyRecord } from './study-storage';

export { STORAGE_KEY } from './locale';
const problemRecord = /^[ep][1-9]\d*-(?:[fs]\d{2}|u00)-q[1-9]\d*$/;
const partRecord = /^[ep][1-9]\d*-(?:[fs]\d{2}|u00)-q[1-9]\d*-[a-z0-9]+$/;
export class StudyState {
  locale = $state<Locale>('zh');
  theme = $state<'light' | 'dark' | 'system'>('system');
  selected = $state(DEFAULT_PROBLEM_ID);
  navigationOpen = $state(true);
  referencesOpen = $state(true);
  completed = $state<Record<string, boolean>>({});
  bookmarks = $state<Record<string, boolean>>({});
  // Compatibility only: retain previously saved text without a note-taking UI.
  private legacyNotes?: Record<string, string>;
  // Retain the retired preference without exposing or applying reading modes.
  private legacyMode?: 'study' | 'practice';
  // Compatibility only: retain saved step counts; accordions reveal full solutions.
  revealed = $state<Record<string, number>>({});
  ready = $state(false);
  storageError = $state(false);
  private saved: StudyRecord = {version: 1};
  private preserved: StudyRecord = {version: 1};

  constructor(private readonly getCatalog: () => Catalog, selected = DEFAULT_PROBLEM_ID) {
    this.selected = selected;
  }
  get catalog() { return this.getCatalog(); }

  restore(raw?: string | null) {
    try {
      const data = parseStudyRecord(raw === undefined ? localStorage.getItem(STORAGE_KEY) : raw);
      this.saved = data;
      this.apply(data, true);
    } catch { this.storageError = true; }
  }
  private apply(data: StudyRecord, restoreSelection = false) {
      this.preserved = data;
      const { problemIds } = this.catalog;
      if (data.locale === 'zh' || data.locale === 'en') this.locale = data.locale;
      if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'system') this.theme = data.theme;
      if (data.mode === 'study' || data.mode === 'practice') this.legacyMode = data.mode;
      if (restoreSelection && typeof data.selected === 'string' && problemIds.has(data.selected)) this.selected = data.selected;
      const sidebars = record(data.sidebars);
      if (typeof sidebars.navigation === 'boolean') this.navigationOpen = sidebars.navigation;
      if (typeof sidebars.references === 'boolean') this.referencesOpen = sidebars.references;
      // Keep records for unplugged papers so putting them back restores progress.
      const booleans = (value: unknown, valid: RegExp) => {
        if (!value || typeof value !== 'object') return {};
        return Object.fromEntries(Object.entries(value).filter(([key,v]) => valid.test(key) && typeof v === 'boolean')) as Record<string,boolean>;
      };
      this.completed = booleans(data.completed, partRecord);
      this.bookmarks = booleans(data.bookmarks, problemRecord);
      if (data.notes && typeof data.notes === 'object') {
        this.legacyNotes = Object.fromEntries(Object.entries(data.notes).filter(([key,value]) =>
          (partRecord.test(key) || problemRecord.test(key)) && typeof value === 'string')) as Record<string,string>;
      }
      if (data.revealed && typeof data.revealed === 'object') {
        this.revealed = Object.fromEntries(Object.entries(data.revealed).filter(([key,value]) => partRecord.test(key) && Number.isInteger(value) && (value as number) >= 0).map(([key,value])=>[key,Number(value)]));
      }
  }
  serialize() {
    return JSON.stringify({...this.preserved,version:1, locale:this.locale, theme:this.theme, selected:this.selected,
      completed:this.completed, bookmarks:this.bookmarks, revealed:this.revealed,
      sidebars:{navigation:this.navigationOpen,references:this.referencesOpen},
      ...(this.legacyNotes ? {notes:this.legacyNotes} : {}),
      ...(this.legacyMode ? {mode:this.legacyMode} : {})});
  }
  async persist(serialized: string) {
    try {
      // Serialize competing tabs' read/merge/write transactions where supported.
      if (typeof navigator !== 'undefined' && navigator.locks) {
        await navigator.locks.request(STORAGE_KEY, () => this.write(this.serialize()));
      } else this.write(serialized);
    } catch { this.storageError = true; }
  }
  private write(serialized: string) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const merged = mergeStudyRecords(this.saved, JSON.parse(serialized), parseStudyRecord(raw));
      const next = JSON.stringify(merged);
      if (next !== raw) localStorage.setItem(STORAGE_KEY, next);
      this.saved = {...merged, selected:this.selected};
      const applied = {...merged, selected:this.selected};
      if (JSON.stringify(applied) !== serialized) this.apply(applied);
      this.storageError = false;
    }
    catch { this.storageError = true; }
  }
  sync(raw: string | null) {
    try {
      const remote = parseStudyRecord(raw);
      const merged = mergeStudyRecords(this.saved, JSON.parse(this.serialize()), remote);
      this.saved = {...remote, selected:this.selected};
      const applied = {...merged, selected:this.selected};
      if (JSON.stringify(applied) !== this.serialize()) this.apply(applied);
    } catch { this.storageError = true; }
  }
  count(ids: string[]) { return ids.filter(id => this.completed[id]).length; }
}
