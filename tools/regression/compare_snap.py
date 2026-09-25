import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
allow=set(sys.argv[3].split(',')) if len(sys.argv)>3 and sys.argv[3] else set()
def first_diff(x,y,path=''):
    if type(x)!=type(y): return f'{path}: {str(x)[:120]} != {str(y)[:120]}'
    if isinstance(x,dict):
        if list(x.keys())!=list(y.keys()):
            ks=set(x)^set(y)
            return f'{path}: keys differ {sorted(ks)[:8]}' if ks else f'{path}: key ORDER differs'
        for k in x:
            d=first_diff(x[k],y[k],path+'.'+k)
            if d: return d
        return None
    if isinstance(x,list):
        if len(x)!=len(y): return f'{path}: len {len(x)} != {len(y)}'
        for i,(p,q) in enumerate(zip(x,y)):
            d=first_diff(p,q,f'{path}[{i}]')
            if d: return d
        return None
    return None if x==y else f'{path}: {str(x)[:160]} != {str(y)[:160]}'
bad=0
a['dom'].pop('styleSheets',None); b['dom'].pop('styleSheets',None)
for x in (a,b): x['img']={'broken':x['img']['broken'],'complete':x['img']['done']==x['img']['total']}
for sec in ['vendor','img','dom']:
    d=first_diff(a[sec],b[sec],sec)
    if d: print('DIFF',d); bad+=1
sa,sb=a['snap'],b['snap']
for k in sorted(set(sa)|set(sb)):
    if k not in sa or k not in sb:
        print(('ALLOWED ' if k in allow else 'DIFF ')+'missing', k, k in sa, k in sb); bad+= k not in allow; continue
    d=first_diff(sa[k],sb[k],k)
    if d:
        print(('ALLOWED ' if k in allow else 'DIFF ')+d); bad+= k not in allow
ea=[e for e in a['errs'] if 'fonts.googleapis' not in e]; eb=[e for e in b['errs'] if 'fonts.googleapis' not in e]
if ea!=eb or a['pageErrors']!=b['pageErrors']: print('DIFF errors',ea,eb,a['pageErrors'],b['pageErrors']); bad+=1
print('SNAPSHOT DIFFS (not allowed):',bad, '| bindings', len(sa), len(sb))
