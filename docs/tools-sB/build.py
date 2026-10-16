import sys,json,re
# usage: build.py in.txt out.json
txt=open(sys.argv[1]).read()
recs=[]
for blk in re.split(r'^=== ',txt,flags=re.M)[1:]:
    L=[l.rstrip() for l in blk.strip().split('\n') if l.strip()]
    t,cu,me,df,pr,ck,sv,op=[x.strip() for x in L[0].split('|')]
    r=dict(id=re.sub(r'[^a-z0-9]+','-',t.lower()).strip('-'),title=t,summary=L[1],cuisine=cu,mealTypes=me.split(','),difficulty=df,prepMinutes=int(pr),cookMinutes=int(ck),servings=int(sv),onePot=op=='1',diets=[])
    ing=[];st=[];no=[]
    for l in L[2:]:
        if l.startswith('- '):ing.append(l[2:])
        elif l.startswith('# '):st.append(l[2:])
        elif l.startswith('! '):no.append(l[2:])
        elif l.startswith('N: '):
            p,c,f,fi,na=[int(x) for x in l[3:].split()]
            nu=dict(kcal=round(4*p+4*c+9*f+2*fi),proteinG=p,carbsG=c,fatG=f,fibreG=fi,sodiumMg=na)
    r['ingredients']=[{'items':ing}];r['steps']=st
    if no:r['notes']=no
    r['nutrition']=nu
    recs.append(r)
json.dump({'about':"House recipes, batch 04 (slice B): written by Claude in a Max-plan session, original, ai-draft. Nutrition is a per-serve estimate kept as data only.",'recipes':recs},open(sys.argv[2],'w'),indent=2,ensure_ascii=False)
print(len(recs))
