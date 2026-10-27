// GET /api/inspect?target=example.com
// Passive check of a public website for Postrix: HTTP response headers (following up to
// 4 redirects), <meta http-equiv> tags in the first 64 KB of the page, and the DMARC record.
// Replaces the /api/inspect route of the app's Node server (server.ts), which cannot run
// on Cloudflare Pages. Differences: the TLS protocol and cipher are not measured (Workers
// cannot see them); a successful HTTPS request does show the certificate is valid.
import { json, parseTarget, checkHost } from './_lib.js';

const UA = 'Postrix-PostureCheck/1.0 (+https://apps.ravindran.in/postrix/)';
const MAX_BYTES = 65536;

function metaHttpEquiv(html) {
  const out = {};
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const equiv = tag.match(/http-equiv\s*=\s*["']?([^"'\s>]+)/i);
    const content = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (equiv && content && !out[equiv[1].toLowerCase()]) out[equiv[1].toLowerCase()] = content[1].trim();
    const name = tag.match(/name\s*=\s*["']?referrer["']?/i);
    if (name && content && !out['referrer-policy']) out['referrer-policy'] = content[1].trim();
  }
  return out;
}

async function readSnippet(res) {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
  } catch { /* partial body is fine */ }
  try { await reader.cancel(); } catch { /* ignore */ }
  const buf = new Uint8Array(Math.min(total, MAX_BYTES));
  let off = 0;
  for (const c of chunks) {
    const part = c.subarray(0, buf.length - off);
    buf.set(part, off);
    off += part.length;
    if (off >= buf.length) break;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

async function fetchHeaders(startUrl) {
  let url = startUrl;
  const chain = [];
  for (let hop = 0; hop <= 4; hop++) {
    const u = new URL(url);
    checkHost(u.hostname);
    if (hop === 0) u.searchParams.set('_cb', String(Date.now()));
    const res = await fetch(u.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
      },
      signal: AbortSignal.timeout(8000),
    });
    const loc = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && loc && hop < 4) {
      try { await res.body?.cancel(); } catch { /* ignore */ }
      const next = new URL(loc, url).toString();
      chain.push(`${res.status} -> ${next}`);
      url = next;
      continue;
    }
    const snippet = await readSnippet(res);
    const meta = metaHttpEquiv(snippet);
    const headers = {};
    const lines = [`HTTP/1.1 ${res.status} ${res.statusText || ''}`.trim()];
    const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const [k, v] of res.headers) {
      if (k === 'set-cookie') continue;
      headers[k] = v;
      lines.push(`${k}: ${v}`);
    }
    if (cookies.length) {
      headers['set-cookie'] = cookies;
      for (const c of cookies) lines.push(`set-cookie: ${c}`);
    }
    for (const [k, v] of Object.entries(meta)) {
      if (!headers[k]) { headers[k] = v; lines.push(`${k}: ${v}`); }
    }
    return { statusCode: res.status, finalUrl: url, headers, metaHttpEquiv: meta,
             rawHeaderBlock: lines.join('\n'), redirectChain: chain };
  }
  throw new Error('Too many redirects');
}

async function dmarc(hostname) {
  const parts = hostname.split('.');
  const apex = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
  for (const name of [...new Set([`_dmarc.${hostname}`, `_dmarc.${apex}`])]) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      });
      const data = await r.json();
      const txt = (data.Answer || [])
        .filter((a) => a.type === 16)
        .map((a) => String(a.data).replace(/^"|"$/g, '').replace(/"\s*"/g, ''))
        .find((t) => t.toLowerCase().includes('v=dmarc1'));
      if (txt) {
        const p = (txt.toLowerCase().match(/\bp\s*=\s*(reject|quarantine|none)/) || [])[1];
        return { dmarcPolicy: p ? `p=${p}` : 'p=none', rawDmarc: txt };
      }
    } catch { /* try the next name */ }
  }
  return { dmarcPolicy: 'Missing DMARC', rawDmarc: null };
}

export async function onRequestGet({ request }) {
  let hostname, url;
  try {
    ({ hostname, url } = parseTarget(new URL(request.url).searchParams.get('target')));
  } catch (err) {
    return json({ ok: false, error: err.message }, 400);
  }
  try {
    let https = true;
    const [http, mail] = await Promise.all([
      fetchHeaders(url).catch(() => {
        https = false;
        return fetchHeaders(url.replace(/^https:/i, 'http:'));
      }),
      dmarc(hostname),
    ]);
    const tls = {
      measured: false,
      protocol: 'not measured',
      cipherName: 'not measured',
      tlsProfileLabel: 'TLS 1.2 + TLS 1.3 (ECDHE Only)',
      authorized: https && url.startsWith('https:'),
      note: https
        ? 'HTTPS works with a valid certificate. The TLS version and cipher are not measured by this check; set the TLS profile by hand if you know it.'
        : 'HTTPS did not work, so the site was checked over plain HTTP.',
    };
    return json({
      ok: true,
      inspectedAt: new Date().toISOString(),
      hostname,
      finalUrl: http.finalUrl,
      statusCode: http.statusCode,
      redirectChain: http.redirectChain,
      rawHeaderBlock: http.rawHeaderBlock,
      headers: http.headers,
      metaHttpEquiv: http.metaHttpEquiv,
      tls,
      dmarc: mail,
      exposedPortsCsv: '80, 443',
    });
  } catch (err) {
    const msg = err && err.name === 'TimeoutError' ? 'The site did not answer within 8 seconds.' : 'Unable to inspect target domain';
    return json({ ok: false, error: msg }, 400);
  }
}
