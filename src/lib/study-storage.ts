/** Merge only this tab's changes; unchanged fields belong to the latest record. */
export type StudyRecord = Record<string, unknown>;
const maps = new Set(['completed', 'bookmarks', 'revealed', 'notes', 'sidebars']);
export function record(value: unknown): StudyRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as StudyRecord : {};
}
export function parseStudyRecord(raw: string | null): StudyRecord {
  if (raw === null) return {version: 1};
  const value: unknown = JSON.parse(raw);
  if (value === null || typeof value !== 'object' || Array.isArray(value) || record(value).version !== 1)
    throw new Error('Unsupported study record; original data has been preserved.');
  return record(value);
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function mergeStudyRecords(base: StudyRecord, local: StudyRecord, remote: StudyRecord): StudyRecord {
  const merged = {...remote};
  for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
    if (equal(base[key], local[key])) continue;
    if (maps.has(key)) {
      const before = record(base[key]), after = record(local[key]), values = {...record(remote[key])};
      for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (equal(before[id], after[id])) continue;
        if (id in after) values[id] = after[id];
        else delete values[id];
      }
      merged[key] = values;
    } else if (key in local) merged[key] = local[key];
    else delete merged[key];
  }
  return merged;
}
