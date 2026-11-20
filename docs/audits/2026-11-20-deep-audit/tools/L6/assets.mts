// L6: what photo weight a store build ships, duplicates, unused files. Prints a summary only.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L6/assets.mts
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';

const ROOT = new URL('../../../../../', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, ROOT), 'utf8');
const pairs = (src: string) => [...src.matchAll(/^\s*'?([a-z0-9-]+)'?: require\('\.\.\/\.\.\/\.\.\/assets\/recipes\/([^']+)'\)/gm)].map((m) => [m[1]!, m[2]!] as const);

const store = pairs(read('src/data/catalogue/images.ts'));
const drafts = pairs(read('src/data/catalogue/draftImages.ts'));
const recipes = JSON.parse(read('src/data/catalogue/recipes.json')) as { id: string; provenance?: string }[];
const prov = new Map(recipes.map((r) => [r.id, r.provenance ?? 'ai-draft']));
const ships = (id: string) => ['reviewed', 'vetted'].includes(prov.get(id) ?? 'ai-draft');

const dir = 'assets/recipes/';
const files = readdirSync(new URL(dir, ROOT));
const size = (f: string) => statSync(new URL(dir + f, ROOT)).size;
const hash = (f: string) => createHash('md5').update(readFileSync(new URL(dir + f, ROOT))).digest('hex');
const sum = (fs: Iterable<string>) => [...new Set(fs)].reduce((a, f) => a + size(f), 0);
const MB = (n: number) => Math.round((n / 1e6) * 10) / 10;

const storeFiles = new Set(store.map(([, f]) => f));
const draftFiles = new Set(drafts.map(([, f]) => f));
const used = new Set([...storeFiles, ...draftFiles]);
const unused = files.filter((f) => !used.has(f));
const byHash = new Map<string, string[]>();
for (const f of files) byHash.set(hash(f), [...(byHash.get(hash(f)) ?? []), f]);
const dupes = [...byHash.values()].filter((g) => g.length > 1);
const storeDupes = [...byHash.values()].map((g) => g.filter((f) => storeFiles.has(f))).filter((g) => g.length > 1);

const brand = readdirSync(new URL('assets/brand/', ROOT)).map((f) => [f, statSync(new URL('assets/brand/' + f, ROOT)).size] as const);

console.log(
  JSON.stringify(
    {
      filesInFolder: files.length,
      folderMB: MB(sum(files)),
      storeMapEntries: store.length,
      storeFiles: storeFiles.size,
      storeMB: MB(sum(storeFiles)),
      storeEntriesForNonShippingRecipes: store.filter(([id]) => !ships(id)).map(([id]) => `${id}:${prov.get(id) ?? 'missing'}`),
      draftMapEntries: drafts.length,
      draftFilesOnly: [...draftFiles].filter((f) => !storeFiles.has(f)).length,
      draftOnlyMB: MB(sum([...draftFiles].filter((f) => !storeFiles.has(f)))),
      draftEntriesForShippingRecipes: drafts.filter(([id]) => ships(id)).map(([id]) => id),
      unusedFiles: unused,
      nonWebp: files.filter((f) => !f.endsWith('.webp')),
      byteIdenticalGroups: dupes.length,
      byteIdenticalExtraMB: MB(dupes.reduce((a, g) => a + size(g[0]!) * (g.length - 1), 0)),
      storeByteIdenticalGroups: storeDupes,
      largestStore: [...storeFiles].sort((a, b) => size(b) - size(a)).slice(0, 8).map((f) => `${f} ${Math.round(size(f) / 1000)}KB`),
      over300KB: files.filter((f) => size(f) > 300000).length,
      brand: brand.map(([f, s]) => `${f} ${Math.round(s / 1000)}KB`),
    },
    null,
    1,
  ),
);
