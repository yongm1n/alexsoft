#!/usr/bin/env python3
"""Pair company-page sitemap entries without changing Korean or app media metadata."""
import argparse
import copy
import datetime
import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync_locales', ROOT / 'scripts/sync-locales.py')
locales = importlib.util.module_from_spec(spec)
spec.loader.exec_module(locales)
NS = {
    '': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'image': 'http://www.google.com/schemas/sitemap-image/1.1',
    'video': 'http://www.google.com/schemas/sitemap-video/1.1',
    'xhtml': 'http://www.w3.org/1999/xhtml',
}
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)


def tag(name, prefix=''):
    return '{' + NS[prefix] + '}' + name


def video_objects(path):
    found = {}

    def visit(value):
        if isinstance(value, list):
            for item in value:
                visit(item)
        elif isinstance(value, dict):
            if value.get('@type') == 'VideoObject' and value.get('contentUrl'):
                found[value['contentUrl']] = value
            for item in value.values():
                visit(item)

    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', path.read_text(), re.S):
        visit(json.loads(block))
    return found


def alternates(entry, path):
    for old in list(entry.findall(tag('link', 'xhtml'))):
        entry.remove(old)
    ko = locales.BASE + locales.route(path)
    en = locales.BASE + locales.route('en/' + path)
    values = [('ko', ko + ('?lang=ko' if path == 'index.html' else '')),
              ('en', en), ('x-default', locales.BASE + '/' if path == 'index.html' else en)]
    for position, (lang, url) in enumerate(values, start=1):
        entry.insert(position, ET.Element(tag('link', 'xhtml'), {
            'rel': 'alternate', 'hreflang': lang, 'href': url,
        }))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--new-date', help='Actual YYYY-MM-DD preparation date for newly added English entries')
    parser.add_argument('--check', action='store_true', help='Check synchronization without writing')
    args = parser.parse_args()
    if args.new_date:
        datetime.date.fromisoformat(args.new_date)
    sitemap = ROOT / 'sitemap.xml'
    root = ET.parse(sitemap).getroot()
    entries = {entry.findtext(tag('loc')): entry for entry in root}
    paths = [p for p in locales.PAGES if p not in {'404.html', 'blog/index.html'}]
    ko_paths = {locales.BASE + locales.route(p): p for p in paths}
    en_urls = {locales.BASE + locales.route('en/' + p) for p in paths}
    excluded = {locales.BASE + locales.route(prefix + p)
                for prefix in ['', 'en/'] for p in ['404.html', 'blog/index.html']}
    missing = set(ko_paths) - set(entries)
    if missing:
        parser.error('Add the Korean source entries and their reviewed media metadata first: ' + ', '.join(sorted(missing)))
    output = ET.Element(tag('urlset'))
    for entry in root:
        url = entry.findtext(tag('loc'))
        if url in en_urls or url in excluded:
            continue
        ko_entry = copy.deepcopy(entry)
        if url not in ko_paths:
            output.append(ko_entry)
            continue
        path = ko_paths[url]
        en_url = locales.BASE + locales.route('en/' + path)
        en_entry = copy.deepcopy(entry)
        en_entry.find(tag('loc')).text = en_url
        old_en = entries.get(en_url)
        modified = old_en.findtext(tag('lastmod')) if old_en is not None else args.new_date
        if not modified:
            parser.error('--new-date is required for new English entries: ' + en_url)
        lastmod = en_entry.find(tag('lastmod'))
        if lastmod is None:
            lastmod = ET.SubElement(en_entry, tag('lastmod'))
        lastmod.text = modified
        videos = video_objects(ROOT / ('en/' + path))
        for video in en_entry.findall(tag('video', 'video')):
            source = videos.get(video.findtext(tag('content_loc', 'video')))
            if not source or not source.get('name') or not source.get('description'):
                parser.error('Reviewed English VideoObject name/description missing in en/' + path)
            video.find(tag('title', 'video')).text = source['name']
            video.find(tag('description', 'video')).text = source['description']
        alternates(ko_entry, path)
        alternates(en_entry, path)
        output.extend([ko_entry, en_entry])
    ET.indent(output, space='  ')
    rendered = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(output, encoding='unicode') + '\n'
    if args.check and sitemap.read_text() != rendered:
        print('Sitemap differs; run scripts/sync-sitemap.py after reviewing the page pairs.')
        return 1
    if not args.check:
        sitemap.write_text(rendered)
    print(f'{len(paths)} indexable language pairs / {len(output)} sitemap URLs: synchronized')
    return 0


if __name__ == '__main__':
    sys.exit(main())
