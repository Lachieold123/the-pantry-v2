import sys,json,re
src,out=sys.argv[1],sys.argv[2]
rs=[]
for blk in open(src).read().split('\n\n'):
    L=[l for l in blk.strip().split('\n') if l.strip()]
    if not L: continue
    t=L[0][2:].strip()
    c,m,d,pr,ck,sv,op=[x.strip() for x in L[1].split('|')]
    r=dict(id=re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',t.lower())).strip('-'),title=t,summary=L[2].strip(),cuisine=c,
      mealTypes=m.split(','),difficulty=d,prepMinutes=int(pr),cookMinutes=int(ck),servings=int(sv),onePot=op=='1',diets=[],
      ingredients=[{"items":[x.strip() for x in L[3][2:].split(';') if x.strip()]}],
      steps=[x.strip() for x in L[4][2:].split('|')],notes=[x.strip() for x in L[5][2:].split('|')])
    p,cb,f,fi,na=[int(x) for x in L[6][2:].split()]
    r['nutrition']=dict(kcal=4*p+4*cb+9*f+2*fi,proteinG=p,carbsG=cb,fatG=f,fibreG=fi,sodiumMg=na)
    rs.append(r)
json.dump(dict(about="House recipes, batch 04 (slice C): written by Claude in a Max-plan session, original, ai-draft. Nutrition is a per-serve estimate kept as data only.",recipes=rs),open(out,'w'),indent=2,ensure_ascii=False)
print(len(rs))
