# apps.ravindran.in

Hub and live pages for the apps built by Ravindran Mani. Hosted on Cloudflare Pages
(project `ravindran-apps-git`, connected to the GitHub repo `ravindran-apps`).

## Layout
- `index.html` – hub (generated)
- `<slug>/index.html` – one page per app (generated); `<slug>/app/` – the app, built from GitHub
- `functions/api/` – Postrix's backend: `inspect` (headers, redirects, DMARC), `notify-assessment`, `notifications`
- `_tools/apps.txt` – the apps: `slug repo`
- `_tools/make_pages.py` – writes the hub and app pages from the cards on `../ravindran.in-main/ai-automation.html`
- `_tools/build-apps.sh` – run by `cloudflare-build.sh` on every Cloudflare build; a failed app keeps its last copy; writes `status.json`
- `_tools/github-workflows/check-apps.yml` – copied to `.github/workflows/` by publish-all.command; rebuilds when an app repo changes

## Cloudflare project settings
- Build command `sh cloudflare-build.sh`, output `dist`, production branch `main`, framework None
- Custom domain `apps.ravindran.in`
- Compatibility flag `nodejs_compat` (for worker-mailer)
- Variables and secrets: `GITHUB_TOKEN` (read-only Contents on Maniq-Posture, because it is private);
  optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_NOTIFICATION_EMAIL` to get an email per Postrix run
- GitHub repo secret `APPS_READ_TOKEN` (same kind of token) for the 4-hourly check

## Adding an app
1. Add `slug repo` to `_tools/apps.txt`.
2. Add its card on ravindran.in's ai-automation.html with links to `https://apps.ravindran.in/<slug>/`.
3. Double-click publish-all.command.
