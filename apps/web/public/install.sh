#!/bin/sh
# Prism Overlay - one-line installer for macOS.
#
#   curl -fsSL https://goprism.dev/install.sh | sh
#
# Files fetched with curl are NOT quarantined, so the (ad-hoc/self-signed) app
# launches with no Gatekeeper prompt - no Apple Developer account required.
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

# Link this device to your account. The dashboard's personalized install command sets
# PRISM_LINK_TOKEN; we exchange it for an account-bound device key and seed it BEFORE
# first launch, so the overlay reports to your account from impression #1 (no browser
# round-trip, no app changes). Without a token the overlay self-registers anonymously.
API_BASE="${PRISM_API_URL:-https://goprism.dev}"
if [ -n "${PRISM_LINK_TOKEN:-}" ]; then
  echo "→ Linking this device to your Prism account…"
  LINK_RESP="$(curl -fsS -X POST -H 'Content-Type: application/json' \
    -d "{\"token\":\"$PRISM_LINK_TOKEN\"}" "$API_BASE/api/auth/link/exchange" 2>/dev/null || true)"
  API_KEY="$(printf '%s' "$LINK_RESP" | sed -n 's/.*"apiKey":"\([^"]*\)".*/\1/p')"
  if [ -n "$API_KEY" ]; then
    defaults write dev.goprism.overlay PrismApiKey "$API_KEY"
    defaults write dev.goprism.overlay PrismDeviceId "$(uuidgen | tr -d '-')"
    echo "  ✓ Linked - your earnings will credit this account automatically."
  else
    echo "  ⚠ Couldn't link automatically (token expired or already used)."
    echo "    Prism will still run; link this device later from your dashboard."
  fi
fi

echo "→ Enabling launch-at-login…"
PLIST="$HOME/Library/LaunchAgents/dev.goprism.overlay.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.goprism.overlay</string>
  <key>ProgramArguments</key>
  <array><string>$DEST/Contents/MacOS/PrismOverlay</string></array>
  <key>RunAtLoad</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>LimitLoadToSessionType</key><string>Aqua</string>
</dict>
</plist>
PL

echo "→ Launching Prism…"
# launchd starts it now (RunAtLoad) and at every login. Reload to pick up updates.
launchctl bootout "gui/$(id -u)/dev.goprism.overlay" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || open "$DEST"

cat <<'DONE'

✓ Prism is installed and runs automatically at login (look for ◆ in your menu bar).

Next: when it asks, click "Enable" to grant Accessibility - that's the one
permission it needs to place the sponsored line next to Claude's activity.
Prism only reads the macOS Accessibility tree; it never modifies Claude.

Uninstall any time:  curl -fsSL https://goprism.dev/uninstall.sh | sh
DONE
