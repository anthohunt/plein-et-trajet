import re,sys,json
W,R=sys.argv[1:]
L=open(f'{W}/tests/e2e/use-cases/m5-use-case.md',encoding='utf-8').read().splitlines()
out=[];cur=None;n=0
def row(k,txt):
    m=re.search(r'(.*?)\s*—\s*capture\s*`([^`]+)`',txt)
    body,f=(m.group(1),m.group(2)) if m else (txt,'')
    a,e=body,''
    if 'constater' in body:
        a,e=body.split('constater',1); e=e.lstrip(' :')
    a=re.sub(r'^(Partir de|Faire)\s*:\s*','',a).replace('|','/').strip(' ;'); e=e.replace('|','/').strip()
    return f'| {k} | {a} | {e or "—"} | `{f}` |'
def head(i,t):
    return ['',f'## {i}: {t}','',f'### Edge Case E1: {t}' if '.E' in i else '### Happy Path','','| Step | Action | Expected | Screenshot |','|---|---|---|---|']
for line in L:
    h=re.match(r'^##\s+(V-[\w.-]+)\s+—\s+(.+)',line)
    if h: cur=h.group(1); out+=head(cur,h.group(2)); continue
    if line.startswith('## Contrôle négatif'): cur='V1-retraits'; out+=head(cur,'Ce qui sort de la V1 (contrôle négatif)'); continue
    if line.startswith('## '): cur=None; continue
    s=re.match(r'^(\d+)\.\s+(.*)',line)
    if s and cur and 'capture' in line: out.append(row(s.group(1),s.group(2))); n+=1
open(f'{R}/tests/e2e/use-cases/m5-use-case.md','w',encoding='utf-8').write('# M5 Plan — V1 recentrée\n'+'\n'.join(out)+'\n')
st=json.load(open(f'{W}/docs/pipeline/stories.json'))
sp=['# Spec V1 (extraite de stories.json)','']
for e in st:
    if str(e.get('id','')).startswith('V-'):
        sp+=[f"### {e['id']} — {e['title']}",'',f"**As a** {e.get('story','')}",'','#### Acceptance Criteria']
        sp+=[f"- **AC-{i}:** {c}" for i,c in enumerate(e.get('acceptance_criteria',[]),1)]+['']
open(f'{R}/docs/pipeline/spec.md','w',encoding='utf-8').write('\n'.join(sp))
print('étapes',n)
