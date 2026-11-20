// Fails if a store/TestFlight build could show draft recipes, test switches or pretend Pro (K-29, REL2-11).
// The production profile must set the flag explicitly off: eas.json env wins over EAS dashboard variables.
import { readFileSync } from 'node:fs';

const eas = JSON.parse(readFileSync(new URL('../../eas.json', import.meta.url), 'utf8'));
const FLAG = 'EXPO_PUBLIC_SHOW_DRAFT_RECIPES';
const profiles = eas.build ?? {};

// Resolve "extends" so a profile that inherits the flag from a dev profile is caught too.
const envOf = (name, seen = new Set()) => {
  const p = profiles[name];
  if (!p || seen.has(name)) return {};
  seen.add(name);
  return { ...(p.extends ? envOf(p.extends, seen) : {}), ...(p.env ?? {}) };
};

const value = envOf('production')[FLAG];
if (value !== '0') {
  console.error(`eas.json build.production.env.${FLAG} must be "0" (found ${JSON.stringify(value)}).`);
  process.exit(1);
}
console.log(`eas.json: production sets ${FLAG}=0.`);
