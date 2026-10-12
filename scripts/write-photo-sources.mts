// Writes src/data/catalogue/photoSources.ts (each house photo's Wikimedia
// Commons file page) from the batch files alone, so the credit links (K-17)
// can be rebuilt without the old app. catalogue:convert writes it too.
// Run from the repo root: npm run catalogue:photo-sources

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PHOTO_SOURCES_FILE, writePhotoSources } from './house-recipes.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writePhotoSources(root);
console.log(`Wrote ${PHOTO_SOURCES_FILE}`);
