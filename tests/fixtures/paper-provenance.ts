import {expect} from 'bun:test';
import {lstatSync, realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import type {SourceDocument} from '../../content/types';

// These are recorded source identities, not a verification of local PDF bytes.
// Actual PDF hashes and reconstruction objects are audited offline by
// scripts/check_sources.py and scripts/check_reconstruction.py.
const sourceHashes: Record<string, string> = {
  'e1-f26-sol': 'c26bdf7805fa6eee8d7c1e41fb32a7d2f7a72c141f854e2f780cbf5eb3e7d3d3',
  'e1-s25-sol': 'c73b0b4384f86d048146ec6f74d33824677673b5af89d7b6c068aeccf3634cce',
  'e2-s25-sol': '41a823cb045c5124845717f8c78208baf604d8542509d2c1233be11604b21786',
  'e2-u00': 'b690d52f25b1e897f0f76616938248da905577a6983248300b54eaf12c5bc85d',
  'e2-u00-sol': '2fb2d6d6f2660082e30f8df9931d78cdd93e0cb17a6d40668970108167f03f03',
  'p1-f26-sol': 'b095acdc4c46ee4e96311a69aae79c8179f591646b8949914e711cf4132bfab8',
  'p2-f26-sol': '5b823f8d4fdeaf2b421e58825cc58194def4fb49e68e50d4ec978af7081f5c36',
};

export function expectPaperSourceMetadata(document: SourceDocument, id: string) {
  expect(document.id).toBe(id);
  expect(document.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(sourceHashes[id]).toBeDefined();
  expect(document.sha256).toBe(sourceHashes[id]);
  expect(document.pdf).toBe(`sources/${id}.pdf`);
  expect(document.pageBase).toBe(`pages/${id}`);
  expect(document.original).toMatch(/^(?:Exams\/.+\.pdf|scripts\/reconstruct_exam2\.py#(?:printed-questions|independent-solutions))$/);
  expect(Number.isInteger(document.pages)).toBe(true);
  expect(document.pages).toBeGreaterThan(0);
  expect(document.sizes).toHaveLength(document.pages);
  for (const size of document.sizes) expect(size).toEqual([612, 792]);
}

export function expectIndependentPageImages(directories: readonly string[], id: string, pages: number) {
  for (let page = 1; page <= pages; page++) {
    const identities = directories.map(directory => {
      const path = resolve(directory, 'assets/pages', id, `${page}.webp`);
      const image = lstatSync(path);
      expect(image.isFile()).toBe(true);
      expect(image.isSymbolicLink()).toBe(false);
      expect(realpathSync(path)).toBe(path);
      expect(image.size).toBeGreaterThan(1000);
      return `${image.dev}:${image.ino}`;
    });
    expect(new Set(identities).size).toBe(directories.length);
  }
}
