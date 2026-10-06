#!/usr/bin/env python3
"""Static bilingual parity, SEO, link and translation-maintenance audit (stdlib only)."""
import argparse, collections, hashlib, html, importlib.util, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote, urljoin

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync', ROOT / 'scripts/sync-locales.py')
sync = importlib.util.module_from_spec(spec); spec.loader.exec_module(sync)
BASE = sync.BASE
MANIFEST = ROOT / 'scripts/i18n/source-hashes.json'

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path=path; self.raw=(ROOT/path).read_text(); self.tags=[]; self.ids=[]; self.text=[]; self.stack=[]; self.main=[]; self.hidden=0
        self.feed(self.raw)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append((tag,a))
        if a.get('id'): self.ids.append(a['id'])
        if tag in ['script','style']: self.hidden+=1
        if tag=='main': self.stack.append(tag)
        if self.stack: self.main.append(tag)
    def handle_endtag(self, tag):
        if tag in ['script','style']: self.hidden=max(0,self.hidden-1)
        if tag=='main': self.stack=[]
    def handle_data(self, data):
        if not self.hidden: self.text.append(data)
    def attrs(self, tag, **match):
        return [a for t,a in self.tags if t==tag and all(a.get(k)==v for k,v in match.items())]

errors=[]
def check(condition, message):
    if not condition: errors.append(message)

def fingerprint(page):
    # Whole source file intentionally includes metadata, scripts and original media paths.
    return hashlib.sha256(page.raw.encode()).hexdigest()

args=argparse.ArgumentParser();args.add_argument('--record-reviewed-sources',action='store_true',help='Only after translations have been manually reviewed against current KO source');opts=args.parse_args()
pages={}
for path in sync.PAGES:
    for name in [path,'en/'+path]:
        check((ROOT/name).exists(), 'Missing counterpart: '+name)
        if (ROOT/name).exists(): pages[name]=Page(name)
for path in sync.PAGES:
    if path not in pages or 'en/'+path not in pages: continue
    ko,en=pages[path],pages['en/'+path]
    check(collections.Counter(ko.main)==collections.Counter(en.main),path+': main element counts differ '+str(collections.Counter(ko.main)-collections.Counter(en.main)))
    check(set(ko.ids)==set(en.ids),path+': paired IDs differ '+str(set(ko.ids)^set(en.ids)))
    for lang,page in [('ko',ko),('en',en)]:
        name=page.path; url=BASE+sync.route(name)
        check(page.attrs('html',lang=lang),name+': wrong html lang')
        check(len(page.ids)==len(set(page.ids)),name+': duplicate IDs')
        if path=='blog/index.html': continue
        check(page.attrs('link',rel='canonical',href=url),name+': wrong canonical')
        for code,href in [('ko',BASE+sync.route(path)+('?lang=ko' if path=='index.html' else '')),('en',BASE+sync.route('en/'+path)),('x-default',BASE+'/' if path=='index.html' else BASE+sync.route('en/'+path))]:
            check(page.attrs('link',rel='alternate',hreflang=code,href=href),name+': wrong '+code+' alternate')
        check(len([a for t,a in page.tags if 'data-language' in a])==2,name+': expected two language links')
        check(bool(re.search(r'<title>.+?</title>',page.raw,re.S)),name+': title missing')
        if path!='404.html':
            check(page.attrs('meta',name='description'),name+': description missing')
            check(page.attrs('meta',property='og:url',content=url),name+': OG URL missing/wrong')
        if '<header class="top">' in page.raw:
            for kind,tag,cls in [('header','header','top'),('footer','footer','site')]:
                expected=(ROOT/f'scripts/i18n/{kind}.{lang}.html').read_text().rstrip().replace('{{LANGUAGE_LINKS}}',sync.language_links(path,lang))
                actual=re.search(f'<{tag} class="{cls}">.*?</{tag}>',page.raw,re.S).group()
                check(actual==expected,name+': shared '+kind+' drift')
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',page.raw,re.S):
            try: json.loads(block)
            except ValueError: check(False,name+': invalid JSON-LD')
        if lang=='en':
            residue=re.findall(r'[가-힣]+',' '.join(page.text))
            residue=[x for x in residue if x not in ['한국어','알렉스소프트']]
            check(not residue,name+': Korean visible text '+str(residue[:10]))
            for a in page.attrs('a'):
                href=a.get('href',''); u=urlsplit(urljoin(url,href))
                if u.netloc=='alexsoft.co.kr' and u.path and not a.get('data-language') and a.get('hreflang')!='ko':
                    target=u.path.lstrip('/')+('index.html' if u.path.endswith('/') else '')
                    if target in sync.PAGES: check(False,name+': internal link leaves English '+href)
        for t,a in page.tags:
            attr='href' if t in ['a','link'] else 'src' if t in ['img','script','video','source'] else None
            if not attr or not a.get(attr): continue
            href=a[attr]; u=urlsplit(urljoin(url,href))
            if u.scheme not in ['http','https'] or u.netloc!='alexsoft.co.kr': continue
            target=unquote(u.path).lstrip('/')
            if not target or target.endswith('/'): target+='index.html'
            check((ROOT/target).exists(),name+': missing local target '+href)
            if t=='a' and u.fragment and (ROOT/target).exists() and target.endswith('.html'):
                ids=pages[target].ids if target in pages else re.findall(r'\bid=["\']([^"\']+)',(ROOT/target).read_text())
                check(unquote(u.fragment) in ids,name+': missing anchor '+href)

