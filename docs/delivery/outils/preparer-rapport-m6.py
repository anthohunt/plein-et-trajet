"""Prépare le dossier de travail du rapport du jalon 6 pour generate-milestone-report-patche-v.cjs.
Usage : python3 preparer-rapport-m6.py <dépôt> <dossier-de-travail>
Écrit <R>/tests/e2e/use-cases/m6-use-case.md (format tableau), <R>/docs/pipeline/spec.md (critères de stories.json)
et relie <R>/tests/e2e/delivery et m6-summary.md au dépôt. Les captures de rejeu (liste « Captures de rejeu ») deviennent
une section « Rejeu Android » par histoire rejouée ; une capture déjà dans un parcours principal n'est pas reprise."""
import re,sys,json,os
W,R=sys.argv[1:]
L=open(f'{W}/tests/e2e/use-cases/m6-use-case.md',encoding='utf-8').read().splitlines()
st=json.load(open(f'{W}/docs/pipeline/stories.json',encoding='utf-8'))
titre={e['id']:e['title'] for e in st if str(e.get('id','')).startswith('V-')}
def cell(t): return t.replace('|','/').strip(' ;')
def row(k,txt):
    m=re.search(r'(.*?)\s*—\s*capture\s*`([^`]+)`',txt)
    body,f=(m.group(1),m.group(2)) if m else (txt,'')
    a,e=body,''
    if 'constater' in body:
        a,e=body.split('constater',1); e=e.lstrip(' :')
    a=re.sub(r'^(Partir de|Faire)\s*:\s*','',a)
    return f'| {k} | {cell(a)} | {cell(e) or "—"} | `{f}` |', f
TABLE=['','| Step | Action | Expected | Screenshot |','|---|---|---|---|']
# 1. parcours principaux (V-3.2, V-3.3) et liste de rejeu
principal={};ordre=[];cur=None;rejeu=[];zone=None
for line in L:
    h=re.match(r'^##\s+(V-[\w.-]+)\s+—\s+(.+)',line)
    if h: cur=h.group(1);ordre.append(cur);principal[cur]=[];zone='p';continue
    if line.startswith('## Captures de rejeu'): zone='r';cur=None;continue
    if line.startswith('## '): zone=None;cur=None;continue
    s=re.match(r'^(\d+)\.\s+(.*)',line)
    if zone=='p' and s and 'capture' in line: principal[cur].append(row(s.group(1),s.group(2)))
    r=re.match(r'^-\s+`([^`]+\.png)`\s+—\s+(.*)',line)
    if zone=='r' and r: rejeu.append((r.group(1),r.group(2)))
deja={f for v in principal.values() for _,f in v}
par={}
for f,d in rejeu:
    if f in deja: continue
    sid=re.match(r'^(V-[\d.]+|V-\d+\.E\d+)-',f).group(1)
    par.setdefault(sid,[]).append((f,d))
def lignes_rejeu(items):
    out=[]
    for i,(f,d) in enumerate(items,1):
        a,e=(d.split(' : ',1)+[''])[:2] if ' : ' in d else ('Rejeu Android',d)
        out.append(f'| {i} | {cell("Rejeu Android (émulateur, APK de release) : "+a)} | {cell(e or d)} | `{f}` |')
    return out
out=['# M6 Plan — Appli Android']
n=0
for sid in ordre:
    out+=['',f'## {sid}: {titre.get(sid,sid)}','','### Happy Path']+TABLE+[l for l,_ in principal[sid]]; n+=len(principal[sid])
    if sid in par:
        out+=['','### Edge Case E1: Rejeu Android']+TABLE+lignes_rejeu(par[sid]); n+=len(par[sid])
cle=lambda s:[int(x) if x.isdigit() else x for x in re.split(r'[.-]',s[2:])]
for sid in sorted((s for s in par if s not in ordre),key=lambda s:(s.split('.')[0],'E' in s,s)):
    out+=['',f'## {sid}: {titre.get(sid,sid)} (rejeu Android)','','### Edge Case E1: Rejeu Android']+TABLE+lignes_rejeu(par[sid]); n+=len(par[sid])
os.makedirs(f'{R}/tests/e2e/use-cases',exist_ok=True); os.makedirs(f'{R}/docs/pipeline',exist_ok=True); os.makedirs(f'{R}/docs/delivery',exist_ok=True)
open(f'{R}/tests/e2e/use-cases/m6-use-case.md','w',encoding='utf-8').write('\n'.join(out)+'\n')
for src,dst in [(f'{W}/tests/e2e/delivery',f'{R}/tests/e2e/delivery'),(f'{W}/tests/e2e/use-cases/m6-summary.md',f'{R}/tests/e2e/use-cases/m6-summary.md')]:
    if not os.path.lexists(dst): os.symlink(src,dst)
sp=['# Spec V1 (critères extraits de docs/pipeline/stories.json)','']
for e in st:
    if str(e.get('id','')).startswith('V-'):
        sp+=[f"### {e['id']} — {e['title']}",'',f"**As a** {e.get('story','')}",'','#### Acceptance Criteria']
        sp+=[f"- **AC-{i}:** {c}" for i,c in enumerate(e.get('acceptance_criteria',[]),1)]+['']
open(f'{R}/docs/pipeline/spec.md','w',encoding='utf-8').write('\n'.join(sp))
print('histoires',len(ordre)+len([s for s in par if s not in ordre]),'étapes',n,'rejeu ignorées (déjà au parcours)',sorted(f for f,_ in rejeu if f in deja))
