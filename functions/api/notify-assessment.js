// POST /api/notify-assessment
// Called by Postrix after each assessment. Replaces the route of the same name in the
// app's Node server. To stop the public site being used to send mail to strangers, it
// never emails the tester. If SMTP is configured on the Cloudflare project, it emails you
// (ADMIN_NOTIFICATION_EMAIL) a one-line summary of the run, the way the contact form does.
// Secrets (Pages > Settings > Variables and secrets): SMTP_HOST, SMTP_PORT, SMTP_USER,
// SMTP_PASS, ADMIN_NOTIFICATION_EMAIL, FROM_EMAIL (optional). Needs the nodejs_compat flag.
import { WorkerMailer } from 'worker-mailer';
import { json, escapeHtml } from './_lib.js';

const clip = (v, n, d) => String(v ?? d).trim().slice(0, n) || d;

export async function onRequestPost({ request, env }) {
  let b = {};
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad request' }, 400); }

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const n = {
    id: `NTF-${Date.now().toString().slice(-6)}`,
    testerName: clip(b.testerName, 120, 'Security Tester'),
    testerEmail: clip(b.testerEmail, 254, ''),
    targetHostname: clip(b.targetHostname, 253, ''),
    clientName: clip(b.clientName, 120, 'Default Workspace'),
    postureScore: Math.max(0, Math.min(100, Number(b.postureScore) || 0)),
    headerGrade: clip(b.headerGrade, 3, '-'),
    passedChecks: Math.max(0, Number(b.passedChecks) || 0),
    failedChecks: Math.max(0, Number(b.failedChecks) || 0),
    timestamp,
    summary: clip(b.summary, 500, 'Postrix assessment'),
  };

  const subject = `Your Postrix assessment of ${n.targetHostname || 'your site'}: grade ${n.headerGrade} (${n.postureScore}/100)`;
  const bodyText =
    `Hello ${n.testerName},\n\nThank you for running Postrix.\n\n` +
    `Target: ${n.targetHostname}\nScore: ${n.postureScore}/100 (grade ${n.headerGrade})\n` +
    `Checks passed: ${n.passedChecks}, failed: ${n.failedChecks}\nRun at: ${timestamp}\n\n` +
    `https://apps.ravindran.in/postrix/`;
  const testerMail = {
    to: n.testerEmail,
    subject,
    bodyText,
    bodyHtml: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(bodyText)}</pre>`,
    deliveryStatus: 'ready_for_relay',
    deliveryNote: 'Not sent by the public site. Use "Open in Mail Client" to send it yourself.',
  };

  let adminEmailStatus = 'not configured';
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_NOTIFICATION_EMAIL } = env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && ADMIN_NOTIFICATION_EMAIL) {
    const port = parseInt(SMTP_PORT, 10);
    const line = `${n.testerName} <${n.testerEmail || 'no email'}> checked ${n.targetHostname}: ` +
                 `${n.postureScore}/100 (${n.headerGrade}), ${n.passedChecks} passed, ${n.failedChecks} failed.`;
    try {
      await WorkerMailer.send(
        { host: SMTP_HOST, port, secure: port === 465, startTls: port !== 465,
          credentials: { username: SMTP_USER, password: SMTP_PASS }, authType: ['plain', 'login'] },
        { from: { name: 'Postrix', email: env.FROM_EMAIL || SMTP_USER },
          to: ADMIN_NOTIFICATION_EMAIL,
          subject: `Postrix run: ${n.targetHostname} ${n.headerGrade} (${n.postureScore}/100)`,
          text: `${line}\n\nWorkspace: ${n.clientName}\nAt: ${timestamp}`,
          html: `<p>${escapeHtml(line)}</p><p>Workspace: ${escapeHtml(n.clientName)}<br>At: ${timestamp}</p>` }
      );
      adminEmailStatus = 'sent';
    } catch (err) {
      console.error('postrix admin mail failed:', err && err.message ? err.message : err);
      adminEmailStatus = 'failed';
    }
  }

  return json({
    ok: true,
    notification: { ...n, testerEmailDispatched: testerMail, adminEmailStatus },
    testerMail,
    emailDelivery: { testerDeliveryMethod: 'not sent by the server; use Open in Mail Client' },
    totalNotifications: 1,
  });
}
