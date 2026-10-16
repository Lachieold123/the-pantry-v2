import sys,json
f,n=sys.argv[1:3]
est={}
for l in open(n):
    p=l.split(); est[p[1]]=float(p[2])
d=json.load(open(f))
for r in d['recipes']:
    e=est.get(r['id'])
    nu=r['nutrition']
    if not e or e<=50: 
        if nu['kcal']<45: 
            s=45/ max(nu['kcal'],1)
        else: continue
    else:
        ratio=nu['kcal']/e
        if 0.6<=ratio<=1.7 and nu['kcal']>=45: continue
        s=(e*0.9)/nu['kcal']
        if e*0.9<45: s=45/nu['kcal']
    for k in ('proteinG','carbsG','fatG','fibreG'): nu[k]=round(nu[k]*s)
    nu['kcal']=4*nu['proteinG']+4*nu['carbsG']+9*nu['fatG']+2*nu['fibreG']
json.dump(d,open(f,'w'),indent=2,ensure_ascii=False)
