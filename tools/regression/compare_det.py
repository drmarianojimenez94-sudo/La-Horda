import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
bad=0
for k in sorted(set(a)|set(b)):
    if k not in a or k not in b: print('MISSING',k, k in a, k in b); bad+=1; continue
    x,y=a[k],b[k]
    if k=='logic':
        diffs=[kk for kk in set(x)|set(y) if kk!='errors' and x.get(kk)!=y.get(kk)]
        ea=[e for e in x.get('errors',[]) if 'fonts.googleapis' not in e]; eb=[e for e in y.get('errors',[]) if 'fonts.googleapis' not in e]
        print(('OK  ' if not diffs and ea==eb else 'DIFF'), k, 'fields differing:', diffs, 'errs', len(ea), len(eb))
        bad += bool(diffs or ea!=eb); continue
    if 'crash' in x or 'crash' in y: print('CRASH',k,x.get('crash'),y.get('crash')); bad+=1; continue
    first=None
    for (fa,da),(fb,db) in zip(x['digests'],y['digests']):
        if fa!=fb or da!=db:
            first=(fa,{kk:(da.get(kk),db.get(kk)) for kk in da if da.get(kk)!=db.get(kk)}); break
    hd=[(ha[0],ha[1],hb[1]) for ha,hb in zip(x['hashes'],y['hashes']) if ha!=hb]
    ev = x['events']==y['events']
    ea=[e for e in x['errors'] if 'fonts.googleapis' not in e]; eb=[e for e in y['errors'] if 'fonts.googleapis' not in e]
    same = first is None and not hd and ev and len(x['digests'])==len(y['digests']) and len(x['hashes'])==len(y['hashes']) and ea==eb and x['finalFrame']==y['finalFrame']
    if not same: bad+=1
    print(('OK  ' if same else 'DIFF'), k.ljust(34), 'digests',len(x['digests']),'hashes',len(x['hashes']), '' if same else f'firstDigestDiff={str(first)[:300]} hashDiffs={len(hd)} {hd[:2]} events={ev} errs={ea[:2]}|{eb[:2]}')
print('TOTAL DIFFS', bad)
