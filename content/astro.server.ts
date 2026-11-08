import { getCollection } from 'astro:content';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parseQuestionBody } from './markdown';
import { loadContent, PAPER_NAME } from './papers.server';
import { localeFromPath } from './localization';

/** Astro owns discovery; CLI checks reuse exactly the same body parser and schema. */
export async function loadAstroContent() {
  const entries = await getCollection('questions');
  const articles = entries.filter(entry => entry.filePath && PAPER_NAME.test(entry.filePath.replaceAll('\\', '/').split('/').at(-3)!))
    .map(entry => {
      if (!entry.filePath || entry.body === undefined) throw new Error(`${entry.id}: missing Markdown source`);
      localeFromPath(entry.filePath);
      const resources = JSON.parse(readFileSync(resolve(dirname(entry.filePath), '../figure-sources.json'), 'utf8'));
      return { filePath: entry.filePath, problem: parseQuestionBody(entry.data, entry.body, entry.filePath, resources) };
    });
  return loadContent(resolve('content'), articles);
}
