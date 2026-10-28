#!/usr/bin/env python3
"""make_pages.py - create or refresh the pages of apps.ravindran.in.

Run from the apps.ravindran.in-main folder:   python3 _tools/make_pages.py

The app descriptions live in one place: the cards on ../ravindran.in-main/ai-automation.html.
Each app's card is the one whose links point to https://apps.ravindran.in/<slug>/.
This script writes:
  index.html          the hub, with the cards grouped as on ai-automation.html
  <slug>/index.html   one page per app in _tools/apps.txt, with the live app in a frame
and copies css/style.css, favicon.ico and images/og-card.png from ravindran.in so both
sites look the same. The apps themselves (<slug>/app/) are built from GitHub by
_tools/build-apps.sh during every Cloudflare build.
Only files whose content changed are written.
"""
import html, os, re, shutil, sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN = os.path.join(os.path.dirname(SITE), 'ravindran.in-main')
OWNER = 'ravindranmani1980'
BASE = 'https://apps.ravindran.in'
CSS_VERSION = '20261027'

# One-line description shown under the app name on its page.
TAGLINE = {
    'postrix':              'External security posture scanner',
    'cloudparity':          'Multi-cloud cost and performance analytics',
    'invoice-consolidator': 'Multi-subscription Azure invoice analyzer',
    'cloudcostiq':          'Cost savings analyzer and FinOps benchmarks',
    'cloudbounty':          'FinOps bounty dashboard and zombie-resource game',
    'azureshield':          'Azure Storage and RBAC security auditor',
    'aws-sentinel':         'AWS S3 and IAM security auditor',
    'cybershield':          'Cyber defense training suite',
    'threatguard':          'Cyber defense game for teens and young adults',
}
# What the frame intro says. Default: runs in the browser with sample data.
INTRO = {
    'postrix': 'Try it below. It checks the public website you enter: its security headers, '
               'its redirects and its DMARC email record. Only check sites you own or are allowed to test.',
}
DEFAULT_INTRO = 'Try it below: it runs in your browser with built-in sample data.'
# Optional extra link on an app page: slug -> (url, label)
EXTRA_LINK = {
    'cybershield': ('https://ais-pre-elolfngen6z6f37daibx6g-647805725217.us-east1.run.app/', 'Full version'),
}
# Optional training video on an app page: slug -> (YouTube video id, title)
VIDEO = {
    'postrix': ('6bUHoCgOfi8', 'Postrix walkthrough'),
}
# Hub sections, in order: (id of the <h4 class="proj-sub"> on ai-automation.html, menu label)
GROUPS = [('apps-security', 'Security'), ('apps-finops', 'FinOps'), ('apps-training', 'Training')]

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
        s = re.search(re.escape(BASE) + r'/([a-z0-9-]+)/"', m.group(0))
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
            '<a class="brand" href="/">Ravindran <span>Mani</span> &middot; Apps</a>'
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
<noscript><style>@media(max-width:760px){{nav.wrap{{height:auto;padding-top:12px;padding-bottom:12px}}.navtoggle{{display:none}}.navlinks{{position:static;max-height:none;visibility:visible;width:100%}}}}</style></noscript>
</head><body><a class="skip-link" href="#main">Skip to content</a>
'''

def local_links(card):
    """Hub cards link to the app pages on this site."""
    return card.replace(BASE + '/', '/')

def hub(groups, apps):
    names = {g: label for g, label in GROUPS}
    sub = re.findall(r'<h4 class="proj-sub" id="([^"]+)">(.*?)</h4>', src)
    titles = dict(sub)
    listed = {s for s, _ in apps}
    body = []
    for gid, _ in GROUPS:
        cards = [local_links(c) for s, c in groups.get(gid, []) if s in listed]
        if not cards:
            continue
        body.append(f'      <h2 class="proj-sub" id="{gid}">{titles.get(gid, names[gid])}</h2>\n'
                    f'      <div class="cards projects apps">\n        ' + '\n        '.join(cards) + '\n      </div>')
    n = len(listed)
    desc = ('Cloud security, FinOps and security-awareness apps by Ravindran Mani: '
            'Postrix, AzureShield, AWS Sentinel, CloudParity, CloudBounty and more. Free to try in the browser.')
    return head('Cloud Security & FinOps Apps | Ravindran Mani', desc, BASE + '/') + header('/') + f'''
