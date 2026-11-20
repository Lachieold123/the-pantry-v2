// Summarise npm audit --json by severity, with which are in production deps (reachable in the app bundle) vs dev/build only.
import fs from 'node:fs';
const a = JSON.parse(fs.readFileSync('docs/audits/2026-11-20-deep-audit/evidence/L1/audit.log', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8')).packages;
const rows = [];
for (const [name, v] of Object.entries(a.vulnerabilities)) {
  const nodes = v.nodes || [];
  const dev = nodes.length ? nodes.every((n) => lock[n]?.dev === true) : null;
  const direct = v.isDirect;
  const advis = v.via.filter((x) => typeof x === 'object').map((x) => `${x.title} (${x.url?.split('/').pop()})`);
  rows.push({ name, sev: v.severity, dev, direct, via: advis.slice(0, 2).join('; ') || v.via.join(','), fix: v.fixAvailable === true ? 'yes' : v.fixAvailable ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (major)' : ''}` : 'none' });
}
const order = ['critical', 'high', 'moderate', 'low', 'info'];
console.log(JSON.stringify(a.metadata.vulnerabilities));
for (const s of order) {
  const r = rows.filter((x) => x.sev === s);
  console.log(`\n## ${s} (${r.length}): prod-reachable ${r.filter((x) => x.dev === false).length}, dev-only ${r.filter((x) => x.dev === true).length}`);
  for (const x of r) console.log(`${x.name} | ${x.dev === true ? 'dev-only' : x.dev === false ? 'PROD' : '?'} | ${x.direct ? 'direct' : 'indirect'} | ${x.via} | fix ${x.fix}`);
}
