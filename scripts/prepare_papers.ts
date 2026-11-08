import { papers } from '../content/catalog.server';
import { stagePaperAssets } from '../content/papers.server';

stagePaperAssets(papers);
console.log(`Staged assets for ${papers.length} discovered papers.`);