# Form contracts and FAQ text must remain exact in both languages.
for name in ['diagnosis','healthcare','brand-website']:
    ko,en=pages.get(name+'/index.html'),pages.get('en/'+name+'/index.html')
    if not ko or not en: continue
    def contract(p):
        return [(t,{k:('' if v is None else v) for k,v in a.items() if k in ['name','value','action','method','target','required','data-inquiry-type']}) for t,a in p.tags if t in ['form','input','textarea','select','option'] or 'data-inquiry-type' in a]
    check(contract(ko)==contract(en),name+': translated form backend contract changed')
for prefix in ['','en/']:
    for name,count in [('diagnosis',8),('healthcare',5),('brand-website',5),('e-invoicing',2)]:
        p=pages.get(prefix+name+'/index.html')
        if not p: continue
        normal=lambda s: re.sub(r'\s+',' ',html.unescape(re.sub(r'<[^>]+>','',s))).strip()
        vis=[(normal(q),normal(a)) for q,a in re.findall(r'<details(?: open(?:="")?)?>\s*<summary>(.*?)<span[^>]*>\+</span></summary>\s*<p>(.*?)</p>\s*</details>',p.raw,re.S)]
        ld=[]
        for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>',p.raw,re.S):
            obj=json.loads(b)
            for node in obj.get('@graph',[obj]):
                if node.get('@type')=='FAQPage': ld=[(normal(q['name']),normal(q['acceptedAnswer']['text'])) for q in node['mainEntity']]
        check(vis==ld and len(vis)==count,p.path+': FAQ schema/content mismatch')
for name in ['index.html','en/index.html']:
    p=pages[name]; badge=[a for a in p.attrs('img') if 'certifications/' in a.get('src','')]
    check(len(badge)==1 and badge[0].get('width')==badge[0].get('height')=='600' and bool(badge[0].get('alt')),name+': badge ratio or alt missing')
    check('https://www.credly.com/badges/d0c993e5-ae64-4601-b926-ca54c0c3af7d/public_url' in p.raw,name+': credential verification URL missing')
    check('credential-owner' not in p.raw and '대표 이용민 보유 자격' not in p.raw,name+': removed credential owner line returned')
current={p:fingerprint(pages[p]) for p in sync.PAGES if p in pages}
if opts.record_reviewed_sources:
    if not errors: MANIFEST.write_text(json.dumps(current,ensure_ascii=False,indent=2)+'\n')
elif MANIFEST.exists():
    saved=json.loads(MANIFEST.read_text())
    for p,h in current.items():check(saved.get(p)==h,p+': Korean source changed; review English then record reviewed sources')
else: check(False,'Translation review manifest missing')
for e in errors:print('FAIL',e)
print(f'{len(pages)} pages / {len(sync.PAGES)} pairs: '+('PASS' if not errors else f'{len(errors)} failures'))
sys.exit(bool(errors))
