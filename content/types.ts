export type Locale = 'zh' | 'en';
export type Localized = Record<Locale, string>;
export type InOneLanguage<T> = T extends Localized ? string
  : T extends (infer Item)[] ? InOneLanguage<Item>[]
  : T extends object ? { [Key in keyof T]: InOneLanguage<T[Key]> } : T;
export type Region = [number, number, number, number];
export interface SourceRef { doc: string; page: number; label: Localized; region?: Region }
export interface Formula {
  id: string;
  title: Localized;
  math: string;
  source: SourceRef;
  note?: Localized;
}
export interface OriginalFigure { doc:string; page:number; region:Region }
export type FullConverterProfile = 'reversed-emf' | 'ideal-drive' | 'ripple-drive';
export type ConverterInteraction = {kind:'semi-converter';asset:string}
  | {kind:'full-converter';asset:string;profile:FullConverterProfile;rippleAsset?:string};
export interface Part {
  id: string;
  label: string;
  points: number;
  prompt: Localized;
  solution: Localized;
  note?: Partial<Localized>;
  figure?: string;
  figureCaption?: Localized;
  interaction?: ConverterInteraction;
  questionFigure?: { name:string; source:OriginalFigure; caption:Localized };
  sourcePage: number;
  solutionPage: number;
}
export interface Problem {
  wording: 'original';
  id: string;
  number: number;
  title: Localized;
  topic: Localized;
  statement: Localized;
  givens: string[];
  points: number;
  figure?: string;
  figureAtParts?: boolean;
  /** Omit the original-image counterpart for a separately matched prompt figure. */
  figureOriginal?: false;
  figureCaption?: Localized;
  originalFigure: OriginalFigure;
  lectures: SourceRef[];
  guide: Localized;
  parts: Part[];
  note?: Partial<Localized>;
}
export interface Exam {
  kind?: 'exam' | 'practice';
  id: string;
  number: number;
  term: Localized;
  year: number | null;
  points: number;
  doc: string;
  solutionDoc: string;
  questionsOnly: boolean;
  problems: Problem[];
}
export type ExamInfo = Omit<Exam, 'problems'>;
/** Navigation data contains only question identity and progress IDs, never article text. */
export type ProblemIndex = Pick<Problem, 'id' | 'number' | 'title'> & {
  parts: Pick<Part, 'id'>[];
};
export type ExamIndex = ExamInfo & { problems: ProblemIndex[] };
export interface SourceDocument {
  // pdf is an offline provenance path, never a published/download URL.
  id: string; title: string; kind: string; pages: number; pdf: string;
  pageBase: string; sizes: number[][]; original: string; sha256: string;
}
/** Reader data excludes the retired question-level Guide, retained only in source articles. */
export type StudyProblem = Omit<Problem, 'guide'>;
export interface StudyPageData {
  examIndex: ExamIndex[];
  documents: Record<Locale, Record<string, SourceDocument>>;
  exam: ExamInfo;
  problem: StudyProblem;
  assetBase: Localized;
  figureSizes: Record<Locale, Record<string, [number, number, number]>>;
}
