// Shared helpers for the Postrix API (Cloudflare Pages Functions).
// Files starting with "_" are not routes.

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

// Only public DNS names are inspected: no IP addresses, no internal names.
export function checkHost(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h) throw new Error('Target hostname is required');
  if (h.length > 253 || !/^[a-z0-9.-]+$/.test(h) || !h.includes('.'))
    throw new Error('Enter a public domain name, for example example.com');
  if (/^\d+(\.\d+){3}$/.test(h) || h.includes(':'))
    throw new Error('Inspection is restricted to external public domains.');
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example|arpa)$/.test(h))
    throw new Error('Inspection is restricted to external public domains.');
  if (h.split('.').some((p) => !p || p.length > 63 || p.startsWith('-') || p.endsWith('-')))
    throw new Error('That does not look like a valid domain name.');
  return h;
}

export function parseTarget(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new Error('Target hostname is required');
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { throw new Error('That does not look like a valid domain name.'); }
  if (u.port && u.port !== '80' && u.port !== '443')
    throw new Error('Only the standard web ports (80 and 443) are inspected.');
  u.username = ''; u.password = ''; u.hash = '';
  return { hostname: checkHost(u.hostname), url: u.toString() };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
