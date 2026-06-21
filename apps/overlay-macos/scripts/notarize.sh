#!/bin/sh
# Build a notarized, stapled Prism.dmg — a clickable installer that opens with no
# Gatekeeper warning and no Terminal. This is the "part b" upgrade over the curl
# installer.
#
# ── ONE-TIME PREREQUISITES (require an Apple Developer account, $99/yr) ──────────
#   1. Enrol at https://developer.apple.com  ($99/yr).
#   2. Create a "Developer ID Application" certificate — Xcode → Settings →
#      Accounts → (your team) → Manage Certificates → +  → "Developer ID
#      Application". It lands in your login keychain.
#      Verify:  security find-identity -v -p codesigning | grep "Developer ID"
#   3. Store notary credentials once as a keychain profile (so this script can
#      submit non-interactively):
#        xcrun notarytool store-credentials prism-notary \
#          --apple-id "you@apple.id" \
#          --team-id  "YOURTEAMID" \
#          --password "app-specific-password"
#      (App-specific password: appleid.apple.com → Sign-In and Security →
#       App-Specific Passwords.)
#
# ── USAGE ───────────────────────────────────────────────────────────────────────
#   cd apps/overlay-macos
#   DEVID="Developer ID Application: Your Name (TEAMID)" ./scripts/notarize.sh
#
# Then copy build/Prism.dmg to apps/web/public/download/Prism.dmg and deploy to
# light up the one-click "Download for Mac" button on /install.
set -eu

DEVID="${DEVID:?Set DEVID to your 'Developer ID Application: …' identity (see header)}"
PROFILE="${NOTARY_PROFILE:-prism-notary}"
APP="build/PrismOverlay.app"
DMG="build/Prism.dmg"
VOL="Prism"

cd "$(dirname "$0")/.."

echo "→ Building the app…"
make all SIGN_ID="-" >/dev/null

echo "→ Signing with Developer ID + hardened runtime + secure timestamp…"
codesign --force --deep --options runtime --timestamp --sign "$DEVID" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

echo "→ Building the drag-to-install .dmg…"
rm -f "$DMG"
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "$VOL" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
codesign --force --timestamp --sign "$DEVID" "$DMG"

echo "→ Submitting to Apple's notary service (a few minutes)…"
xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait

echo "→ Stapling the notarization ticket…"
xcrun stapler staple "$DMG"
xcrun stapler validate "$DMG"

echo ""
echo "✓ Notarized DMG ready:  $DMG"
echo "  Next: cp $DMG ../web/public/download/Prism.dmg  &&  deploy."
