// Per-serve nutrition for the 13 batch-03 recipes the line estimator could not do
// (docs/NUTRITION-13-SOURCES.md has sources, weights and judgement calls).
//
//   npx tsx scripts/apply-nutrition-13.mts            # prints the figures
//   npx tsx scripts/apply-nutrition-13.mts --write    # sets `nutrition` in batch-03.json
//
// Food values are per 100 g, USDA SR Legacy (via nutritionvalue.org, which republishes it),
// except where the doc marks a proxy. Weights and the "eaten" share of brines are hand
// judgement, stated per line below. Nothing is scaled to pass the validator.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Per100 = [kcal: number, proteinG: number, carbsG: number, fatG: number, fibreG: number, sodiumMg: number];
const FOOD: Record<string, Per100> = {
  chilli: [40, 1.9, 8.8, 0.4, 1.5, 9],
  garlic: [149, 6.4, 33.1, 0.5, 2.1, 17],
  ginger: [80, 1.8, 17.8, 0.8, 2, 13], // also stands in for fresh turmeric and galangal
  shallot: [72, 2.5, 16.8, 0.1, 3.2, 12],
  limeJuice: [25, 0.4, 8.4, 0.1, 0.4, 2],
  salt: [0, 0, 0, 0, 0, 38758],
  turnipGreens: [32, 1.5, 7.1, 0.3, 3.2, 40],
  riceVinegar: [18, 0, 0, 0, 0, 2],
  whiteVinegar: [19, 0, 0.04, 0, 0, 2],
  sugar: [387, 0, 100, 0, 0, 1],
  soy: [53, 8.1, 4.9, 0.6, 0.8, 5494],
  tomato: [18, 0.9, 3.9, 0.2, 1.2, 5],
  onion: [40, 1.1, 9.3, 0.1, 1.7, 4],
  coriander: [23, 2.1, 3.7, 0.5, 2.8, 46],
  coconut: [354, 3.3, 15.2, 33.5, 9, 20],
  driedFish: [290, 62.8, 0, 2.4, 0, 7027], // dried salted cod
  driedChilli: [282, 11.9, 51.4, 8.2, 21.6, 41], // ancho, stands in for pasilla
  chilliPowder: [282, 12, 49.7, 14.3, 34.8, 1640], // gochugaru
  oil: [884, 0, 0, 100, 0, 2],
  condensed: [322, 7.9, 54.4, 8.7, 0, 128],
  evaporated: [133, 6.8, 10, 7.6, 0, 105],
  cauliflower: [25, 1.9, 5, 0.3, 2, 30],
  turnip: [28, 0.9, 6.4, 0.1, 1.8, 67],
  pepper: [251, 10.4, 64, 3.3, 25.3, 20],
  roe: [143, 22.3, 1.5, 6.4, 0, 93], // fish roe, stands in for kina (sea urchin roe)
  bread: [271, 9.4, 49.2, 3.6, 2.3, 476], // white bread, stands in for rēwena
  lemon: [29, 1.1, 9.3, 0.3, 2.8, 2],
  daikon: [18, 0.6, 4.1, 0.1, 1.6, 21],
  springOnion: [32, 1.8, 7.3, 0.2, 2.6, 16],
  fishSauce: [35, 5.1, 3.7, 0, 0, 7850],
  mirin: [241, 0.2, 43, 0, 0, 5],
  bonito: [330, 77, 0, 2, 0, 600],
  spinach: [23, 2.9, 3.6, 0.4, 2.2, 79],
  mustardGreens: [27, 2.9, 4.7, 0.4, 3.2, 20],
  riceFlour: [366, 5.9, 80.1, 1.4, 2.4, 0],
  sesame: [573, 17.7, 23.5, 49.7, 11.8, 11],
  snapper: [100, 20.5, 0, 1.3, 0, 64],
};

