// GET /api/notifications
// The Node server kept a log in memory; the public site keeps none, so the app's
// notification log only shows runs from the visitor's own browser.
import { json } from './_lib.js';

export const onRequestGet = () => json({ ok: true, notifications: [] });
