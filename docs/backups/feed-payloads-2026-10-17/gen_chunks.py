"""Rebuild SQL chunks from the payload JSON. Updates: u01..u17 (30 rows), inserts: i01..i11 (12 rows),
x01 = notes-only fix for the 90 rows already applied in u01..u03."""
import json, re
D = __file__.rsplit('/', 1)[0]
J = lambda f: json.load(open(f'{D}/{f}'))
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
old_u = open(f'{D}/chunks/u04.sql').read(); old_i = open(f'{D}/chunks/i01.sql').read()
u_tail = old_u[old_u.index(']$q$::jsonb)') + len(']$q$'):]
i_tail = old_i[old_i.index(']$q$::jsonb)') + len(']$q$'):]
assert i_tail.startswith('::jsonb)')
comp = J('feed-compact-updates.json'); ins = J('feed-inserts.json')
def w(name, sql):
    assert sql.count('$q$') == 2
    open(f'{D}/chunks/{name}.sql', 'w').write(sql)
for k in range(0, len(comp), 30):
    w(f'u{k // 30 + 1:02d}', 'with d as (select value r from jsonb_array_elements($q$' + dump(comp[k:k + 30]) + '$q$' + u_tail)
for k in range(0, len(ins), 12):
    w(f'i{k // 12 + 1:02d}', 'with d as (select value r from jsonb_array_elements($q$' + dump(ins[k:k + 12]) + '$q$' + i_tail)
fs = [{'id': r['id'], 'fs': n} for r in comp[:90] for n in r.get('notes', []) if n.startswith('Food safety: ') and len(n) > 14]
w('x01', 'with d as (select value r from jsonb_array_elements($q$' + dump(fs) + '$q$::jsonb)), up as (update public.published_recipes p set recipe = jsonb_set(p.recipe, \'{notes}\', coalesce(p.recipe->\'notes\', \'[]\'::jsonb) || to_jsonb(d.r->>\'fs\')) from d where p.id=(d.r->>\'id\')::uuid and not exists (select 1 from jsonb_array_elements_text(coalesce(p.recipe->\'notes\', \'[]\'::jsonb)) e where e like \'Food safety:%\') returning p.id) select (select count(*) from d) expected, (select count(*) from up) updated;')
# Smaller chunks (15 rows, fit one tool output): s01.. = comp[90:] (remaining updates), t01.. = inserts
for n, k in enumerate(range(90, len(comp), 15), 1):
    w(f's{n:02d}', 'with d as (select value r from jsonb_array_elements($q$' + dump(comp[k:k + 15]) + '$q$' + u_tail)
