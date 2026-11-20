// Show the tags and parmesan lines of the one row feed:verify rejects.
import fs from 'node:fs';
const id = 'fcc4ff98-09d0-4068-9c82-add53a836973';
for (const f of ['feed-updates.json', 'feed-inserts.json']) {
  const rows = JSON.parse(fs.readFileSync(`docs/backups/feed-payloads-2026-10-17/${f}`, 'utf8'));
  const list = Array.isArray(rows) ? rows : rows.rows || Object.values(rows);
  const r = list.find((x) => x.id === id);
  if (!r) { console.log(f, 'not found'); continue; }
  const rec = r.recipe || r;
  console.log(f, 'keys', Object.keys(r).join(','));
  console.log('title', r.title ?? rec.title, 'slug', r.slug);
  console.log('tags', JSON.stringify(r.diet_tags ?? rec.dietTags ?? rec.diets ?? rec.tags));
  const ing = JSON.stringify(r);
  console.log('parmesan lines', (ing.match(/[^"]{0,60}parmesan[^"]{0,40}/gi) || []).join(' || '));
}
