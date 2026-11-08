import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { questionMetadataSchema } from '../content/metadata';

const questions = defineCollection({
  loader: glob({
    base: './content', pattern: '{en,zh-cn}/{exam,practice}*_{[fs][0-9][0-9],u00}/questions/*.md',
    generateId: ({ data, entry }) => `${entry.split('/')[0]}/${data.id}`,
    retainBody: true, deferRender: true,
  }),
  schema: questionMetadataSchema,
});
export const collections = { questions };
