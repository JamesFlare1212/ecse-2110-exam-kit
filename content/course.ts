import data from './course.json';
import type { Locale, Localized, SourceDocument } from './types';

export interface CourseConfig {
  id: string;
  code: string;
  title: Localized;
  defaultProblemId: string | null;
  storageKey: string;
  resources: {
    formulaSheet: string | null;
    formulaSheets?: Record<string, string>;
    lectures: { doc: string; label: string; title: Localized }[];
  };
}

/** Small browser-safe configuration boundary, shared by Astro, Svelte and the CLI. */
export function parseCourseConfig(raw: unknown): CourseConfig {
  const fail = (message: string): never => { throw new Error(`Invalid course.json: ${message}`); };
  const object = (value: unknown, keys: string[], at: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(`${at} must be an object`);
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length !== keys.length || keys.some(key => !Object.hasOwn(record, key)))
      fail(`${at} must contain exactly ${keys.join(', ')}`);
    return record;
  };
  const text = (value: unknown, at: string): string => {
    if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f<>]/.test(value)) return fail(`${at} must be plain nonempty text`);
    return value;
  };
  const localized = (value: unknown, at: string): Localized => {
    const record = object(value, ['en', 'zh'], at);
    return { en: text(record.en, `${at}.en`), zh: text(record.zh, `${at}.zh`) };
  };
  const id = (value: unknown, at: string): string => {
    const result = text(value, at);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) fail(`${at} must be a lowercase slug`);
    return result;
  };
  const record = object(raw, ['id', 'code', 'title', 'defaultProblemId', 'storageKey', 'resources'], 'course');
  const resourceKeys = record.resources && typeof record.resources === 'object' && Object.hasOwn(record.resources, 'formulaSheets')
    ? ['formulaSheet', 'formulaSheets', 'lectures'] : ['formulaSheet', 'lectures'];
  const resources = object(record.resources, resourceKeys, 'resources');
  let formulaSheets: Record<string, string> | undefined;
  if (Object.hasOwn(resources, 'formulaSheets')) {
    if (!resources.formulaSheets || typeof resources.formulaSheets !== 'object' || Array.isArray(resources.formulaSheets)) fail('resources.formulaSheets must map exam numbers to document IDs');
    formulaSheets = Object.fromEntries(Object.entries(resources.formulaSheets as Record<string, unknown>).map(([number, value]) => {
      if (!/^[1-9]\d*$/.test(number)) fail('formulaSheets keys must be positive exam numbers');
      return [number, id(value, `resources.formulaSheets.${number}`)];
    }));
  }
  if (!Array.isArray(resources.lectures)) fail('resources.lectures must be an array');
  const lectures = (resources.lectures as unknown[]).map((value, i) => {
    const entry = object(value, ['doc', 'label', 'title'], `resources.lectures[${i}]`);
    return { doc: id(entry.doc, `lectures[${i}].doc`), label: text(entry.label, `lectures[${i}].label`), title: localized(entry.title, `lectures[${i}].title`) };
  });
  if (new Set(lectures.map(entry => entry.doc)).size !== lectures.length) fail('lecture document IDs must be unique');
  const defaultProblemId = record.defaultProblemId === null ? null : text(record.defaultProblemId, 'defaultProblemId');
  if (defaultProblemId && !/^[ep][1-9]\d*-(?:[fs]\d{2}|u00)-q[1-9]\d*$/.test(defaultProblemId)) fail('defaultProblemId must be a problem ID or null');
  const storageKey = text(record.storageKey, 'storageKey');
  if (!/^[a-z0-9][a-z0-9._:-]*-v\d+$/.test(storageKey)) fail('storageKey must be a versioned lowercase namespace');
  return {
    id: id(record.id, 'id'), code: text(record.code, 'code'), title: localized(record.title, 'title'),
    defaultProblemId, storageKey,
    resources: { formulaSheet: resources.formulaSheet === null ? null : id(resources.formulaSheet, 'resources.formulaSheet'), ...(formulaSheets ? {formulaSheets} : {}), lectures },
  };
}

export const course = parseCourseConfig(data);
export const formulaSheetFor = (examNumber: number, config = course) => config.resources.formulaSheets?.[String(examNumber)] ?? config.resources.formulaSheet;
export const pageTitle = (title: string, config = course) => `${title} · Fieldnotes · ${config.code}`;
export function studyDescription(locale: Locale, papers: number, parts: number, config = course) {
  return locale === 'zh'
    ? `${config.code} ${config.title.zh}：${papers} 份试卷与练习、${parts} 个双语详解小问，以及附来源的公式与课程讲义。`
    : `${config.code} ${config.title.en}: ${papers} exam and practice papers, ${parts} bilingual worked subparts, source-linked formulas and lecture notes.`;
}
export function validateCourseDocuments(config: CourseConfig, documents: Record<string, SourceDocument>) {
  const ids = [config.resources.formulaSheet, ...Object.values(config.resources.formulaSheets ?? {}), ...config.resources.lectures.map(entry => entry.doc)].filter((id): id is string => id !== null);
  for (const id of ids) if (!documents[id]) throw new Error(`course.json: unknown resource document ${id}`);
}
/** Resource names never infer a lecture number from a document ID. */
export function sourceName(id: string, documents: Record<string, SourceDocument>, config = course) {
  const lecture = config.resources.lectures.find(entry => entry.doc === id);
  return lecture ? `Lecture ${lecture.label}` : id === config.resources.formulaSheet ? 'Crib sheet' : documents[id]?.title ?? id;
}
