import {readFileSync,readdirSync} from 'node:fs';
const f=process.argv[2];const mine=JSON.parse(readFileSync('scripts/data/house-recipes/'+f)).recipes;
const ids=new Set(),ts=new Set();
const dirs=['/Users/lachlanoldfield/Developer/the-pantry-v2-b04-sB/scripts/data/house-recipes/'];
for(const d of dirs)for(const g of readdirSync(d))if(/^batch-04-B/.test(g))for(const r of JSON.parse(readFileSync(d+g)).recipes||[]){ids.add(r.id);ts.add(r.title.toLowerCase())}
try{for(const r of JSON.parse(readFileSync('src/data/catalogue/recipes.json'))){ids.add(r.id);ts.add((r.title||'').toLowerCase())}}catch(e){}
console.log('dup',mine.filter(r=>ids.has(r.id)||ts.has(r.title.toLowerCase())).map(r=>r.id).join(' '));
