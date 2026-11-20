// Replace {{file}} markers in L1-INVENTORY.md with the generated tables from evidence/L1 (idempotent only on a marker-bearing copy).
import fs from 'node:fs';
const D = 'docs/audits/2026-11-20-deep-audit';
const tpl = `${D}/tools/L1/inventory.template.md`;
if (!fs.existsSync(tpl)) fs.copyFileSync(`${D}/L1-INVENTORY.md`, tpl);
let t = fs.readFileSync(tpl, 'utf8');
t = t.replace(/\{\{([\w.-]+)\}\}/g, (_, f) => {
  const body = fs.readFileSync(`${D}/evidence/L1/${f}`, 'utf8').trim();
  return f.endsWith('.txt') ? '```\n' + body + '\n```' : body;
});
fs.writeFileSync(`${D}/L1-INVENTORY.md`, t);
console.log('assembled', t.length, 'chars');
