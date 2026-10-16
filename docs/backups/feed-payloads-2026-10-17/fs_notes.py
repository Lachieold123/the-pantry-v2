"""Fill empty 'Food safety: ' notes in the feed payloads. Usage: python3 fs_notes.py [--dry]"""
import json, re, sys
D = __file__.rsplit('/', 1)[0]
def empty(n): return n.strip().rstrip(':').strip() == 'Food safety' and n.strip().endswith(':')
def has(t, *w): return any(re.search(r'\b' + x, t) for x in w)
def note(rc):
    items = ' | '.join(l['item'].lower() for g in rc['ingredientGroups'] for l in g['items'])
    steps = ' '.join(s['text'].lower() for s in rc['steps'])
    title = rc['title'].lower()
    t = items + ' ' + title
    out = []
    mince = has(t, 'mince', 'minced (beef|pork|lamb)', 'sausage', 'meatball', 'burger', 'patty', 'patties', 'chorizo', 'kofta', 'kebab', 'ground (beef|pork|lamb)', 'frankfurt', 'nduja', 'andouillette', '(pork|beef|veal|lamb|calf|chicken) liver')
    pitems = ' | '.join(x for x in items.split(' | ') if not re.search(r'stock|broth|bouillon|powder|fat\b|schmaltz|seasoning', x))
    poultry = has(pitems, 'chicken', 'duck', 'turkey', 'quail', 'poussin', 'goose', 'poulet', 'pollo', 'hen\b')
    redmeat = has(items, 'beef', 'lamb', 'pork', 'veal', 'steak', 'brisket', 'mutton', 'goat', 'ribs?', 'oxtail', 'venison', 'rabbit', 'bacon', 'ham\\b', 'pancetta', 'guanciale', 'speck')
    fitems = re.sub(r'fish sauce|fish stock|fish stock cube|fishcake', '', items)
    fish = has(fitems, 'catfish', 'salmon', 'tuna', 'snapper', 'barramundi', 'cod', 'trout', 'sardine', 'mackerel', 'fish', 'haddock', 'whiting', 'flathead', 'bream', 'kingfish', 'swordfish', 'monkfish', 'hake', 'halibut', 'anchov', 'eel', 'herring', 'pla\\b', 'torsk')
    shell = has(items, 'prawn', 'shrimp', 'mussel', 'clam', 'vongole', 'scallop', 'oyster', 'crab', 'lobster', 'squid', 'calamari', 'octopus', 'cockle', 'langoustine', 'yabby', 'pipi')
    egg = has(items, 'eggs?\\b', 'egg yolk', 'egg white')
    raw = has(title + ' ' + items, 'raw fish', 'ceviche', 'tartare', 'sashimi', 'carpaccio', 'poke bowl', 'tiramisu', 'mousse', 'mayonnaise', 'aioli', 'hollandaise', 'zabaglione', 'meringue')
    slow = has(steps, 'braise', 'simmer for [2-9]', 'slow', 'stew', 'hours')
    if poultry:
        out.append('Cook chicken (and other poultry) until the thickest part reaches 75°C and the juices run clear, with no pink meat near the bone.' if 'chicken' in items else 'Cook poultry until the thickest part reaches 75°C and the juices run clear, with no pink meat near the bone.')
    if mince:
        out.append('Cook mince, sausages, meatballs and liver right through to 75°C, with no pink in the centre.')
    elif redmeat and not poultry:
        if has(items, 'bacon', 'pancetta', 'guanciale', 'speck') and not has(items, 'beef', 'lamb', 'pork', 'veal', 'steak', 'ribs?', 'brisket', 'oxtail'):
            out.append('Cook bacon and cured pork until the fat is rendered and the meat is hot right through.')
        elif slow and has(steps, 'tender'):
            out.append('Slow-cooked meat is safe once it is tender and the centre has reached at least 75°C.')
        else:
            out.append('Cook whole cuts of beef, lamb and pork to at least 63°C in the thickest part, then rest for 3 minutes; cook pork and any rolled or stuffed cuts until the juices run clear.')
    if fish and not raw:
        out.append('Cook fish until it turns opaque and flakes easily, about 63°C in the thickest part.')
    if shell:
        if has(items, 'mussel', 'clam', 'vongole', 'cockle', 'pipi', 'oyster', 'scallop'):
            out.append('Cook mussels, clams and pipis only if they are alive and tightly closed (or close when tapped), and discard any that stay shut after cooking.' + (' Cook prawns until pink and opaque.' if has(items, 'prawn', 'shrimp') else ''))
        elif has(items, 'prawn', 'shrimp', 'yabby', 'lobster', 'crab', 'langoustine'):
            out.append('Cook prawns and other crustaceans until the shells turn pink and the flesh is opaque and firm.')
        else:
            out.append('Cook squid and octopus until opaque and firm, and keep seafood chilled until you cook it.')
    if raw and (fish or shell or egg):
        out.append('Use very fresh, properly chilled ingredients for anything served raw or lightly cured, keep it refrigerated, and serve it promptly; pregnant women, older people, young children and anyone with a weakened immune system should avoid raw egg and raw seafood.' if egg else 'Use very fresh seafood from a trusted supplier for anything served raw or lightly cured, keep it refrigerated and serve it promptly; pregnant women, older people and young children should avoid raw seafood.')
    elif egg and not (poultry or mince or redmeat or fish or shell):
        if has(title + steps, 'tiramisu', 'mousse', 'mayonnaise', 'aioli', 'hollandaise', 'zabaglione', 'meringue', 'runny', 'soft-boiled'):
            out.append('Use fresh, clean, uncracked eggs and keep them refrigerated; cook until the whites are set and, for pregnant women, older people, young children and anyone unwell, until the yolks are firm too.')
        else:
            out.append('Use fresh, uncracked eggs and cook them until the whites are completely set and the yolks are no longer runny for anyone vulnerable.')
    if has(items, 'kidney bean') and has(items, 'dried'):
        out.append('Soak dried kidney beans, then boil them hard for at least 10 minutes before simmering.')
    if not out:
        if has(items, 'rice', 'pasta', 'noodle', 'lentil', 'chickpea', 'quinoa', 'couscous'):
            out.append('This recipe has no raw meat or eggs, but cooked rice, pasta and legumes spoil quickly: cool leftovers fast, refrigerate within 1 hour and eat within 2 days, and reheat until steaming hot.')
        else:
            out.append('This recipe has no raw meat, fish or eggs; wash fresh produce well, refrigerate leftovers within 2 hours and eat them within 3 days.')
    return 'Food safety: ' + ' '.join(out)
