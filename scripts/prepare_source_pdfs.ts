import {prepareSourcePdfs} from './source_pdfs';

try {
  const count = await prepareSourcePdfs();
  console.log(`Source PDFs ready: ${count} independent canonical copies verified by SHA-256.`);
} catch (error) {
  // Do not print fetch causes/URLs: signed deployment URLs may contain secrets.
  console.error(error instanceof Error ? error.message : 'Unable to provision source PDFs');
  process.exitCode = 1;
}
