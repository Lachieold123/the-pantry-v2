async function w(e,t){return!(t instanceof Error)||t.name!=="OutOfCredit"?!1:(e.aiAllowed&&(e.aiAllowed=!1,e.log.out_of_credit=!0,await e.sql`
      insert into seed.config (key, value) values ('ai_blocked_until', to_jsonb(now() + interval '30 minutes'))
      on conflict (key) do update set value = excluded.value`),!0)}function f(e){return e.deadline-Date.now()}function h(e,t,i=1){e.log[t]=(e.log[t]??0)+i}function g(e,t,i){let o=e.log[t]??[];o.length<10&&o.push(i.slice(0,300)),e.log[t]=o}async function v(e,t,i){let o=[...e],n=Array.from({length:Math.min(t,o.length)},async()=>{for(let s=o.shift();s!==void 0;s=o.shift())await i(s)});await Promise.all(n)}import Ae from"postgres";function U(){let e=Deno.env.get("SUPABASE_DB_URL");if(!e)throw new Error("SUPABASE_DB_URL is not set");return Ae(e,{prepare:!1,max:6,idle_timeout:5,connect_timeout:10})}var L={paused:!1,publishing:!1,monthly_cap_usd:60,first_run_cap_usd:200,models:{writer:"claude-sonnet-5-5",checker:"claude-haiku-4-5-20251001"},prices:{},per_tick:{write:4,photo:4,menus:2,avatars:4,publish:40},pexels_per_hour:180,only_cooks:[],backlog_spread_days:14};async function F(e){let t=await e`select key, value from seed.config`,i=Object.fromEntries(t.map(o=>[o.key,o.value]));return{...L,...i,per_tick:{...L.per_tick,...i.per_tick??{}}}}function y(e,t,i="cook_id"){return t.only_cooks.length===0?e`true`:e`${e(i)} = any(${t.only_cooks}::uuid[])`}async function G(e){let[t]=await e`
    select coalesce(sum(usd), 0) as usd from seed.usage
    where purpose <> 'pexels'
      and at >= date_trunc('month', now() at time zone 'Australia/Sydney') at time zone 'Australia/Sydney'`;return Number(t?.usd??0)}async function B(e){let[t]=await e`
    select exists (
      select 1 from seed.personas p join public.cooks c on c.id = p.cook_id
      where p.active and c.recipe_count < p.backlog_target
    ) as yes`;return t?.yes??!1}async function j(e,t){await e`
    insert into seed.usage (purpose, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, usd)
    values (${t.purpose}, ${t.model??null}, ${t.input_tokens??0}, ${t.output_tokens??0},
            ${t.cache_read_tokens??0}, ${t.cache_write_tokens??0}, ${t.usd??0})`}async function K(e){return(await e`
    insert into seed.config (key, value) values ('tick_lock', to_jsonb(now()))
    on conflict (key) do update set value = excluded.value
      where (seed.config.value #>> '{}')::timestamptz < now() - interval '3 minutes'
    returning key`).length>0}async function H(e){await e`update seed.config set value = to_jsonb('1970-01-01T00:00:00Z'::timestamptz) where key = 'tick_lock'`}async function Y(e,t){if(!t)return!1;let[i]=await e`
    select exists (
      select 1 from vault.decrypted_secrets where name = 'seed_cron_secret' and decrypted_secret = ${t}
    ) as ok`;return i?.ok??!1}async function C(e,t){let i=Deno.env.get(t);if(i)return i;let[o]=await e`select decrypted_secret as v from vault.decrypted_secrets where name = ${t}`;return o?.v}var m=e=>e;import{AISLES as He,INGREDIENT_GROUPS as Ye}from"./_domain.js";import{INGREDIENTS as Qe}from"./_ingredients.js";var x=class extends Error{},R=class extends Error{name="OutOfCredit"};async function _(e,t,i,o){let n=JSON.stringify({model:o.model,max_tokens:o.maxTokens,system:o.system,messages:[{role:"user",content:o.content}],tools:[o.tool],tool_choice:{type:"tool",name:o.tool.name}}),s="";for(let l=0;l<3;l++){l>0&&await new Promise(c=>setTimeout(c,l*6e3));let r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":i,"anthropic-version":"2023-06-01"},body:n,signal:AbortSignal.timeout(o.timeoutMs??1e5)}).catch(c=>{s=String(c)});if(!r)continue;if(r.status===429||r.status===529||r.status>=500){s=`HTTP ${r.status}: ${(await r.text()).slice(0,300)}`;continue}let a=await r.json();if(r.status===400&&/credit balance|spend limit|billing/i.test(JSON.stringify(a)))throw new R(JSON.stringify(a).slice(0,300));if(!r.ok)throw new x(`HTTP ${r.status}: ${JSON.stringify(a).slice(0,400)}`);await j(e,{purpose:o.purpose,model:o.model,...De(t,o.model,a.usage)});let p=a.content.find(c=>c.type==="tool_use"&&c.name===o.tool.name);if(!p)throw new x(`no ${o.tool.name} call (stop_reason ${a.stop_reason})`);if(a.stop_reason==="max_tokens")throw new x("answer was cut off at max_tokens");return p.input}throw new x(`gave up after retries: ${s}`)}function De(e,t,i){let o=e.prices[t]??{in:3,out:15},n=i.cache_creation_input_tokens??0,s=i.cache_read_input_tokens??0,l=(i.input_tokens*o.in+n*o.in*1.25+s*o.in*.1+i.output_tokens*o.out)/1e6;return{input_tokens:i.input_tokens,output_tokens:i.output_tokens,cache_read_tokens:s,cache_write_tokens:n,usd:l}}import{AISLES as je,CUISINES as Q,DIFFICULTIES as Ce,INGREDIENT_GROUPS as J,MEAL_TYPES as z,SEASONS as Re}from"./_domain.js";var Me=`You write recipes for The Pantry, an Australian cooking app built around cooking from what's already in your cupboard.
Each recipe is posted by one of the app's house cooks: a fictional home cook with a background, a kitchen and a voice of their own. House cooks are shown with a "Pantry Kitchen" badge, so never pretend to be a real person, and never mention being an AI.

The recipe has to work. A real person will cook it on a weeknight.

MEASURES AND SPELLING
- Australian metric: g, kg, ml, l, tsp, tbsp, cup (1 cup = 250 ml, 1 tbsp = 20 ml), cm, \xB0C. Never \xB0F, ounces, pounds, quarts or sticks of butter.
- Australian English: capsicum, coriander, eggplant, zucchini, spring onion, plain flour, caster sugar, mince, prawns, chilli, yoghurt.

INGREDIENT LINES
- One ingredient per line: "<amount> <unit> <ingredient>, <preparation> (<note>)". Examples:
  "500 g beef mince" \xB7 "2 garlic cloves, finely chopped" \xB7 "1 tbsp gochugaru (Korean chilli flakes)" \xB7 "400 g tin crushed tomatoes" \xB7 "Salt, to taste" \xB7 "Fresh coriander, to serve (optional)".
- Name each ingredient the way a cook from this cuisine names it. When that isn't the everyday Australian name, give the Australian name in brackets right after it: "1 tsp jeera (cumin seeds)", "200 g dalo (taro)".
- The ingredient word must be a name or alias from THE INGREDIENT DATABASE below, or be declared in newIngredients. If you use a name that isn't in the database (a native name, or a genuinely new ingredient), declare it:
  - name: the ingredient word exactly as it appears in your lines, without the bracketed English name ("dalo", not "dalo (taro)").
  - kind "alias": another name for something already in the database. aliasOf must be an id copied from THE INGREDIENT DATABASE list; if nothing there is the same thing, it is kind "new".
  - kind "new": not in the database. Give aisle, groups, and, if it's hard to find in an Australian supermarket, swapId (the closest database id) and swapTip ("Can't find dalo? Use potato; it cooks a little faster.").
  - groups decide diets and the avoid list, so be complete and strict: fish sauce, katsuobushi, anchovy and worcestershire are "fish"; shrimp paste and oyster sauce are "shellfish"; ghee, paneer and butter are "dairy"; most noodles, soy sauce and miso are "gluten"; any stock or fat from an animal counts as that animal; honey and gelatine are "animal-product"; anything with chilli heat is "chilli".
- Mark optional lines "(optional)". Only salt, pepper, oil for cooking, water and garnishes may go without an amount.
- Keep lists short: most dishes 6 to 12 ingredients, built from things a reasonable kitchen has. Use the cook's specialties for anything more special.
- Every ingredient used in the method is in the list, and everything in the list is used.

METHOD
- 4 to 12 steps. Each step is one stage of the cooking, with the heat, the time and how to tell it's done: "Cook, stirring, until the onion is soft and golden, about 8 minutes."
- Food safety: chicken, pork and mince are cooked through (chicken to 75\xB0C inside); rice is cooled quickly before storing; raw fish dishes say to use sashimi-grade or very fresh fish.
- prepMinutes and cookMinutes must honestly add up to the method's times, including marinating and resting.
- Quantities make sense for the servings stated.

WORDS
- summary: one sentence, at most 110 characters, saying what the dish is. No "delicious", "mouth-watering", "perfect for", "elevate", "game-changer".
- caption: what this cook writes when they share it. 1 to 4 sentences in their own voice, with one specific, believable detail (when they cook it, who taught them, what they change). No hashtags or emoji unless their brief says they use them. No health claims, no brand names, no real people's names (family roles like "my aunty" are fine).
  Vary how captions open: never start with "This is", and don't lean on "go-to", "lifesaver", "hero", "game changer", "secret weapon", "trick", "sings" or "honestly". Use the cook's catchphrases at most once in three captions. Captions can be short; one good sentence beats four ordinary ones.
- notes (optional, at most 3): storage, make-ahead or a swap a cook would genuinely want.

PHOTO
- photoQuery: 2 to 5 plain English words to find a stock photo of the finished dish ("korean pork stew", "coconut lime raw fish").
- photoFallbackQuery: a broader version ("pork stew bowl").
- photoDescription: one sentence on what the finished dish looks like on the plate.`;function W(e,t){let i=e.map(n=>`${n.id}: ${[n.name,...n.aliases].join(" / ")}`).join(`
`),o=[{type:"text",text:Me},{type:"text",text:`THE INGREDIENT DATABASE (id: names)
${i}`,cache_control:{type:"ephemeral"}}];if(t.length){let n=t.map(s=>s.kind==="alias"?`${s.name} → alias of ${s.alias_of}`:`${s.id}: ${[s.name,...s.aliases].join(" / ")} (new)`);o.push({type:"text",text:`ALREADY DECLARED (use freely, don't redeclare)
${n.join(`
`)}`,cache_control:{type:"ephemeral"}})}return o}var V=`You plan which dishes one of The Pantry's house cooks will post. House cooks are fictional home cooks with distinct backgrounds; their recipes are what they'd really cook at home.
- Mostly dinners, some lunches; breakfasts, snacks and sweets as the cook's brief suggests.
- About 7 in 10 are weeknight cooking: 45 minutes or less, ordinary ingredients. The rest can be weekend or project cooking.
- Home cooking, regional and specific. Not restaurant showpieces, not fusion gimmicks, not "healthy" makeovers unless that's who the cook is.
- Title: what this cook calls it. Use the dish's own name where it has one ("Kokoda", "Dal tadka", "Pastel de choclo"); the angle says what it is in plain English.
- Every title must be a genuinely different dish from the ones listed as taken, not a rewording.
- cuisine must be one of the app's cuisines; region is the specific place or community ("Fijian", "Punjabi", "Sicilian").`,X={name:"plan_menu",description:"The dishes this cook will post.",input_schema:{type:"object",required:["dishes"],properties:{dishes:{type:"array",items:{type:"object",required:["title","cuisine","region","meal_type","angle"],properties:{title:{type:"string",maxLength:70},cuisine:{type:"string",enum:Q},region:{type:"string",maxLength:40},meal_type:{type:"string",enum:z},angle:{type:"string",maxLength:140,description:"What the dish is, in plain English, and this cook’s take on it."}}}}}}},Z={name:"write_recipe",description:"The finished recipe, as this house cook would post it.",input_schema:{type:"object",required:["title","summary","caption","cuisine","region","mealTypes","difficulty","prepMinutes","cookMinutes","servings","onePot","ingredientGroups","steps","newIngredients","photoQuery","photoFallbackQuery","photoDescription"],properties:{title:{type:"string",maxLength:80},summary:{type:"string",maxLength:120},caption:{type:"string",maxLength:600},cuisine:{type:"string",enum:Q},region:{type:"string",maxLength:40},mealTypes:{type:"array",items:{type:"string",enum:z},minItems:1},difficulty:{type:"string",enum:Ce},prepMinutes:{type:"integer",minimum:0},cookMinutes:{type:"integer",minimum:0},servings:{type:"integer",minimum:1,maximum:12},onePot:{type:"boolean"},seasons:{type:"array",items:{type:"string",enum:Re}},ingredientGroups:{type:"array",minItems:1,items:{type:"object",required:["lines"],properties:{title:{type:"string",description:'Only when the recipe has parts, e.g. "Marinade".'},lines:{type:"array",items:{type:"string"},minItems:1}}}},steps:{type:"array",items:{type:"string"},minItems:3},notes:{type:"array",items:{type:"string"},maxItems:3},newIngredients:{type:"array",items:{type:"object",required:["kind","name"],properties:{kind:{type:"string",enum:["alias","new"]},name:{type:"string",description:"The name exactly as used in the lines."},aliasOf:{type:"string",description:"kind alias: the database id it is another name for."},aliases:{type:"array",items:{type:"string"}},aisle:{type:"string",enum:je},groups:{type:"array",items:{type:"string",enum:J}},swapId:{type:"string",description:"kind new: closest database id to use instead."},swapTip:{type:"string",maxLength:200}}}},photoQuery:{type:"string"},photoFallbackQuery:{type:"string"},photoDescription:{type:"string"}}}},ee=`You are The Pantry's recipe tester. Read the recipe as a careful home cook about to make it, and decide whether it can be published.
Fail it ("fix") only for real problems:
- unsafe: meat, poultry or seafood not cooked safely; dangerous technique without a warning;
- won't work: quantities clearly wrong for the servings, a step that can't produce the result, times that don't fit the method;
- incomplete: an ingredient used in the method that isn't listed, or a listed ingredient never used; a missing step;
- wrong for its cuisine in a way a cook from there would object to;
- not Australian metric (\xB0F, ounces, pounds, sticks). g, kg, ml, l, tsp, tbsp and cup ARE Australian metric, and every recipe uses them whatever its cuisine.
Never fail a recipe for:
- doneness preferences (how pink, how soft, how rubbery), or cook times within a few minutes of what you'd do;
- the caption, unless it names a real public figure or mentions being an AI. It's written in the first person by a named, clearly labelled fictional house cook, so family details and personal history are intended;
- wording: an ingredient called by two names (coriander and cilantro, prawn and shrimp), or a phrase you'd put differently;
- native ingredient names (with or without an English name in brackets), or hard-to-find ingredients;
- small arithmetic differences between the times in the method and the stated prep and cook times.
When in doubt, pass. A rewrite costs more than a small imperfection.
Each problem: one sentence saying what to change.`,te={name:"review",description:"Whether the recipe can be published.",input_schema:{type:"object",required:["verdict","problems"],properties:{verdict:{type:"string",enum:["pass","fix"]},problems:{type:"array",items:{type:"string"}}}}},ie=`You check ingredient facts for a cooking app. For each ingredient, give the groups that apply, strictly:
meat (any land animal flesh, including its stock or fat), beef, pork, lamb, poultry, fish, shellfish, dairy, egg, gluten (wheat, barley, rye and most noodles, soy sauce, miso), tree-nuts, peanuts, sesame, soy, animal-product (not meat but not vegan: honey, gelatine, animal rennet cheese), alcohol, chilli (has chilli heat).
For an alias, say whether it really is another name for the database item.`,ne={name:"verify",description:"Groups for each new ingredient, and whether each alias is right.",input_schema:{type:"object",required:["items"],properties:{items:{type:"array",items:{type:"object",required:["id"],properties:{id:{type:"string"},groups:{type:"array",items:{type:"string",enum:J}},aliasIsRight:{type:"boolean"},note:{type:"string"}}}}}}},se=`You choose a stock photo for a recipe in a cooking app. A cook who has just made this recipe must look at the photo and say "yes, that's it".
- sameDish is true only if the photo shows this specific dish with its main ingredients visible. A different dish of the same kind is false: carrot halwa is not moong dal halwa, fried chicken is not fish fingers, noodles are not squid, a beef stew is not seaweed soup, chips are not cassava fries.
- Reject raw ingredients only, people or hands as the main subject, text, logos, watermarks, packaging, or anything unappetising.
- Each photo comes with the photographer's description. If it names a different dish ("wonton soup" for tortellini in brodo, "churros" for koeksisters, "dal" for harira), or a different country's dish, descriptionFits is false, whatever the picture looks like. A vague description ("a delicious Asian dish") fits only if the picture clearly shows this dish.
- Usually none of them is right, and that's fine: answer choice -1 and sameDish false. A missing photo is better than a wrong one.`,oe={name:"pick_photo",description:"The number of the photo that honestly shows this dish, or -1.",input_schema:{type:"object",required:["choice","sameDish","descriptionFits","mainIngredientsVisible"],properties:{choice:{type:"integer",minimum:-1},sameDish:{type:"boolean",description:"True only if the chosen photo is this specific dish."},descriptionFits:{type:"boolean",description:"True only if the chosen photo’s description does not name a different dish."},mainIngredientsVisible:{type:"array",items:{type:"string"},description:"The recipe’s main ingredients you can actually see in the chosen photo."}}}};import{buildIngredientIndex as qe,deriveDiets as Ne,parseIngredientLine as Oe,validateRecipe as Le}from"./_domain.js";import{INGREDIENTS as re}from"./_ingredients.js";var ae=new Set(re.map(e=>e.id));function T(e){return e.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60).replace(/-+$/,"")}function le(e){let t=re.map(n=>({...n,aliases:[...n.aliases]})),i=new Map(t.map(n=>[n.id,n])),o=n=>n.flatMap(s=>[s,.../\bleaf\b/.test(s)?[s.replace(/\bleaf\b/g,"leaves")]:[],.../\bleaves\b/.test(s)?[s.replace(/\bleaves\b/g,"leaf")]:[]]);for(let n of e)if(!(n.status==="rejected"||n.kind==="alias"&&n.status==="needs-review")){if(n.kind==="alias")i.get(n.alias_of??"")?.aliases.push(...o([n.name,...n.aliases].map(s=>s.toLowerCase())));else if(!i.has(n.id)){let s={id:n.id,name:n.name,aisle:n.aisle??"other",aliases:o([n.name,...n.aliases].map(l=>l.toLowerCase())),groups:n.groups};t.push(s),i.set(n.id,s)}}return qe(t)}var Ue=/°\s?F\b|\bfahrenheit\b/i,Fe=/\b\d+(?:\.\d+)?\s*(?:oz|ounces?|lbs?|pounds?|quarts?)\b|\bsticks? of butter\b/i,S=e=>Array.isArray(e)?e.filter(t=>typeof t=="string"&&t.trim()!==""):typeof e=="string"?e.split(`
`).map(t=>t.replace(/^\s*(\d+[.)]|[-•])\s*/,"").trim()).filter(Boolean):[];function ce(e){let t=e??{},i=[];for(let r of["title","summary","caption","cuisine","difficulty","photoQuery"])(typeof t[r]!="string"||!t[r].trim())&&i.push(`${r} is missing`);let n=(Array.isArray(t.ingredientGroups)?t.ingredientGroups:[]).map(r=>({title:typeof r?.title=="string"&&r.title.trim()?r.title:void 0,lines:S(r?.lines)})).filter(r=>r.lines.length);n.length||i.push("ingredientGroups has no lines");let s=S(t.steps);s.length||i.push("steps is missing");let l=r=>typeof r=="number"?Math.round(r):Number.parseInt(String(r),10);return i.length?{problems:i}:{problems:i,draft:{...t,mealTypes:S(t.mealTypes),seasons:S(t.seasons),prepMinutes:l(t.prepMinutes),cookMinutes:l(t.cookMinutes),servings:l(t.servings),onePot:t.onePot===!0,region:typeof t.region=="string"?t.region:void 0,notes:S(t.notes),ingredientGroups:n,steps:s,newIngredients:Array.isArray(t.newIngredients)?t.newIngredients.filter(r=>r&&typeof r.name=="string"):[],photoFallbackQuery:typeof t.photoFallbackQuery=="string"?t.photoFallbackQuery:t.photoQuery,photoDescription:typeof t.photoDescription=="string"?t.photoDescription:t.summary}}}function E(e,t,i){let o=le(i),n=[],s=[],l=t.ingredientGroups.map(d=>({...d.title?{title:d.title}:{},items:d.lines.map(b=>{let{line:$,issues:D}=Oe(b,o.match);return D.includes("no-ingredient-match")&&!$.optional&&s.push($.item),$})})),r={id:e,title:t.title.trim(),summary:t.summary.trim(),cuisine:t.cuisine,diets:[],mealTypes:t.mealTypes,difficulty:t.difficulty,prepMinutes:t.prepMinutes,cookMinutes:t.cookMinutes,servings:t.servings,onePot:t.onePot,...t.seasons?.length?{seasons:t.seasons}:{},ingredientGroups:l,steps:t.steps.map(d=>({text:d.trim()})),...t.notes?.length?{notes:t.notes}:{},source:"user"};for(let d of Le(r))n.push(`${d.path} ${d.message}`);let a=l.flatMap(d=>d.items);(a.length<3||a.length>30)&&n.push(`has ${a.length} ingredients; keep it between 3 and 30`),(t.steps.length<3||t.steps.length>14)&&n.push(`has ${t.steps.length} steps; keep it between 3 and 14`),t.prepMinutes+t.cookMinutes<5&&n.push("total time under 5 minutes is not believable");let p=[...t.ingredientGroups.flatMap(d=>d.lines),...t.steps,...t.notes??[]].join(`
`);Ue.test(p)&&n.push("uses Fahrenheit; use \xB0C"),Fe.test(p)&&n.push("uses imperial measures; use metric");for(let d of p.matchAll(/(\d{2,3})\s?°C/g)){let b=Number(d[1]);b>300&&n.push(`${b}\xB0C is hotter than a home oven`)}let c=new Set(i.filter(d=>d.kind==="new"&&d.status!=="verified"&&d.status!=="approved").map(d=>d.id)),u=a.some(d=>!d.optional&&d.ingredientId!==void 0&&c.has(d.ingredientId));return r.diets=u?[]:Ne(a,o.byId),{recipe:r,problems:n,dietsPending:u,unmatched:s}}function pe(e,t,i){let o=[],n=[],s=le([]);for(let l of e){let r=/\(([^)]*)\)/.exec(l.name??""),a={...l,name:(l.name??"").replace(/\([^)]*\)/g,"").trim(),aliases:[...Array.isArray(l.aliases)?l.aliases.filter(c=>typeof c=="string"):[],...r?.[1]?[r[1].trim()]:[]],groups:Array.isArray(l.groups)?l.groups:[]},p=T(a.name);!p||s.match(a.name)!==void 0||(a.kind==="alias"&&(!a.aliasOf||!ae.has(a.aliasOf))?o.push({id:p,kind:"new",alias_of:null,name:a.name,aliases:a.aliases??[],aisle:"other",groups:[],auto:!0}):a.kind==="alias"?o.push({id:p,kind:"alias",alias_of:a.aliasOf,name:a.name,aliases:a.aliases??[],aisle:null,groups:[]}):o.push({id:p,kind:"new",alias_of:null,name:a.name,aliases:a.aliases??[],aisle:a.aisle&&t.includes(a.aisle)?a.aisle:"other",groups:(a.groups??[]).filter(c=>i.includes(c)),swap_id:a.swapId&&ae.has(a.swapId)?a.swapId:null,swap_tip:a.swapTip?.slice(0,240)??null}))}return{ok:o,problems:n}}var Ge=864e5;function Be(e,t,i){let o=i<t.backlog_target,n=e.cfg.backlog_spread_days;if(o&&n<=0)return 0;let s=o?t.backlog_target/n:Number(t.posts_per_week)/7;if(!(s<=0))return Ge/s*(.5+Math.random())}async function ue(e){let{sql:t,cfg:i}=e;if(!i.publishing)return;let o=await t`
    select p.cook_id, p.backlog_target, p.posts_per_week, c.recipe_count
    from seed.personas p join public.cooks c on c.id = p.cook_id
    where p.active and ${y(t,i,"p.cook_id")}
      and (p.next_post_at is null or p.next_post_at <= now())
      and (${i.backlog_spread_days<=0} or extract(hour from now() at time zone p.timezone) between 7 and 21)
    order by p.next_post_at nulls first
    limit ${i.per_tick.publish}`,n=await k(e);for(let s of o){let l=s.recipe_count;for(let r=0;r===0&&f(e)>1e4;){let[a]=await t`
        select id, draft, photo from seed.dishes
        where cook_id = ${s.cook_id} and stage = 'photographed' order by created_at limit 1`;if(!a)break;await Ke(e,s.cook_id,a,n)?l++:n=await k(e),r=Be(e,s,l);let p=r===void 0?null:new Date(Date.now()+r);await t`update seed.personas set next_post_at = ${p} where cook_id = ${s.cook_id}`}}}async function Ke(e,t,i,o){let{sql:n}=e,s=i.draft,l=E(i.id,s,o);if(l.problems.length)return await n`update seed.dishes set stage = 'planned', feedback = ${l.problems.join(`
`)} where id = ${i.id}`,g(e,"publish_errors",`${s.title}: ${l.problems[0]}`),!1;let r=T(s.title)||"recipe",[{taken:a}]=await n`
    select exists (select 1 from public.published_recipes where cook_id = ${t} and slug = ${r}) as taken`,p=a?`${r}-${i.id.slice(0,4)}`:r,c=i.photo?.path&&(i.photo.id||i.photo.ai)?i.photo:void 0,u=c?c.ai?"ai":"pexels":null;try{return await n.begin(async d=>{await d`
        insert into public.published_recipes (
          id, cook_id, slug, title, cuisine, region, meal_types, diets, difficulty, total_minutes, recipe, caption,
          photo_path, photo_credit, photo_source, photo_source_id, photo_width, photo_height, review, diets_pending)
        values (
          ${i.id}, ${t}, ${p}, ${s.title.slice(0,80)}, ${s.cuisine}, ${s.region?.slice(0,40)??null},
          ${s.mealTypes}, ${l.recipe.diets}, ${s.difficulty}, ${Math.max(s.prepMinutes+s.cookMinutes,1)},
          ${d.json(m(l.recipe))}, ${s.caption.slice(0,600)},
          ${c?.path??null}, ${c?.credit??null}, ${u}, ${c?.id??null},
          ${c?.width??null}, ${c?.height??null}, 'auto-checked', ${l.dietsPending||l.unmatched.length>0})`,await d`update seed.dishes set stage = 'published', published_id = ${i.id}, updated_at = now() where id = ${i.id}`}),h(e,"published"),!0}catch(d){return g(e,"publish_errors",`${s.title}: ${String(d)}`),!1}}function de(e,t,i){let o=new Set(e.cuisines);return t.filter(n=>n.id!==e.id&&n.kind==="house").map(n=>({id:n.id,score:n.cuisines.filter(s=>o.has(s)).length*2+(n.region===e.region?2:0)+Math.random()*3})).sort((n,s)=>s.score-n.score).slice(0,i).map(n=>n.id)}async function he(e){let{sql:t,cfg:i}=e,o=await t`
    select c.id, c.kind, c.following_count as following,
      coalesce((select array_agg(x->>'id') from jsonb_array_elements(p.brief->'cuisines') x), '{}') as cuisines,
      coalesce(p.brief->>'country', '') as region
    from public.cooks c join seed.personas p on p.cook_id = c.id
    where c.kind in ('house', 'official') and p.active`,n=o.find(a=>a.kind==="official"),s=new Set(i.only_cooks),l=o.filter(a=>a.kind==="house"&&a.following===0&&(s.size===0||s.has(a.id)));for(let a of l){let p=de(a,o,6+Math.floor(Math.random()*30));n&&p.push(n.id);for(let c of p)await t`insert into public.follows (follower_id, followee_id) values (${a.id}, ${c}) on conflict do nothing`;h(e,"follows",p.length)}let r=o.filter(a=>a.kind==="house"&&a.following>0&&a.following<80);if(r.length&&Math.random()<3/1440){let a=r[Math.floor(Math.random()*r.length)],[p]=de(a,o,8).sort(()=>Math.random()-.5);p&&(await t`insert into public.follows (follower_id, followee_id) values (${a.id}, ${p}) on conflict do nothing`,h(e,"follows"))}}async function P(e,t){let{sql:i,cfg:o}=e,n=await i`
    select id, kind, name, aliases, alias_of, groups, review_note from public.ingredient_extras
    where status = 'proposed' ${t?i`and id = any(${t}::text[])`:i``}
    order by created_at limit 20`;if(!n.length||!t&&f(e)<3e4)return;let s=n.map(l=>l.kind==="alias"?`${l.id}: is "${l.name}" another name for database item "${l.alias_of}"?`:`${l.id}: ${l.name}${l.aliases.length?` (also ${l.aliases.join(", ")})`:""}`).join(`
`);try{let l=await _(i,o,e.anthropicKey,{purpose:"verify",model:o.models.checker,maxTokens:2500,tool:ne,system:[{type:"text",text:ie}],content:[{type:"text",text:s}]}),r=new Map(l.items.map(a=>[a.id,a]));for(let a of n){let p=r.get(a.id);if(!p)continue;if(a.review_note==="auto"){await i`update public.ingredient_extras set groups = ${p.groups??[]}, status = 'verified',
          review_note = 'auto: groups from one check' where id = ${a.id}`,h(e,"extras_verified");continue}let c=a.kind==="alias"?p.aliasIsRight===!0:[...p.groups??[]].sort().join(",")===[...a.groups].sort().join(","),u=c?null:a.kind==="alias"?`checker: not the same thing. ${p.note??""}`:`writer said [${a.groups}], checker said [${p.groups??[]}]. ${p.note??""}`;await i`update public.ingredient_extras set status = ${c?"verified":"needs-review"}, review_note = ${u} where id = ${a.id}`,h(e,c?"extras_verified":"extras_need_review")}}catch(l){if(l instanceof Error&&l.name==="OutOfCredit")throw l;g(e,"verify_errors",String(l))}}async function ge(e){let{sql:t}=e,i=await t`
    select d.id, d.draft from public.published_recipes r join seed.dishes d on d.published_id = r.id
    where r.diets_pending limit 30`;if(!i.length)return;let o=await k(e);for(let n of i){let s=E(n.id,n.draft,o);s.dietsPending||s.unmatched.length||s.problems.length||(await t`
      update public.published_recipes set diets = ${s.recipe.diets}, diets_pending = false,
        recipe = jsonb_set(recipe, '{diets}', ${t.json(m(s.recipe.diets))})
      where id = ${n.id}`,h(e,"diets_refreshed"))}}var me=3,Je=3;async function k(e){return await e.sql`
    select id, kind, alias_of, name, aliases, aisle, groups, swap_id, swap_tip, status
    from public.ingredient_extras where status <> 'rejected' order by id`}async function ze(e,t){let i=await e.sql`
    select cook_id, brief from seed.personas where cook_id = any(${t}::uuid[])`;return new Map(i.map(o=>[o.cook_id,o.brief]))}async function fe(e){let{sql:t,cfg:i}=e,o=await t`
    select p.cook_id, p.brief, greatest(p.backlog_target - c.recipe_count, 0) + ${me} - w.waiting as need
    from seed.personas p join public.cooks c on c.id = p.cook_id,
    lateral (
      select count(*) filter (where d.stage not in ('failed', 'published'))::int as waiting,
             count(*) filter (where d.stage = 'planned')::int as planned,
             count(*) filter (where d.stage <> 'failed')::int as total
      from seed.dishes d where d.cook_id = p.cook_id
    ) w
    where p.active and ${y(t,i,"p.cook_id")} and w.planned < 2
      and greatest(p.backlog_target - c.recipe_count, 0) + ${me} - w.waiting > 0
    order by w.total, random()
    limit ${i.per_tick.menus}`;await v(o,2,async n=>{if(f(e)<6e4)return;let s=Math.min(n.need,5),l=(n.brief.cuisines??[]).map(p=>p.id),r=await t`select title from seed.dishes where cook_id = ${n.cook_id} and stage <> 'failed'`,a=await t`
      select title from seed.dishes
      where cook_id <> ${n.cook_id} and stage <> 'failed' and cuisine = any(${l}::text[])
      order by created_at desc limit 400`;try{let p=await _(t,i,e.anthropicKey,{purpose:"menu",model:i.models.writer,maxTokens:3e3,tool:X,system:[{type:"text",text:V}],content:[{type:"text",text:[`THE COOK
${JSON.stringify(n.brief,null,1)}`,`ALREADY ON THEIR MENU
${r.map(c=>c.title).join(`
`)||"(nothing yet)"}`,`TAKEN BY OTHER COOKS
${a.map(c=>c.title).join(`
`)||"(nothing yet)"}`,`Plan ${s} new dishes for this cook.`].join(`

`)}]});for(let c of p.dishes.slice(0,s)){let u=await t`
          insert into seed.dishes (cook_id, title, cuisine, region, meal_type, angle)
          values (${n.cook_id}, ${c.title.trim().slice(0,80)}, ${c.cuisine}, ${c.region?.slice(0,40)??null}, ${c.meal_type}, ${c.angle??null})
          on conflict ((lower(title))) where stage <> 'failed' do nothing returning id`;h(e,u.length?"planned":"planned_duplicate")}}catch(p){await w(e,p)||g(e,"menu_errors",String(p))}})}async function we(e,t,i){let{sql:o,cfg:n}=e;return i<=0?[]:await o`
    update seed.dishes set locked_until = now() + interval '4 minutes', updated_at = now()
      ${t==="planned"?o`, attempts = attempts + 1`:o``}
    where id in (
      select d.id from seed.dishes d
      where d.stage = ${t} and (d.locked_until is null or d.locked_until < now()) and ${y(o,n,"d.cook_id")}
      -- Round robin: the cook with the fewest finished dishes goes first, so a
      -- limited budget spreads across everyone instead of filling a few.
      order by (select count(*) from seed.dishes x where x.cook_id = d.cook_id
                  and x.stage in ('written', 'checked', 'photographed', 'published')), d.created_at
      for update of d skip locked
      limit ${i}
    )
    returning id, cook_id, title, cuisine, region, meal_type, angle, attempts, feedback, draft`}async function M(e,t,i){await e.sql`
    update seed.dishes set locked_until = null ${i?e.sql`, attempts = greatest(attempts - 1, 0)`:e.sql``}
    where id = ${t.id}`}async function I(e,t,i){let o=t.attempts>=Je;await e.sql`
    update seed.dishes set stage = ${o?"failed":"planned"}, feedback = ${i.slice(0,2e3)},
      locked_until = null, updated_at = now()
    where id = ${t.id}`,h(e,o?"failed":"sent_back"),g(e,"sent_back_why",`${t.title}: ${i}`)}async function ye(e){let{sql:t,cfg:i}=e,o=await we(e,"planned",i.per_tick.write);if(!o.length)return;let n=await k(e),s=W(Qe,n),l=await ze(e,[...new Set(o.map(r=>r.cook_id))]);await v(o,i.per_tick.write,async r=>{let a=[`THE COOK
${JSON.stringify(l.get(r.cook_id),null,1)}`,`THE DISH
Title: ${r.title}
Cuisine: ${r.cuisine}${r.region?` (${r.region})`:""}
Meal: ${r.meal_type}
What it is: ${r.angle??""}`,r.feedback?`The tester sent the last version back. Fix every one of these:
${r.feedback}`:"","Write the recipe."].filter(Boolean).join(`

`);try{let p=await _(t,i,e.anthropicKey,{purpose:"write",model:i.models.writer,maxTokens:5e3,tool:Z,system:s,content:[{type:"text",text:a}]}),{draft:c,problems:u}=ce(p);if(!c)return await I(e,r,u.map(d=>`- ${d}`).join(`
`));await t`
        update seed.dishes set stage = 'written', draft = ${t.json(m(c))}, locked_until = null, updated_at = now()
        where id = ${r.id}`,h(e,"written")}catch(p){if(await w(e,p))return await M(e,r,!0);await I(e,r,`Writing failed: ${String(p)}`)}})}function We(e){return[`${e.title} (${e.cuisine}${e.region?`, ${e.region}`:""})`,`Serves ${e.servings} \xB7 prep ${e.prepMinutes} min \xB7 cook ${e.cookMinutes} min \xB7 ${e.difficulty}`,e.summary,...e.ingredientGroups.map(t=>`${t.title?`${t.title}:
`:`Ingredients:
`}${t.lines.map(i=>`- ${i}`).join(`
`)}`),`Method:
${e.steps.map((t,i)=>`${i+1}. ${t}`).join(`
`)}`,e.notes?.length?`Notes:
${e.notes.join(`
`)}`:"",`Caption: ${e.caption}`].filter(Boolean).join(`

`)}async function _e(e){let{sql:t,cfg:i}=e,o=await we(e,"written",i.per_tick.write*2);await v(o,4,async n=>{try{await Ve(e,n)}catch(s){if(await w(e,s))return await M(e,n,!1);await I(e,n,`Checking failed: ${String(s)}`)}})}async function Ve(e,t){let{sql:i,cfg:o}=e;{let n=t.draft,s=pe(n.newIngredients??[],He,Ye);for(let c of s.ok)await i`
        insert into public.ingredient_extras (id, kind, alias_of, name, aliases, aisle, groups, swap_id, swap_tip, review_note)
        values (${c.id}, ${c.kind}, ${c.alias_of}, ${c.name.slice(0,60)}, ${c.aliases}, ${c.aisle}, ${c.groups},
                ${c.swap_id??null}, ${c.swap_tip??null}, ${c.auto?"auto":null})
        on conflict (id) do nothing`;s.ok.length&&await P(e,s.ok.map(c=>c.id));let l=await k(e),r=l.filter(c=>c.kind==="alias"&&c.status==="needs-review"&&s.ok.some(u=>u.id===c.id));if(r.length){let c=r.map(u=>u.id);await i`
        update public.ingredient_extras set kind = 'new', alias_of = null, groups = '{}', aisle = 'other',
          status = 'proposed', review_note = 'auto'
        where id = any(${c}::text[])`,await P(e,c),l=await k(e)}let a=E(t.id,n,l);if(a.unmatched.length&&!s.problems.length&&!a.problems.length){let c=await Xe(e,a.unmatched);c.length&&await P(e,c),l=await k(e),a=E(t.id,n,l)}let p=[...s.problems,...a.problems,...a.unmatched.map(c=>`"${c}" isn't an ingredient the app can identify. Use a database name, or declare it in newIngredients.`)];if(p.length)return await I(e,t,p.map(c=>`- ${c}`).join(`
`));try{let c=await _(i,o,e.anthropicKey,{purpose:"review",model:o.models.checker,maxTokens:800,tool:te,system:[{type:"text",text:ee}],content:[{type:"text",text:We(n)}]});if(c.verdict==="fix")return await I(e,t,c.problems.map(u=>`- ${u}`).join(`
`))}catch(c){return await M(e,t,!1),await w(e,c)?void 0:g(e,"review_errors",String(c))}await i`
      update seed.dishes set stage = 'checked', recipe = ${i.json(m(a.recipe))}, feedback = null,
        locked_until = null, updated_at = now()
      where id = ${t.id}`,h(e,"checked")}}async function Xe(e,t){let i=[];for(let o of new Set(t.map(n=>n.trim().toLowerCase()))){let n=T(o);!n||o.length>60||o.split(/\s+/).length>5||(await e.sql`
      insert into public.ingredient_extras (id, kind, name, aisle, groups, review_note)
      values (${n}, 'new', ${o}, 'other', '{}', 'auto')
      -- A name rejected earlier as a wrong alias can still be a real ingredient in its own right.
      on conflict (id) do update set kind = 'new', alias_of = null, groups = '{}', aisle = 'other',
        status = 'proposed', review_note = 'auto'
      where public.ingredient_extras.status = 'rejected' and public.ingredient_extras.kind = 'alias'`,i.push(n))}return h(e,"extras_auto",i.length),i}async function Ze(e){let[t]=await e.sql`
    select count(*)::int as n from seed.usage where purpose = 'pexels' and at > now() - interval '1 hour'`;return e.cfg.pexels_per_hour-(t?.n??0)}async function ke(e,t,i){let o=new URLSearchParams({query:t,per_page:String(i.perPage),...i.orientation?{orientation:i.orientation}:{}}),n=await fetch(`https://api.pexels.com/v1/search?${o}`,{headers:{Authorization:e.pexelsKey},signal:AbortSignal.timeout(15e3)});if(await j(e.sql,{purpose:"pexels"}),!n.ok)throw new Error(`Pexels ${n.status}: ${(await n.text()).slice(0,200)}`);return(await n.json()).photos??[]}async function be(e){let t=await e.sql`
    select photo_source_id as id from public.published_recipes where photo_source = 'pexels' and photo_source_id is not null
    union select photo->>'id' from seed.dishes where photo ? 'id'
    -- A photo judged wrong for one dish is never offered again.
    union select photo->'rejected'->>'id' from seed.dishes where photo ? 'rejected'`;return new Set(t.map(i=>i.id))}async function A(e,t,i){let o=await fetch(i,{signal:AbortSignal.timeout(3e4)});if(!o.ok)throw new Error(`download ${o.status}`);let n=o.headers.get("content-type")??"image/jpeg",s=new Uint8Array(await o.arrayBuffer()),l=await fetch(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/${e}/${t}`,{method:"POST",headers:{apikey:q(),...q().split(".").length===3?{Authorization:`Bearer ${q()}`}:{},"content-type":n.split(";")[0],"x-upsert":"true","cache-control":"max-age=31536000"},body:s});if(!l.ok)throw new Error(`upload ${l.status}: ${(await l.text()).slice(0,200)}`);return{path:t,bytes:s.byteLength}}function q(){return Deno.env.get("SUPABASE_SECRET_KEY")??Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??""}var $e=(e,t,i)=>`${e.src.original}?auto=compress&cs=tinysrgb&w=${t}${i?`&h=${i}&fit=crop`:""}`;async function N(e,t,i){let o=[{type:"text",text:`Dish: ${t.title}
${t.summary}
Looks like: ${t.photoDescription}`},...i.flatMap((l,r)=>[{type:"text",text:`Photo ${r}: ${l.alt}`},{type:"image",source:{type:"url",url:l.src.medium}}])],n=await _(e.sql,e.cfg,e.anthropicKey,{purpose:"photo",model:e.cfg.models.checker,maxTokens:400,tool:oe,system:[{type:"text",text:se}],content:o});return n.sameDish===!0&&n.descriptionFits===!0&&(n.mainIngredientsVisible?.length??0)>0?i[n.choice]:void 0}async function ve(e){let{sql:t,cfg:i}=e;if(!e.pexelsKey)return g(e,"photo_errors","PEXELS_API_KEY is not set");let o=await Ze(e),n=Math.min(i.per_tick.photo,Math.floor(o/2));if(n<=0)return;let s=await t`
    update seed.dishes set locked_until = now() + interval '4 minutes'
    where id in (
      select id from seed.dishes where stage = 'checked' and (locked_until is null or locked_until < now())
        and ${y(t,i)}
      order by created_at for update skip locked limit ${n}
    ) returning id, draft`,l=await be(e);for(let r of s){if(f(e)<2e4){await t`update seed.dishes set locked_until = null where id = ${r.id}`;continue}try{let a;for(let c of[r.draft.photoQuery,r.draft.photoFallbackQuery]){let u=(await ke(e,c,{perPage:15,orientation:"landscape"})).filter(d=>!l.has(String(d.id))).slice(0,8);if(u.length&&(a=await N(e,r.draft,u)),a)break}let p={none:!0,want_ai:!0};if(a){let c=await A("recipe-photos",`house/${r.id}.jpg`,$e(a,1200));l.add(String(a.id)),p={id:String(a.id),path:c.path,credit:`Photo: ${a.photographer} / Pexels`.slice(0,120),width:1200,height:Math.round(1200*a.height/a.width),page:a.url,alt:a.alt,rechecked:!0}}await t`
        update seed.dishes set stage = 'photographed', photo = ${t.json(m(p))}, locked_until = null, updated_at = now()
        where id = ${r.id}`,h(e,a?"photographed":"no_photo")}catch(a){if(await w(e,a)){await t`update seed.dishes set locked_until = null where id = ${r.id}`;return}if(/download the file/i.test(String(a))){await t`
          update seed.dishes set stage = 'photographed', photo = ${t.json(m({none:!0,want_ai:!0}))},
            locked_until = null, updated_at = now()
          where id = ${r.id}`,h(e,"no_photo");continue}await t`update seed.dishes set locked_until = null where id = ${r.id}`,g(e,"photo_errors",String(a))}}}async function xe(e){let{sql:t,cfg:i}=e,o=await t`
    select p.cook_id, p.avatar_source_url, p.avatar_photo_query, c.avatar_kind
    from seed.personas p join public.cooks c on c.id = p.cook_id
    where c.avatar_path is null and (p.avatar_source_url is not null or p.avatar_photo_query is not null)
      and ${y(t,i,"p.cook_id")}
    limit ${i.per_tick.avatars}`,n=o.some(s=>s.avatar_photo_query)?await be(e):new Set;for(let s of o){if(f(e)<15e3)return;try{if(s.avatar_source_url){let l=s.avatar_source_url.split("?")[0].match(/\.(png|webp|jpe?g)$/i)?.[1]?.toLowerCase().replace("jpeg","jpg")??"jpg",{path:r}=await A("avatars",`cooks/${s.cook_id}.${l}`,s.avatar_source_url);await t`update public.cooks set avatar_path = ${r} where id = ${s.cook_id}`}else if(e.pexelsKey){let r=(await ke(e,s.avatar_photo_query,{perPage:10,orientation:"square"})).filter(p=>!n.has(String(p.id)))[0];if(!r)throw new Error(`no avatar photo for "${s.avatar_photo_query}"`);n.add(String(r.id));let{path:a}=await A("avatars",`cooks/${s.cook_id}.jpg`,$e(r,400,400));await t`
          update public.cooks set avatar_path = ${a}, avatar_kind = 'food-photo',
            avatar_credit = ${`Photo: ${r.photographer} / Pexels`.slice(0,120)}
          where id = ${s.cook_id}`}h(e,"avatars")}catch(l){g(e,"avatar_errors",String(l))}}}var Ee="AI-generated photo";async function Pe(e,t){await e.sql`
    update public.published_recipes set photo_path = null, photo_credit = null, photo_source = null,
      photo_source_id = null, photo_width = null, photo_height = null
    where id = ${t}`}async function Se(e){let{sql:t,cfg:i}=e,o=i.per_tick.recheck??10,n=await t`
    select id, draft, photo, published_id from seed.dishes
    where photo ? 'id' and not (photo ? 'rechecked') and stage in ('photographed', 'published')
    order by updated_at limit ${o}`;await v(n,4,async s=>{if(f(e)<15e3||!e.aiAllowed)return;let l=String(s.photo.id),r={id:Number(l),width:0,height:0,url:"",photographer:"",photographer_url:"",alt:String(s.photo.alt??""),src:{original:"",tiny:"",medium:`https://images.pexels.com/photos/${l}/pexels-photo-${l}.jpeg?auto=compress&cs=tinysrgb&h=350`}};try{if(await N(e,s.draft,[r]))await t`update seed.dishes set photo = photo || '{"rechecked": true}'::jsonb where id = ${s.id}`,h(e,"recheck_kept");else{let p={none:!0,want_ai:!0,rejected:{id:l,alt:s.photo.alt??null}};await t`update seed.dishes set photo = ${t.json(m(p))}, updated_at = now() where id = ${s.id}`,s.published_id&&await Pe(e,s.published_id),h(e,"recheck_removed")}}catch(a){if(await w(e,a))return;/download the file/i.test(String(a))?(await t`update seed.dishes set photo = ${t.json(m({none:!0,want_ai:!0,rejected:{id:l}}))} where id = ${s.id}`,s.published_id&&await Pe(e,s.published_id),h(e,"recheck_removed")):g(e,"recheck_errors",String(a))}})}async function Te(e){let{sql:t}=e,i=await t`
    select id, photo, published_id from seed.dishes
    where photo ? 'ai_url' and not (photo ? 'path') limit 20`;for(let o of i){if(f(e)<1e4)return;try{let n=String(o.photo.ai_url),s=n.split("?")[0].match(/\.(png|webp|jpe?g)$/i)?.[1]?.toLowerCase().replace("jpeg","jpg")??"jpg",{path:l}=await A("recipe-photos",`house/${o.id}-ai.${s}`,n),r={ai:!0,path:l,credit:Ee,width:o.photo.width??null,height:o.photo.height??null,rechecked:!0};await t`update seed.dishes set photo = ${t.json(m(r))}, updated_at = now() where id = ${o.id}`,o.published_id&&await t`
          update public.published_recipes set photo_path = ${l}, photo_credit = ${Ee}, photo_source = 'ai',
            photo_source_id = null, photo_width = ${r.width}, photo_height = ${r.height}
          where id = ${o.published_id}`,h(e,"ai_photos")}catch(n){g(e,"ai_photo_errors",String(n))}}}var et=11e4,Ie={avatars:xe,verify:P,menus:fe,write:ye,check:_e,photo:ve,recheck:Se,aiphotos:Te,publish:ue,follows:he,diets:ge},tt=new Set(["verify","menus","write","check","photo","recheck"]);Deno.serve(async e=>{if(e.method!=="POST")return new Response("method not allowed",{status:405});let t=Date.now(),i=U(),o=!1;try{if(!await Y(i,e.headers.get("x-seed-secret")))return new Response("unauthorised",{status:401});let n=await e.json().catch(()=>({}));if(o=await K(i),!o)return Response.json({skipped:"another tick is running"});let s=await F(i),l=await C(i,"ANTHROPIC_API_KEY"),r=await C(i,"PEXELS_API_KEY"),a=await G(i),p=s.ai_blocked_until?Date.parse(s.ai_blocked_until):0,c=await B(i)?s.first_run_cap_usd:s.monthly_cap_usd,u={sql:i,cfg:s,anthropicKey:l,pexelsKey:r,deadline:t+et,aiAllowed:!s.paused&&a<c&&!!l&&p<Date.now(),log:{spent_usd:Math.round(a*100)/100,cap_usd:c}};s.paused&&(u.log.paused=!0),l||(u.log.missing="ANTHROPIC_API_KEY"),a>=c&&(u.log.over_cap=!0),p>=Date.now()&&(u.log.out_of_credit_until=s.ai_blocked_until);let d=n.stages?.length?n.stages:Object.keys(Ie);for(let $ of d){let D=Ie[$];if(!(!D||f(u)<15e3)&&!(tt.has($)&&!u.aiAllowed)&&!s.paused)try{await D(u)}catch(O){if(await w(u,O))continue;u.log[`${$}_crashed`]=String(O).slice(0,300)}}let b=Date.now()-t;return await i`insert into seed.runs (ms, summary) values (${b}, ${i.json(m(u.log))})`,await i`delete from seed.runs where at < now() - interval '14 days'`,Response.json({ms:b,...u.log})}catch(n){return Response.json({error:String(n)},{status:500})}finally{o&&await H(i).catch(()=>{}),await i.end({timeout:2}).catch(()=>{})}});
