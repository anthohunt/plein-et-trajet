import re,sys
src,dst=sys.argv[1],sys.argv[2]
L=open(src,encoding='utf-8').read().splitlines()
out=[];cur=None
def row(n,txt):
    m=re.search(r'(.*?)\s*—\s*capture\s*`([^`]+)`',txt)
    body,f=(m.group(1),m.group(2)) if m else (txt,'')
    a,e=body,''
    if 'constater' in body:
        a,e=body.split('constater',1); e=e.lstrip(' :')
    a=a.replace('|','/').strip(' ;'); e=e.replace('|','/').strip()
    return f'| {n} | {a} | {e or "—"} | `{f}` |'
for line in L:
    h=re.match(r'^##\s+(US-[\w.-]+)\s+—\s+(.+)',line)
    if h:
        cur=h.group(1); out+=['',f'## {cur}: {h.group(2)}','']
        edge='.E' in cur
        out+=[f'### Edge Case E1: {h.group(2)}' if edge else '### Happy Path','','| Step | Action | Expected | Screenshot |','|---|---|---|---|']
        continue
    s=re.match(r'^(\d+)\.\s+(.*)',line)
    if s and cur: out.append(row(s.group(1),s.group(2))); continue
    x=re.match(r'^-\s+\*\*(US-[\w-]+)\s+—\s+(.+?)\*\*\s*:\s*(.*)',line)
    if x:
        out+=['',f'## {x.group(1)}: {x.group(2)}','','### Happy Path','','| Step | Action | Expected | Screenshot |','|---|---|---|---|']
        for i,part in enumerate(re.split(r'\s;\s(?=\d\.)',x.group(3)),1):
            out.append(row(i,re.sub(r'^\d\.\s*','',part)))
        cur=None
open(dst,'w',encoding='utf-8').write('# M1 Plan — Les prix autour de moi\n'+'\n'.join(out)+'\n')
