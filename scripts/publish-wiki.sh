#!/usr/bin/env bash
# Copy wiki/ into the GitHub wiki remote: <origin>.wiki.git
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORIGIN="$(git -C "$ROOT" remote get-url origin)"
WIKI_URL="${ORIGIN%.git}.wiki.git"
WIKI_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WIKI_DIR"
}
trap cleanup EXIT

echo "Publishing $ROOT/wiki -> $WIKI_URL"
git clone "$WIKI_URL" "$WIKI_DIR"
rsync -a --delete --exclude '.git/' "$ROOT/wiki/" "$WIKI_DIR/"

git -C "$WIKI_DIR" add -A
if git -C "$WIKI_DIR" diff --cached --quiet; then
  echo "Wiki already up to date"
  exit 0
fi

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
git -C "$WIKI_DIR" commit -m "Sync wiki from ${SHA}"
git -C "$WIKI_DIR" push
echo "Published to $WIKI_URL"
