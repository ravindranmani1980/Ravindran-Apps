#!/usr/bin/env python3
"""make_pages.py - create or refresh the pages of apps.ravindran.in.

Run from the apps.ravindran.in-main folder:   python3 _tools/make_pages.py

The app descriptions live in one place: the cards on ../ravindran.in-main/ai-automation.html.
Each app's card is the one whose links point to https://apps.ravindran.in/<slug>/.
This script writes:
  index.html          the hub: apps grouped as on ai-automation.html, as compact cards
  <slug>/index.html   one page per app in _tools/apps.txt: details and the how-to video
                      side by side, then the live app full width underneath
and copies css/style.css, favicon.ico and the icons from ravindran.in so both sites look
the same. css/apps.css (this site only) holds the hub and app-page layout.
To add a how-to video, paste its YouTube link into VIDEO below and run this script. The apps themselves (<slug>/app/) are built from GitHub by
_tools/build-apps.sh during every Cloudflare build.
Only files whose content changed are written.
"""
import html, os, re, shutil, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN = os.path.join(os.path.dirname(SITE), 'ravindran.in-main')
OWNER = 'ravindranmani1980'
BASE = 'https://apps.ravindran.in'
CSS_VERSION = '20261027b'
APPS_CSS_VERSION = '20261031'

# One-line description shown under the app name on its page.
TAGLINE = {
    'maniq-posture':        'External security posture scanner',
    'maniq-compare':        'Multi-cloud cost and performance analytics',
    'maniq-invoice':        'Multi-subscription Azure invoice analyzer',
    'maniq-spend':          'Cloud cost savings analyzer and FinOps benchmarks',
    'maniq-sweep':          'Multi-cloud FinOps dashboard and zombie-resource game',
    'Maniq-Shield':         'Azure Storage and RBAC security auditor',
    'Maniq-Watch':          'AWS S3 and IAM security auditor',
    'Maniq-Govern':         'Architecture, governance and adoption analytics for Microsoft Copilot',
    'maniq-academy':        'Cyber defense training suite',
    'maniq-arcade':         'Cyber defense game for teens and young adults',
}
# What the frame intro says. Default: runs in the browser with sample data.
INTRO = {
    'maniq-posture': 'Try it below. It checks the public website you enter: its security headers, '
               'its redirects and its DMARC email record. Only check sites you own or are allowed to test.',
}
DEFAULT_INTRO = 'Try it below: it runs in your browser with built-in sample data.'
# How-to video for each app: paste the YouTube link (https://youtu.be/... or
# https://www.youtube.com/watch?v=...). Leave it '' to show the "coming soon" placeholder.
VIDEO = {
    'maniq-posture':        'https://youtu.be/6bUHoCgOfi8',
    'Maniq-Shield':         'https://youtu.be/KnoAlHQ2FhI',
    'Maniq-Watch':          'https://youtu.be/zGVGi_Ao6Rg',
    'Maniq-Govern':         'https://youtu.be/_78OEWnokhg',
    'maniq-compare':        'https://youtu.be/NQtleY5oZBk',
    'maniq-invoice':        'https://youtu.be/nlu8zbqNqxI',
    'maniq-spend':          'https://youtu.be/waFrjN4kC0o',
    'maniq-sweep':          'https://youtu.be/wQ6AHZesPh0',
    'maniq-academy':        'https://youtu.be/n8pxh4odVqQ',
    'maniq-arcade':         'https://youtu.be/sKUw_Sd7eJI',
}
# Hub sections, in order: (id of the <h4 class="proj-sub"> on ai-automation.html, menu label)
GROUPS = [('apps-security', 'Security'), ('apps-finops', 'FinOps'), ('apps-training', 'Training')]
# One line under each hub section heading.
GROUP_INTRO = {
    'apps-security': 'Check websites and cloud accounts for risky settings, and get the fixes written out.',
    'apps-finops':   'Compare cloud prices, consolidate invoices and find savings across Azure, AWS and Google Cloud.',
    'apps-training': 'Practise spotting phishing, scams and attacks in safe, hands-on simulations.',
}

def video_id(slug):
    link = (VIDEO.get(slug) or '').strip()
    m = re.search(r'(?:youtu\.be/|[?&]v=|/embed/|/shorts/)([A-Za-z0-9_-]{11})', link) or \
        re.fullmatch(r'([A-Za-z0-9_-]{11})', link)
    return m.group(1) if m else ''

ARROW = '<span aria-hidden="true">&#8599;</span>'
changed = []

