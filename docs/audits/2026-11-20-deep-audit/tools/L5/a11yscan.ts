// Lane 5: find touchables in src/ without a role or label, and TextInputs without a label.
// Run: npx tsx docs/audits/2026-11-20-deep-audit/tools/L5/a11yscan.ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const files: string[] = [];
(function walk(d: string) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx') && !p.includes('.test.') && !p.includes('/dev/')) files.push(p);
  }
})(ROOT);

const out: string[] = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  // Each opening tag of a touchable, up to its closing '>' (props may span lines).
  const re = /<(Pressable|TouchableOpacity|TouchableHighlight|TextInput|RNTextInput)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Scan to the tag's closing '>' at brace depth 0 (arrow functions inside props have '=>').
    let depth = 0;
    let i = m.index + m[0].length;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0 && src[i - 1] !== '=') break;
    }
    const props = src.slice(m.index, i);
    const line = src.slice(0, m.index).split('\n').length;
    const isInput = m[1]!.includes('TextInput');
    const spread = /\{\.\.\./.test(props);
    const missing: string[] = [];
    if (!isInput && !/accessibilityRole|role=/.test(props)) missing.push('role');
    if (!/accessibilityLabel|aria-label/.test(props)) missing.push('label');
    if (!isInput && !/accessible=\{false\}/.test(props) && missing.length) out.push(`${f}:${line} <${m[1]}> missing ${missing.join('+')}${spread ? ' (has a spread)' : ''}`);
    if (isInput && missing.length) out.push(`${f}:${line} <${m[1]}> missing label${spread ? ' (has a spread)' : ''}`);
  }
}
console.log(out.join('\n'));
console.log(`\n${out.length} hits in ${files.length} files`);
