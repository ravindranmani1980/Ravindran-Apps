#!/bin/sh
# build-apps.sh
# Runs inside the Cloudflare Pages build, after cloudflare-build.sh has copied the site to dist/.
# For each app in _tools/apps.txt it downloads the latest code from GitHub, builds it,
# and puts it in dist/<slug>/app/.  If an app fails to download or build, the copy
# that is already in the site folder stays, so the live site never loses an app.
# A summary is written to dist/status.json.
#
# Private repos (Maniq-Posture): set GITHUB_TOKEN on the Cloudflare project to a
# fine-grained token with read-only "Contents" access to those repos.

set -u
OWNER=ravindranmani1980
ROOT=$(pwd)
LIST="$ROOT/_tools/apps.txt"
WORK="${TMPDIR:-/tmp}/ravindran-app-src"
STATUS="$ROOT/dist/status.json"
STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export GIT_TERMINAL_PROMPT=0
AUTH=""
[ -n "${GITHUB_TOKEN:-}" ] && AUTH="x-access-token:${GITHUB_TOKEN}@"
# Small shim so apps that read process.env in the browser do not crash.
SHIM='<script>window.process=window.process||{env:{}};</script>'

# Install and build one app. AI Studio projects sometimes have peer-dependency
# conflicts, so try a normal install first, then --force, then --legacy-peer-deps.
build_app() {
  for mode in "" "--force" "--legacy-peer-deps"; do
    echo "== npm install ${mode:-(normal)}" >>"$2"
    rm -rf "$1/node_modules" "$1/dist"
    if ( cd "$1" \
         && timeout 420 npm install --no-audit --no-fund --loglevel=error $mode \
         && timeout 300 npx --no-install vite build --base=./ ) >>"$2" 2>&1 \
       && [ -f "$1/dist/index.html" ]; then
      return 0
    fi
  done
  return 1
}

[ -f "$LIST" ] || { echo "build-apps: $LIST not found, skipping"; exit 0; }
mkdir -p "$WORK" "$ROOT/dist"
printf '{\n  "built": "%s",\n  "apps": [\n' "$STAMP" > "$STATUS"
first=1

grep -v '^[[:space:]]*#' "$LIST" | while read -r slug repo; do
  [ -n "${slug:-}" ] && [ -n "${repo:-}" ] || continue
  src="$WORK/$repo"
  log="$WORK/$slug.log"
  dest="$ROOT/dist/$slug/app"
  result=kept
  sha=""
  start=$(date +%s)
  echo "build-apps: $slug ($repo)"
  rm -rf "$src"
  if git clone -q --depth 1 "https://${AUTH}github.com/$OWNER/$repo.git" "$src" >"$log" 2>&1; then
    sha=$(git -C "$src" rev-parse --short HEAD)
    if build_app "$src" "$log"; then
      grep -q 'window.process=' "$src/dist/index.html" || \
        sed -i "0,/<head>/s##<head>$SHIM#" "$src/dist/index.html"
      mkdir -p "$ROOT/dist/$slug"
      rm -rf "$dest.new" && cp -R "$src/dist" "$dest.new" \
        && rm -rf "$dest" && mv "$dest.new" "$dest" && result=built
    fi
  else
    # Never print the token if git echoes the URL.
    [ -n "${GITHUB_TOKEN:-}" ] && sed -i "s#${GITHUB_TOKEN}#***#g" "$log"
  fi
  secs=$(( $(date +%s) - start ))
  if [ "$result" = built ]; then
    echo "build-apps:   built $repo@$sha in ${secs}s"
  else
    echo "build-apps:   FAILED after ${secs}s, keeping the existing copy. Last lines of the log:"
    tail -n 15 "$log" | sed 's/^/    | /'
    [ -f "$dest/index.html" ] || echo "build-apps:   WARNING: no existing copy for $slug either"
  fi
  [ -f "$ROOT/dist/$slug/index.html" ] || echo "build-apps:   WARNING: $slug/index.html (the app page) is missing"
  [ $first -eq 1 ] && first=0 || printf ',\n' >> "$STATUS"
  printf '    {"app": "%s", "repo": "%s", "commit": "%s", "result": "%s", "seconds": %s}' \
    "$slug" "$repo" "$sha" "$result" "$secs" >> "$STATUS"
  rm -rf "$src/node_modules"
done
printf '\n  ]\n}\n' >> "$STATUS"
echo "build-apps: done. Summary in status.json:"
cat "$STATUS"
exit 0
