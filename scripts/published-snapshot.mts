// Reads the published recipes, cooks and follows from Supabase with the app's
// public (publishable) key: SELECT only, the same rows any visitor can read.
// Caches them in scripts/.cache (git-ignored) so repeat runs work offline;
// pass --refresh to read again. Used by the Home engine simulation and the
// pantry-match report.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SnapshotRow = {
  id: string;
  cook_id: string;
  title: string;
  cuisine: string | null;
  meal_types: string[] | null;
  diets: string[] | null;
  difficulty: string | null;
  total_minutes: number | null;
  published_at: string;
  photo_path: string | null;
  groups: unknown;
};
export type SnapshotCook = { id: string; handle: string; display_name: string; follower_count: number; recipe_count: number };
export type Snapshot = {
  takenAt: string;
  recipes: SnapshotRow[];
  cooks: SnapshotCook[];
  follows: { follower_id: string; followee_id: string }[];
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheFile = join(root, 'scripts/.cache/published-snapshot.json');

function backend(): { url: string; key: string } {
  const src = readFileSync(join(root, 'src/lib/backend.ts'), 'utf8');
  const url = /SUPABASE_URL = '([^']+)'/.exec(src)?.[1];
  const key = /SUPABASE_PUBLISHABLE_KEY = '([^']+)'/.exec(src)?.[1];
  if (!url || !key) throw new Error('Could not find the Supabase URL and publishable key in src/lib/backend.ts');
  return { url, key };
}

async function readAll<T>(table: string, select: string, filter = ''): Promise<T[]> {
  const { url, key } = backend();
  const out: T[] = [];
  for (let from = 0; ; from += 500) {
    const res = await fetch(`${url}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 499}` },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const page = (await res.json()) as T[];
    out.push(...page);
    if (page.length < 500) return out;
  }
}

export async function loadSnapshot(refresh = process.argv.includes('--refresh')): Promise<Snapshot> {
  if (!refresh && existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8')) as Snapshot;
  const [recipes, cooks, follows] = await Promise.all([
    readAll<SnapshotRow>(
      'published_recipes',
      'id,cook_id,title,cuisine,meal_types,diets,difficulty,total_minutes,published_at,photo_path,groups:recipe->ingredientGroups',
      '&status=eq.published&order=published_at.desc',
    ),
    readAll<SnapshotCook>('cooks', 'id,handle,display_name,follower_count,recipe_count'),
    readAll<{ follower_id: string; followee_id: string }>('follows', 'follower_id,followee_id'),
  ]);
  const snap: Snapshot = { takenAt: new Date().toISOString(), recipes, cooks, follows };
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(snap));
  return snap;
}
