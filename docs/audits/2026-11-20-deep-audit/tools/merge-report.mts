// Builds FINDINGS.md: every lane's index table merged into one ranked list, joined with the
// fixers' status files (FIX-*-STATUS.csv: id,status,commit,note). Run: npx tsx <this file>
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..');
const SEV: Record<string, string> = { S1: 'Blocker', S2: 'Loses people', S3: 'Annoying', S4: 'Polish' };
// The same problem reported by two lanes: second ID -> the one that carries it.
const SAME_AS: Record<string, string> = {
  'REL2-1': 'S2-7', 'FOOD-8': 'S2-7', 'REL2-2': 'F-5', 'REL2-3': 'S2-4', 'REL2-6': 'S2-3',
  'DATA-2': 'S2-3', 'REL2-5': 'REPO-4', 'REL2-10': 'REPO-7', 'REL2-9': 'REPO-9', 'F-14': 'S2-12',
  'REPO-8': 'FOOD-15', 'REPO-3': 'F-9', 'REPO-2': 'FOOD-9',
};

type Row = { id: string; sev: string; fix: string; title: string; where: string };

export function parseIndex(text: string): Row[] {
  const rows: Row[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*((?:F|DATA|S2|UX|PERF|REL2|FOOD|REPO)-\d+)\s*\|(.*)\|\s*$/);
    if (!m) continue;
    const [sev, fix, , title, ...where] = m[2].split('|').map((c) => c.trim());
    if (!/^S[1-4]/.test(sev ?? '') || !title) continue; // a carry-over table, not the index
    rows.push({ id: m[1], sev: sev.slice(0, 2), fix, title, where: where.join(' / ') });
  }
  return rows;
}

// Self-check: both severity spellings parse, and a non-index row is skipped.
const sample = parseIndex(
  '| F-1 | S2 | auto | CONFIRMED | Title | a.ts:1 |\n| S2-1 | S1 Blocker | live | CONFIRMED | T2 | `x` |\n| S2-1 | SEC-01 | open |\n',
);
assert.deepEqual(sample.map((r) => `${r.id} ${r.sev}`), ['F-1 S2', 'S2-1 S1']);

const rows = new Map<string, Row>();
const files = readdirSync(dir);
for (const file of files.filter((f) => /^L\d-.*\.md$/.test(f)).sort()) {
  for (const row of parseIndex(readFileSync(join(dir, file), 'utf8'))) {
    if (!rows.has(row.id)) rows.set(row.id, row);
  }
}

const status = new Map<string, { status: string; commit: string; note: string }>();
// FIX-FINAL is read last: it holds the combined verdict where two fixers each did half of one finding.
const finalLast = (a: string, b: string) => Number(a.includes('FINAL')) - Number(b.includes('FINAL')) || a.localeCompare(b);
for (const file of files.filter((f) => /^FIX-.*-STATUS\.csv$/.test(f)).sort(finalLast)) {
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    const [id, st, commit, ...note] = line.split(',');
    if (rows.has(id?.trim())) status.set(id.trim(), { status: st.trim(), commit: commit.trim(), note: note.join(',').trim() });
  }
}

const statusOf = (r: Row): string => {
  const s = status.get(r.id) ?? status.get(SAME_AS[r.id] ?? '');
  if (s) return `${s.status}${s.commit ? ` (${s.commit})` : ''}${s.note ? `: ${s.note}` : ''}`;
  return /owner/.test(r.fix) && !/auto/.test(r.fix) ? 'owner' : 'open';
};

const out: string[] = ['# All findings, ranked', '', 'Built by `tools/merge-report.mts` from the lane files. Do not edit by hand.', ''];
const all = [...rows.values()];
const unique = all.filter((r) => !SAME_AS[r.id]);
out.push(`${all.length} findings from ${new Set(all.map((r) => r.id.split('-')[0])).size} ID families; ${unique.length} once the same problem seen by two lanes is counted once.`, '');
const tally = new Map<string, number>();
for (const r of unique) {
  const key = statusOf(r).split(/[ :(]/)[0];
  tally.set(key, (tally.get(key) ?? 0) + 1);
}
out.push(`Status: ${[...tally].map(([k, n]) => `${k} ${n}`).join(', ')}.`, '');
for (const sev of Object.keys(SEV)) {
  const group = all.filter((r) => r.sev === sev);
  out.push(`## ${sev} ${SEV[sev]} (${group.filter((r) => !SAME_AS[r.id]).length})`, '', '| ID | Status | What | Where |', '| --- | --- | --- | --- |');
  for (const r of group) {
    const dupe = SAME_AS[r.id] ? ` (same as ${SAME_AS[r.id]})` : '';
    out.push(`| ${r.id} | ${statusOf(r)} | ${r.title}${dupe} | ${r.where} |`);
  }
  out.push('');
}
writeFileSync(join(dir, 'FINDINGS.md'), out.join('\n'));
console.log(`${all.length} findings, ${unique.length} unique; ${[...tally].map(([k, n]) => `${k} ${n}`).join(', ')}`);
