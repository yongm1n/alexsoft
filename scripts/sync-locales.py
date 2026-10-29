#!/usr/bin/env python3
"""Synchronize bilingual chrome/metadata, never translate or replace page bodies."""
import html, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://alexsoft.co.kr'
VERSION = 'bilingual-1'
PAGES = ['index.html', 'diagnosis/index.html', 'healthcare/index.html', 'brand-website/index.html',
         'e-invoicing/index.html', 'work/index.html', 'insights/index.html']
PAGES += sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'insights').glob('*/index.html'))
PAGES += ['insights/ai-business-website/slides.html', '404.html', 'blog/index.html']


def route(path):
    return '/' + path.removesuffix('index.html')


def language_links(path, lang):
    ko, en = route(path), route('en/' + path)
    if ko == '/': ko = '/?lang=ko'
    label = '언어 선택' if lang == 'ko' else 'Language'
    return ('<div class="language-switch" role="group" aria-label="' + label + '">' +
            ''.join('<a href="' + url + '" data-language="' + code + '" lang="' + code +
                    '" hreflang="' + code + '"' + (' aria-current="true"' if code == lang else '') +
                    '>' + text + '</a>' for code, url, text in [('ko', ko, '한국어'), ('en', en, 'English')]) + '</div>')


def structured_language(value, lang):
    if isinstance(value, list): return [structured_language(v, lang) for v in value]
    if not isinstance(value, dict):
        if lang == 'en' and value == BASE + '/#website': return BASE + '/en/#website'
        if value in [BASE + '/en/#organization', BASE + '/en/#founder']: return value.replace('/en/#', '/#')
        return value
    result = {k: structured_language(v, lang) for k, v in value.items()}
    types = value.get('@type', [])
    if isinstance(types, str): types = [types]
    if set(types) & {'WebPage', 'WebSite', 'Article', 'BlogPosting', 'CollectionPage', 'FAQPage', 'TechArticle', 'LearningResource'}:
        result['inLanguage'] = lang
    return result


