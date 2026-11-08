import { plainText } from './math';

/** Match what the reader sees, including Unicode math and spaced units. */
export function searchText(text: string) {
  return plainText(text).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
}
export function includesSearch(text: string, query: string) {
  return searchText(text).includes(searchText(query));
}
