import { papers } from '../content/catalog.server';
import { stagePaperAssets } from '../content/papers.server';
import { stagePublicAssets } from './public-assets';

stagePaperAssets(papers);
stagePublicAssets();
console.log(`Staged assets for ${papers.length} discovered papers.`);