def sync(path, lang):
    file = ROOT / (('en/' if lang == 'en' else '') + path)
    if not file.exists(): return  # A translation still being authored is not generated here.
    s = file.read_text()
    page_url = BASE + route(str(file.relative_to(ROOT)))
    ko = BASE + route(path)
    en = BASE + route('en/' + path)
    switch = language_links(path, lang)
    for kind, tag, cls in [('header', 'header', 'top'), ('footer', 'footer', 'site')]:
        template = (ROOT / f'scripts/i18n/{kind}.{lang}.html').read_text().rstrip().replace('{{LANGUAGE_LINKS}}', switch)
        s = re.sub(r'<' + tag + r' class="' + cls + r'">.*?</' + tag + '>', lambda _: template, s, flags=re.S)
    if path == 'blog/index.html':
        # This historical URL remains an external redirect, labelled in both languages.
        file.write_text(s); return
    s = re.sub(r'<link\b[^>]*\brel="(?:canonical|alternate)"[^>]*>\s*', '', s)
    ko_explicit = ko + '?lang=ko' if path == 'index.html' else ko
    meta = f'<link rel="canonical" href="{page_url}">\n'
    meta += ''.join(f'  <link rel="alternate" hreflang="{code}" href="{url}">\n'
                    for code, url in [('ko', ko_explicit), ('en', en), ('x-default', BASE + '/' if path == 'index.html' else en)])
    s = s.replace('</head>', '  ' + meta + '</head>')
    locale = 'en_US' if lang == 'en' else 'ko_KR'
    alt_locale = 'ko_KR' if lang == 'en' else 'en_US'
    s = re.sub(r'<meta\s+property="og:locale(?::alternate)?"[^>]*>\s*', '', s)
    s = s.replace('</head>', f'  <meta property="og:locale" content="{locale}">\n  <meta property="og:locale:alternate" content="{alt_locale}">\n</head>')
    s = re.sub(r'(<meta property="og:url" content=")[^"]+', lambda m: m[1] + page_url, s)
    s = re.sub(r'<script\s+src="/assets/ink.js[^\"]*"[^>]*></script>\s*', '', s)
    s = re.sub(r'<script\s+src="/assets/analytics.js[^\"]*"[^>]*></script>\s*', '', s)
    # Run before body parsing so general-home selection does not flash the wrong language.
    s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <script src="/assets/ink.js?v=' + VERSION + '"></script>\n  <script src="/assets/analytics.js?v=2" defer></script>', 1)
    s = re.sub(r'/assets/ink.css(?:\?v=[^\"]+)?', '/assets/ink.css?v=' + VERSION, s)
    s = re.sub(r'(<script type="application/ld\+json">)(.*?)(</script>)',
               lambda m: m[1] + '\n' + json.dumps(structured_language(json.loads(m[2]), lang), ensure_ascii=False, indent=2) + '\n' + m[3], s, flags=re.S)
    if path != '404.html':
        description = re.search(r'<meta name="description" content="([^\"]*)"', s)
        if description and 'property="og:description"' not in s:
            s = s.replace('</head>', '<meta property="og:description" content="' + description[1] + '">\n</head>')
        if 'application/ld+json' not in s:
            title = html.unescape(re.search(r'<title>(.*?)</title>', s, re.S)[1])
            schema = {'@context': 'https://schema.org', '@type': 'WebPage', 'url': page_url,
                      'name': title, 'inLanguage': lang}
            if description: schema['description'] = html.unescape(description[1])
            s = s.replace('</head>', '<script type="application/ld+json">\n' + json.dumps(schema, ensure_ascii=False, indent=2) + '\n</script>\n</head>')
    # Explicit Korean home links are robust when storage access fails.
    if lang == 'ko':
        s = re.sub(r'(<a\b[^>]*href=")/(#[^\"]*)?"', lambda m: m[1] + '/?lang=ko' + (m[2] or '') + '"', s)
    if lang == 'en':
        # Translate company-page links only. Keep app/assets/external URLs untouched.
        def english_link(m):
            from urllib.parse import urlsplit, urlunsplit
            raw = m[2]; u = urlsplit(raw)
            if u.netloc and u.netloc != 'alexsoft.co.kr': return m[0]
            if not u.path.startswith('/') or u.path.startswith('/en/'): return m[0]
            target = u.path.lstrip('/') + ('index.html' if u.path.endswith('/') else '')
            if target not in PAGES: return m[0]
            if 'data-language="ko"' in m[0] or 'hreflang="ko"' in m[0]: return m[0]
            query = '&'.join(x for x in u.query.split('&') if x and not x.startswith('lang='))
            href = urlunsplit((u.scheme, u.netloc, '/en' + u.path, query, u.fragment))
            return m[1] + href + m[3]
        s = re.sub(r'(<a\b[^>]*href=")([^\"]+)("[^>]*>)', english_link, s)
    css = (ROOT / 'scripts/i18n/navigation.css').read_text()
    if 'id="alexsoft-chrome"' in s:
        s = re.sub(r'(<style id="alexsoft-chrome">)(.*?)(</style>)',
                   lambda m: m[1] + m[2].split('/* Bilingual navigation:')[0] + css + m[3], s, flags=re.S)
    if path.endswith('/slides.html'):
        # The deck has its own compact navigation rather than the company header.
        s = re.sub(r'<div class="language-switch".*?</div>', '', s, flags=re.S)
        s = re.sub(r'(<nav class="topbar"[^>]*>)', lambda m: m[1] + switch, s, count=1)
        s = re.sub(r'<style id="deck-locale">.*?</style>\s*', '', s, flags=re.S)
        s = re.sub(r'<noscript><style>\.slide\{display:block!important;.*?</style></noscript>\s*', '', s, flags=re.S)
        s = s.replace('</head>', '''<style id="deck-locale">
.topbar{height:auto;min-height:66px;flex-wrap:wrap;gap:8px 16px;padding:10px 22px}.deck{padding-top:90px}
.slide code{overflow-wrap:anywhere;word-break:break-word}.topbar .language-switch a{color:inherit;text-underline-offset:4px}.topbar .language-switch{display:flex;gap:12px;margin-left:auto;order:10;font-size:12px}
.language-switch a[aria-current="true"]{font-weight:700;text-decoration:underline;text-underline-offset:4px}
@media(max-width:1100px){.progress-wrap{display:none}.chapter-select{min-width:180px;width:24vw}}
@media(max-width:720px){.topbar{min-height:0}.deck{padding-top:150px}.topbar .language-switch{font-size:11px}.chapter-select{min-width:0;max-width:100%;width:100%}.course-state{margin-left:0}}
</style><noscript><style>.slide{display:block!important;min-height:80vh}.deck{height:auto!important;overflow:visible!important}.controls{display:none!important}.topbar{position:relative!important}</style></noscript>
</head>''')
    if 'data-ink' in s:
        s = s.replace('</head>', '<noscript><style>.ink .draw{stroke-dashoffset:0;animation:none}</style></noscript>\n</head>') if '.ink .draw{stroke-dashoffset:0;animation:none}' not in s else s
    file.write_text(s)


if __name__ == '__main__':
    css_file = ROOT / 'assets/ink.css'
    base_css = css_file.read_text().split('/* Bilingual navigation:')[0]
    css_file.write_text(base_css + (ROOT / 'scripts/i18n/navigation.css').read_text())
    for path in PAGES:
        for lang in ['ko', 'en']: sync(path, lang)
    print('Synchronized existing pages in', len(PAGES), 'language pairs.')
