import { z } from 'astro/zod';

const text = z.string().min(1);
const positive = z.number().int().positive();
const points = z.number().int().nonnegative();
const region = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const source = z.object({ doc: text, page: positive, label: text, region: region.optional() }).strict();
const questionFigure = z.union([text, z.object({ name: text, caption: text.optional() }).strict()]);
const interactionAsset=text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const uniqueSignals=(signals:string[])=>new Set(signals).size===signals.length;
export const converterInteractionSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('semi-converter'),asset:interactionAsset,defaultSignals:z.array(z.enum(['v','i','v0','i0','is1','is2','id1','id2','vs1'])).min(1).refine(uniqueSignals,'Default signals must be unique')}).strict(),
  z.object({kind:z.literal('full-converter'),asset:interactionAsset,profile:z.enum(['reversed-emf','ideal-drive','ripple-drive']),rippleAsset:interactionAsset.optional(),defaultSignals:z.array(z.enum(['v','i','v0','i0','is1','is2','is3','is4'])).min(1).refine(uniqueSignals,'Default signals must be unique')}).strict(),
]).refine(value=>value.kind!=='full-converter'||(value.profile==='ripple-drive')===Boolean(value.rippleAsset),'Only the ripple profile requires a representative-current asset');
export const questionMetadataSchema = z.object({
  id: text.regex(/^[ep][1-9]\d*-(?:[fs]\d{2}|u00)-q[1-9]\d*$/),
  title: text, topic: text, points, givens: z.array(text), lectures: z.array(source).min(1),
  figure: text.nullable().optional(), figureCaption: text.optional(), figureAtParts: z.boolean().optional(),
  figureOriginal: z.literal(false).optional(),
  parts: z.record(text, z.object({
    id: text.optional(), points: points.optional(), page: positive.optional(), solutionPage: positive.optional(),
    figure: text.optional(), figureCaption: text.optional(), questionFigure: questionFigure.optional(),
    interaction: converterInteractionSchema.optional(),
  }).strict()).default({}),
}).strict().refine(value => value.figureOriginal === undefined || value.figure !== null,
  'figureOriginal: false requires a question figure');
export type ProblemMetadata = z.infer<typeof questionMetadataSchema>;