def write(rel, text):
    path = os.path.join(SITE, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
    if old == text:
        return
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    changed.append(rel)

def copy(rel):
    src, dst = os.path.join(MAIN, rel), os.path.join(SITE, rel)
    if not os.path.exists(src):
        print('missing on ravindran.in:', rel)
        return
    if os.path.exists(dst) and open(src, 'rb').read() == open(dst, 'rb').read():
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    changed.append(rel)

def read_apps():
    apps = []
    for line in open(os.path.join(SITE, '_tools', 'apps.txt'), encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#'):
            slug, repo = line.split()[:2]
            apps.append((slug, repo))
    return apps

src = open(os.path.join(MAIN, 'ai-automation.html'), encoding='utf-8').read()
fonts = re.search(r'(<link rel="preconnect".*?</noscript>)', src, re.S).group(1)

def cards_by_group():
    """{group id: [(slug, card html), ...]} in page order."""
    out, current = {}, None
    for m in re.finditer(r'<h4 class="proj-sub" id="([^"]+)"|<article class="card"[^>]*>.*?</article>', src, re.S):
        if m.group(1):
            current = m.group(1)
            continue
        s = re.search(re.escape(BASE) + r'/([A-Za-z0-9-]+)/"', m.group(0))
        if s and current:
            out.setdefault(current, []).append((s.group(1), m.group(0)))
    return out

def card_facts(card):
    kicker = re.search(r'<span class="idx mono">([^<]*)</span>', card).group(1)
    title = re.sub(r'<[^>]+>', '', re.search(r'<h3>(.*?)</h3>', card, re.S).group(1)).strip()
    facts = re.search(r'(<dl class="proj-facts">.*?</dl>)', card, re.S).group(1)
    return kicker, html.unescape(title), facts

def header(current):
    items = [('/', 'All apps')] + [(f'/#{gid}', label) for gid, label in GROUPS] + \
            [('https://ravindran.in/', 'ravindran.in'), ('https://ravindran.in/contact.html', 'Contact')]
    lis = []
    for href, label in items:
        ext = ' target="_blank" rel="noopener"' if href.startswith('http') else ''
        cur = ' aria-current="page"' if href == current else ''
        lis.append(f'<li><a href="{href}"{cur}{ext}>{label}</a></li>')
    return ('<header class="site"><nav class="wrap" aria-label="Main navigation">'
            '<a class="brand" href="/"><img class="brand-mark" src="/images/rm-mark.png" alt="" width="53" height="32">Ravindran <span>Mani</span> &middot; Apps</a>'
            '<button type="button" class="navtoggle" aria-expanded="false" aria-controls="navlinks" id="navBtn">Menu</button>'
            f'<ul class="navlinks" id="navlinks">{"".join(lis)}</ul></nav></header>')

FOOTER = '''<footer>
  &copy; <span id="year">2026</span> Ravindran Mani. All rights reserved. &middot; <a href="https://ravindran.in/">ravindran.in</a>
</footer>
<script>
document.getElementById('year').textContent=new Date().getFullYear();
const btn=document.getElementById('navBtn'),links=document.getElementById('navlinks');
btn.addEventListener('click',()=>{const open=links.classList.toggle('open');btn.setAttribute('aria-expanded',String(open))});
links.addEventListener('click',e=>{if(e.target.closest('a')){links.classList.remove('open');btn.setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&links.classList.contains('open')){links.classList.remove('open');btn.setAttribute('aria-expanded','false');btn.focus()}});
document.querySelectorAll('.video-facade').forEach(b=>b.addEventListener('click',()=>{const f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+b.dataset.vid+'?autoplay=1&rel=0';f.title=b.getAttribute('aria-label');f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';f.referrerPolicy='strict-origin-when-cross-origin';f.allowFullscreen=true;b.replaceWith(f);}));
</script>
</body></html>
'''

def head(title, desc, url):
    t, d = html.escape(title), html.escape(desc)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<meta name="description" content="{d}">
<meta name="author" content="Ravindran Mani">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Apps by Ravindran Mani">
<meta property="og:image" content="{BASE}/images/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{BASE}/images/og-card.png">
{fonts}
<link rel="stylesheet" href="/css/style.css?v={CSS_VERSION}">
<link rel="stylesheet" href="/css/apps.css?v={APPS_CSS_VERSION}">
<noscript><style>@media(max-width:1000px){{nav.wrap{{height:auto;padding-top:12px;padding-bottom:12px}}.navtoggle{{display:none}}.navlinks{{position:static;max-height:none;visibility:visible;width:100%}}}}</style></noscript>
</head><body><a class="skip-link" href="#main">Skip to content</a>
'''

def card_parts(card):
    """kicker, title, the 'Gives you' sentence."""
    kicker, title, facts = card_facts(card)
    g = re.search(r'<dt>Gives you</dt>\s*<dd>(.*?)</dd>', facts, re.S)
    return kicker, title, (g.group(1).strip() if g else '')

def hub(groups, apps):
    sub = dict(re.findall(r'<h4 class="proj-sub" id="([^"]+)">(.*?)</h4>', src))
    listed = [s for s, _ in apps]
    chips, body = [], []
    for gid, label in GROUPS:
        items = [(s, c) for s, c in groups.get(gid, []) if s in listed]
        if not items:
            continue
        name = sub.get(gid, label)
        chips.append(f'<a href="#{gid}">{name} <span class="count">{len(items)}</span></a>')
        cards = []
        for slug, card in items:
            kicker, title, gives = card_parts(card)
            ht = html.escape(title)
            vid = '<span class="has-video" title="Has a how-to video">&#9654; Video</span>' if video_id(slug) else ''
            cards.append(f'''<article class="app-card">
          <span class="idx">{kicker}</span>
          <h3><a href="/{slug}/">{ht}</a></h3>
          <p class="tagline">{html.escape(TAGLINE.get(slug, title))}</p>
          <p class="sum">{gives}</p>
          <div class="row"><a class="btn btn-primary btn-sm" href="/{slug}/" aria-label="Try {ht}">Try it</a><a class="btn btn-secondary btn-sm" href="/{slug}/app/" target="_blank" rel="noopener" aria-label="Open {ht} full screen">Full screen {ARROW}</a>{vid}</div>
        </article>''')
        body.append(f'''  <section class="hub-group" id="{gid}" aria-labelledby="{gid}-h">
    <div class="wrap">
      <div class="hub-group-head"><h2 id="{gid}-h">{name}</h2><p>{GROUP_INTRO.get(gid, '')}</p></div>
      <div class="hub-grid">
        {(chr(10) + '        ').join(cards)}
      </div>
    </div>
  </section>''')
    n = len(listed)
    desc = ('Cloud security, FinOps and security-awareness apps by Ravindran Mani: '
            'Maniq Posture, Maniq Shield, Maniq Watch, Maniq Compare, Maniq Spend and more. Free to try in the browser.')
    return head('Cloud Security & FinOps Apps | Ravindran Mani', desc, BASE + '/') + header('/') + f'''
<main id="main">
  <section class="alt hub-hero">
    <div class="wrap">
      <div class="kicker">{n} apps &middot; free &middot; no sign-up</div>
      <h1>Cloud security and FinOps apps</h1>
      <p>Tools for checking cloud security, controlling cloud spend and training people to spot attacks. Each one runs in your browser, right here on this site.</p>
      <nav class="hub-nav" aria-label="App categories">{''.join(chips)}</nav>
    </div>
  </section>
{chr(10).join(body)}
</main>
{FOOTER}'''

def video_block(slug, ht):
    vid = video_id(slug)
    if vid:
        return f'''<div class="video-box"><button type="button" class="video-facade" data-vid="{vid}" aria-label="Play video: How to use {ht}"><img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="play" aria-hidden="true"></span></button></div>
        <p class="video-meta"><span>Short guided tour, then try it yourself below.</span><a class="text-link" href="https://youtu.be/{vid}" target="_blank" rel="noopener">Watch on YouTube {ARROW}</a></p>'''
    return '''<div class="video-box video-empty" role="img" aria-label="How-to video coming soon"><div><span class="play-outline" aria-hidden="true"></span><strong>How-to video</strong><span class="soon">Coming soon</span></div></div>'''

def page(slug, kicker, title, facts, tagline):
    url = f'{BASE}/{slug}/'
    desc = f'{title}: {tagline}. Free to try in your browser, built by Ravindran Mani.'
    ht = html.escape(title)
    return head(f'{title}: {tagline} | Ravindran Mani', desc, url) + header('') + f'''
<main id="main">
<section class="alt app-top">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Apps</a> <span aria-hidden="true">/</span> {ht}</nav>
    <div class="app-top-grid">
      <div class="app-info">
        <div class="kicker">{kicker}</div>
        <h1>{ht}</h1>
        <p class="lead">{html.escape(tagline)}. {html.escape(INTRO.get(slug, DEFAULT_INTRO))}</p>
        {facts}
        <div class="app-actions"><a class="btn btn-primary" href="#app">Try it now <span aria-hidden="true">&darr;</span></a><a class="btn btn-secondary" href="app/" target="_blank" rel="noopener">Open full screen {ARROW}</a><a class="text-link" href="/"><span aria-hidden="true">&larr;</span> All apps</a></div>
      </div>
      <div class="app-video">
        <div class="kicker">How to use {ht}</div>
        {video_block(slug, ht)}
      </div>
    </div>
  </div>
</section>
<section class="app-stage" id="app" aria-labelledby="app-h">
  <div class="app-stage-head"><h2 id="app-h">Try {ht}</h2><a class="text-link" href="app/" target="_blank" rel="noopener">Open full screen {ARROW}</a></div>
  <div class="app-frame"><iframe src="app/" title="{ht} live app" loading="lazy" allow="clipboard-write; fullscreen" allowfullscreen></iframe></div>
  <p class="app-hint">On a phone? <a href="app/" target="_blank" rel="noopener">Open it full screen</a> for the best view.</p>
</section>
</main>
{FOOTER}'''

apps = read_apps()
groups = cards_by_group()
found = {s: c for g in groups.values() for s, c in g}
for slug, repo in apps:
    card = found.get(slug)
    if not card:
        print(f'skip {slug}: no card on ai-automation.html links to {BASE}/{slug}/')
        continue
    kicker, title, facts = card_facts(card)
    write(f'{slug}/index.html', page(slug, kicker, title, facts, TAGLINE.get(slug, title)))
write('index.html', hub(groups, apps))
for rel in ('css/style.css', 'favicon.ico', 'apple-touch-icon.png', 'images/og-card.png', 'images/rm-mark.png'):
    copy(rel)
print('\n'.join('wrote ' + c for c in changed) if changed else 'all pages unchanged')
