import { z } from 'astro/zod';

const text = z.string().min(1);
const positive = z.number().int().positive();
const points = z.number().int().nonnegative();
const region = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const source = z.object({ doc: text, page: positive, label: text, region: region.optional() }).strict();
const questionFigure = z.union([text, z.object({ name: text, caption: text.optional() }).strict()]);
export const questionMetadataSchema = z.object({
  id: text.regex(/^[ep][1-9]\d*-(?:[fs]\d{2}|u00)-q[1-9]\d*$/),
  title: text, topic: text, points, givens: z.array(text), lectures: z.array(source).min(1),
  figure: text.nullable().optional(), figureCaption: text.optional(), figureAtParts: z.boolean().optional(),
  parts: z.record(text, z.object({
    id: text.optional(), points: points.optional(), page: positive.optional(), solutionPage: positive.optional(),
    figure: text.optional(), figureCaption: text.optional(), questionFigure: questionFigure.optional(),
    interaction: z.object({ kind: z.literal('semi-converter'), asset: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).strict().optional(),
  }).strict()).default({}),
}).strict();
export type ProblemMetadata = z.infer<typeof questionMetadataSchema>;
