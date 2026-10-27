#!/usr/bin/env python3
"""build-sitemap.py - rebuilds sitemap.xml for apps.ravindran.in.

Run from the apps.ravindran.in-main folder:   python3 _tools/build-sitemap.py
Lists the hub and one page per app, in the order of _tools/apps.txt. The apps themselves
(<slug>/app/) are left out. lastmod is the page file's modification date.
"""
import datetime, os

SITE = 'https://apps.ravindran.in'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

pages = [('index.html', '', '1.0')]
for line in open(os.path.join(ROOT, '_tools', 'apps.txt'), encoding='utf-8'):
    line = line.strip()
    if line and not line.startswith('#'):
        slug = line.split()[0]
        pages.append((f'{slug}/index.html', f'{slug}/', '0.8'))

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
n = 0
for rel, path, pri in pages:
    f = os.path.join(ROOT, rel)
    if not os.path.exists(f):
        continue
    lastmod = datetime.date.fromtimestamp(os.path.getmtime(f)).isoformat()
    lines.append(f'  <url>\n    <loc>{SITE}/{path}</loc>\n    <lastmod>{lastmod}</lastmod>\n    <priority>{pri}</priority>\n  </url>')
    n += 1
lines.append('</urlset>')
with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('\n'.join(lines) + '\n')
print(f'sitemap.xml: {n} URLs')