def fix(rc):
    c = 0
    for k, n in enumerate(rc.get('notes') or []):
        if empty(n):
            rc['notes'][k] = note(rc); c += 1
    return c
if __name__ == '__main__':
    P = lambda f: f'{D}/{f}'
    u = json.load(open(P('feed-updates.json'))); c = json.load(open(P('feed-compact-updates.json'))); i = json.load(open(P('feed-inserts.json')))
    byid = {r['id']: r['recipe'] for r in u}
    shown = {r['recipe']['title'] for r in u + i if any(empty(n) for n in r['recipe'].get('notes') or [])}
    nu = sum(fix(r['recipe']) for r in u); ni = sum(fix(r['recipe']) for r in i)
    nc = 0
    for r in c:
        if any(empty(n) for n in r.get('notes', [])):
            r['notes'] = byid[r['id']]['notes']; nc += 1
    print('updates', nu, 'compact', nc, 'inserts', ni)
    if '--dry' not in sys.argv:
        for f, d in (('feed-updates.json', u), ('feed-compact-updates.json', c), ('feed-inserts.json', i)):
            json.dump(d, open(P(f), 'w'), ensure_ascii=False, separators=(',', ':'))
    if '--show' in sys.argv:
        for r in u + i:
            rc = r['recipe']
            if rc['title'] in shown:
                print(rc['title'], '=>', [n for n in rc['notes'] if n.startswith('Food safety')][-1][13:])
