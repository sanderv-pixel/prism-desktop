#!/bin/sh
# Prism Overlay — uninstaller.
#   curl -fsSL https://goprism.dev/uninstall.sh | sh
set -eu

APP="/Applications/PrismOverlay.app"
BUNDLE_ID="dev.goprism.overlay"

echo "→ Disabling launch-at-login + quitting Prism…"
launchctl bootout "gui/$(id -u)/dev.goprism.overlay" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/dev.goprism.overlay.plist"
osascript -e 'quit app "Prism Overlay"' 2>/dev/null || true
pkill -f PrismOverlay 2>/dev/null || true
sleep 1

echo "→ Removing the app…"
rm -rf "$APP"

echo "→ Revoking its Accessibility permission…"
tccutil reset Accessibility "$BUNDLE_ID" 2>/dev/null || true

# App preferences (saved API key / onboarding state).
defaults delete "$BUNDLE_ID" 2>/dev/null || true

echo "✓ Prism removed."
