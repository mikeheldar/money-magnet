#!/usr/bin/env bash
# Run this script from the money-magnet folder (or repo root) to diagnose git.
# Usage: ./scripts/git-diagnose.sh   or   bash scripts/git-diagnose.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Git diagnose for Money Magnet ==="
echo ""

echo "1. Repo root: $REPO_ROOT"
echo ""

echo "2. Git version:"
git --version
echo ""

echo "3. Current branch:"
git branch --show-current
echo ""

echo "4. Remote:"
git remote -v
echo ""

echo "5. Status:"
git status
echo ""

echo "6. Last 3 commits:"
git log -3 --oneline
echo ""

echo "7. Fetch (dry run - may prompt for auth):"
if git fetch --dry-run origin 2>&1; then
  echo "   Fetch dry-run OK"
else
  echo "   Fetch failed - check auth (token or SSH)"
fi
echo ""

echo "8. Local config (relevant):"
git config --get remote.origin.url 2>/dev/null || true
git config --get user.name 2>/dev/null || true
git config --get user.email 2>/dev/null || true
echo ""

echo "=== Done. If fetch failed, see docs/GIT_SETUP.md ==="