<main id="main">
  <section class="alt">
    <div class="wrap">
      <div class="section-head">
        <div class="kicker mono">{n} apps &middot; free to try</div>
        <h1>Cloud security and FinOps apps</h1>
        <p>Tools for checking cloud security, controlling cloud spend and training people to spot attacks. Each one opens in your browser, with no sign-up.</p>
      </div>
    </div>
  </section>
  <section aria-label="Apps">
    <div class="wrap">
{chr(10).join(body)}
    </div>
  </section>
</main>
{FOOTER}'''

def video_section(slug, ht):
    if slug not in VIDEO:
        return ''
    vid, vt = VIDEO[slug]
    vt = html.escape(vt)
    return f'''<section class="app-video" aria-labelledby="video-h" style="padding:40px 16px 8px">
  <div class="wrap" style="max-width:960px">
    <h2 id="video-h" style="margin:0 0 6px">Watch the walkthrough</h2>
    <p style="margin:0 0 16px;color:var(--ink-soft)">A short guided tour of {ht}, then try it yourself below.</p>
    <div style="position:relative;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#0B1220;box-shadow:0 12px 40px rgba(8,20,32,0.18)">
      <iframe src="https://www.youtube-nocookie.com/embed/{vid}?rel=0" title="{vt}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
    <p style="margin:10px 0 0;font-size:0.88rem;color:var(--ink-soft)"><a href="https://youtu.be/{vid}" target="_blank" rel="noopener">Watch on YouTube <span aria-hidden="true">&#8599;</span></a></p>
  </div>
</section>
'''

def page(slug, repo, kicker, title, facts, tagline, public_repo):
    links = [f'<a class="card-link" href="app/" target="_blank" rel="noopener">Open full screen {ARROW}</a>']
    if slug in EXTRA_LINK:
        u, label = EXTRA_LINK[slug]
        links.append(f'<a class="card-link" href="{u}" target="_blank" rel="noopener">{label} {ARROW}</a>')
    if public_repo:
        links.append(f'<a class="card-link" href="https://github.com/{OWNER}/{repo}" target="_blank" rel="noopener">Source on GitHub {ARROW}</a>')
    links.append('<a class="card-link" href="/"><span aria-hidden="true">&larr;</span> All apps</a>')
    url = f'{BASE}/{slug}/'
    desc = f'{title}: {tagline}. Free to try in your browser, built by Ravindran Mani.'
    ht = html.escape(title)
    return head(f'{title}: {tagline} | Ravindran Mani', desc, url) + header('') + f'''
<main id="main">
<section class="alt app-intro">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Apps</a> <span aria-hidden="true">/</span> {ht}</nav>
    <div class="section-head">
      <div class="kicker mono">{kicker}</div>
      <h1>{ht}</h1>
      <p>{html.escape(tagline)}. {html.escape(INTRO.get(slug, DEFAULT_INTRO))}</p>
    </div>
    {facts}
    <div class="card-links">{''.join(links)}</div>
  </div>
</section>
{video_section(slug, ht)}<section class="app-stage" aria-label="{ht} live app">
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
    public_repo = f'github.com/{OWNER}/{repo}"' in card
    write(f'{slug}/index.html', page(slug, repo, kicker, title, facts, TAGLINE.get(slug, title), public_repo))
write('index.html', hub(groups, apps))
for rel in ('css/style.css', 'favicon.ico', 'apple-touch-icon.png', 'images/og-card.png'):
    copy(rel)
print('\n'.join('wrote ' + c for c in changed) if changed else 'all pages unchanged')