type Line = [food: keyof typeof FOOD, grams: number, eaten?: number];
const RECIPES: Record<string, { servings: number; lines: Line[] }> = {
  'base-genep': {
    servings: 4,
    lines: [['chilli', 40], ['garlic', 12], ['ginger', 25], ['shallot', 75], ['limeJuice', 15], ['salt', 3]],
  },
  'nozawana-zuke': {
    // Salt only draws water out and is rinsed off (10% kept); the pickling liquid is mostly left (30% eaten).
    servings: 4,
    lines: [['turnipGreens', 200], ['salt', 18, 0.1], ['chilli', 8], ['riceVinegar', 100, 0.3], ['sugar', 13, 0.3], ['soy', 5, 0.3]],
  },
  'pico-de-gallo': {
    servings: 4,
    lines: [['tomato', 480], ['onion', 150], ['coriander', 15], ['limeJuice', 30], ['salt', 3]],
  },
  'pol-sambol': {
    servings: 4,
    lines: [['coconut', 400], ['limeJuice', 90], ['chilli', 16], ['driedFish', 6], ['onion', 70], ['salt', 3]],
  },
  'salsa-de-pasilla-oaxaquena': {
    servings: 4,
    lines: [['driedChilli', 48], ['garlic', 9], ['salt', 2.5], ['oil', 14]],
  },
  'teh-tarik': {
    servings: 2,
    lines: [['condensed', 60], ['evaporated', 31]],
  },
  torshi: {
    // Kept in the brine; a quarter of the vinegar and salt is eaten with the vegetables.
    servings: 8,
    lines: [['cauliflower', 450], ['turnip', 280], ['chilli', 28], ['garlic', 18], ['pepper', 6], ['whiteVinegar', 250, 0.25], ['salt', 12, 0.25]],
  },
  'kina-with-rewena': {
    servings: 2,
    lines: [['roe', 200], ['bread', 100], ['lemon', 15]],
  },
  'nabak-kimchi': {
    // Water kimchi: the brine is drunk, so half of its salt is eaten; the salting salt is rinsed off (10% kept).
    servings: 4,
    lines: [['daikon', 540], ['salt', 18, 0.1], ['salt', 36, 0.5], ['chilliPowder', 5], ['garlic', 9], ['ginger', 5], ['springOnion', 60], ['fishSauce', 3], ['sugar', 4]],
  },
  'horenso-no-ohitashi': {
    servings: 4,
    lines: [['spinach', 500], ['soy', 36], ['mirin', 5], ['bonito', 3]],
  },
  'gat-kimchi': {
    // Brining salt is rinsed off (10% kept).
    servings: 4,
    lines: [['mustardGreens', 800], ['salt', 54, 0.1], ['riceFlour', 10], ['sugar', 12], ['garlic', 12], ['ginger', 9], ['chilliPowder', 5], ['fishSauce', 18], ['springOnion', 30], ['sesame', 3]],
  },
  'jaew-makhuea-thet-charred-tomato-jaew': {
    servings: 4,
    lines: [['tomato', 600], ['chilli', 10], ['garlic', 12], ['limeJuice', 30], ['fishSauce', 18], ['salt', 1.5]],
  },
  'grilled-fish-wrapped-in-vine-leaves': {
    // 2 whole fish of 400 g: about 45% is flesh. The vine leaves are a wrapper and are not counted. Oil: 20 g over both.
    servings: 2,
    lines: [['snapper', 360], ['oil', 20], ['salt', 1.5]],
  },
};

export function perServe(servings: number, lines: Line[]) {
  const sum: Per100 = [0, 0, 0, 0, 0, 0];
  for (const [food, g, eaten = 1] of lines) FOOD[food]!.forEach((v, i) => (sum[i]! += (v * g * eaten) / 100));
  const [kcal, proteinG, carbsG, fatG, fibreG, sodiumMg] = sum.map((v) => Math.round(v / servings));
  return { kcal, proteinG, carbsG, fatG, fibreG, sodiumMg } as Record<string, number>;
}

const file = join(dirname(fileURLToPath(import.meta.url)), 'data/house-recipes/batch-03.json');
const batch = JSON.parse(readFileSync(file, 'utf8')) as { recipes: { id: string; servings: number; nutrition?: unknown }[] };
let changed = 0;
for (const [id, r] of Object.entries(RECIPES)) {
  const rec = batch.recipes.find((x) => x.id === id);
  if (!rec) throw new Error(`missing ${id}`);
  if (rec.servings !== r.servings) throw new Error(`${id}: servings ${rec.servings} != ${r.servings}`);
  const n = perServe(r.servings, r.lines);
  console.log(id.padEnd(40), JSON.stringify(n));
  if (process.argv.includes('--write')) {
    rec.nutrition = n;
    changed++;
  }
}
if (changed) {
  writeFileSync(file, JSON.stringify(batch, null, 2) + '\n');
  console.log(`Wrote nutrition for ${changed} recipes.`);
}
