import fs from 'fs';import path from 'path';
const H=process.env.HOME+'/Developer/';
const dirs=[H+'the-pantry-v2-b04-sB/scripts/data/house-recipes',H+'the-pantry-v2-b04-merge/scripts/data/house-recipes',H+'the-pantry-v2-b04-sC/scripts/data/house-recipes'];
const files=[];for(const d of dirs){if(!fs.existsSync(d))continue;for(const f of fs.readdirSync(d)){if(f.endsWith('.json'))files.push(path.join(d,f))}}
files.push(H+'the-pantry-v2-b04-sB/src/data/catalogue/recipes.json');
const stop=new Set(['and','with','the','of','a','in','style','mini']);
const norm=t=>t.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(w=>w&&!stop.has(w)).map(w=>w.replace(/(es|s)$/,''));
const ex=new Map();
for(const f of files){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/"title":\s*"([^"]+)"/g)){const w=norm(m[1]);ex.set(m[1],new Set(w))}}
const cand=fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
const bad=[];
for(const c of cand){const cw=norm(c);let hit=null;for(const [t,ws] of ex){const [a,b]=cw.length<=ws.size?[cw,ws]:[ws,new Set(cw)];if(a.length>=2||a.size>=2){const arr=[...a];if(arr.length>=2&&arr.every(w=>b.has(w))){hit=t;break}}else if(cw.join()==[...ws].join()){hit=t;break}}
 if(hit)bad.push(c+'  <=  '+hit)}
console.log(ex.size+' existing; clashes '+bad.length);console.log(bad.join('\n'));
