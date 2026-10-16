import re,sys
f=sys.argv[1];L=open(f).read().split('\n');o=[]
for l in L:
    if l.startswith('! Food safety:') and '°C' not in l:
        t='63°C for a steak' if 'steak' in l else '75°C'
        l=l.rstrip('.')+('; check the thickest part reaches '+t+'.')
    if l.startswith('- ') and 'whole clove' in l: l=l.replace('whole clove','ground cloves')
    o.append(l)
t='\n'.join(o)
# shorten summaries >120
out=[];prev=''
for l in t.split('\n'):
    if prev.startswith('=== ') and len(l)>120:
        l=l[:117].rsplit(' ',1)[0].rstrip(',;:')+'.'
    out.append(l);prev=l
open(f,'w').write('\n'.join(out))
