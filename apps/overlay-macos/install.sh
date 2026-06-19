#!/bin/sh
# Prism Overlay — one-line installer for macOS.
#
#   curl -fsSL https://goprism.dev/install.sh | sh
#
# Files fetched with curl are NOT quarantined, so the (ad-hoc/self-signed) app
# launches with no Gatekeeper prompt — no Apple Developer account required.
set -eu

APP_NAME="PrismOverlay.app"
DEST="/Applications/$APP_NAME"
ZIP_URL="${PRISM_ZIP_URL:-https://goprism.dev/download/PrismOverlay.zip}"

echo "→ Downloading Prism…"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "$ZIP_URL" -o "$TMP/prism.zip"

echo "→ Installing to /Applications…"
osascript -e 'quit app "Prism Overlay"' 2>/dev/null || true
sleep 1
rm -rf "$DEST"
ditto -x -k "$TMP/prism.zip" /Applications
# Belt-and-suspenders: strip quarantine if any tooling added it.
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "→ Launching Prism…"
open "$DEST"

cat <<'DONE'

✓ Prism is installed and running (look for ◆ in your menu bar).

Next: when it asks, click "Enable" to grant Accessibility — that's the one
permission it needs to place the sponsored line next to Claude's activity.
Prism only reads the macOS Accessibility tree; it never modifies Claude.

Uninstall any time:  curl -fsSL https://goprism.dev/uninstall.sh | sh
DONE
