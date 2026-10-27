#!/bin/sh
# cloudflare-build.sh
# Build step for Cloudflare Pages (Build command: sh cloudflare-build.sh, Build output directory: dist).
# Copies the site into dist/, leaving out files that belong in the repository but not on
# the live site, then builds every app in _tools/apps.txt from GitHub into dist/<slug>/app/.
set -e
rm -rf dist
mkdir dist
for f in * .[!.]*; do
  [ -e "$f" ] || continue
  case "$f" in
    dist|_tools|_templates|.git|.github|.gitignore|README.md|CNAME|LICENSE|cloudflare-build.sh|.DS_Store|functions|package.json|package-lock.json|node_modules|wrangler.toml) continue ;;
  esac
  cp -R "$f" dist/
done
echo "Copied site to dist/: $(find dist -type f | wc -l) files"

# Build the apps from GitHub (never fails the deploy; a failed app keeps its last copy).
if [ -f _tools/build-apps.sh ]; then sh _tools/build-apps.sh || echo "build-apps step had a problem; existing app copies kept"; fi
