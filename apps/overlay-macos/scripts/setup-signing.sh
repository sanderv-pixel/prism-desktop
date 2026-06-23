#!/bin/sh
# Stable, PORTABLE code-signing identity for overlay releases.
#
# macOS keys the user's Accessibility / Screen-Recording grant to the app's
# signing identity. To keep that grant across updates you must sign EVERY release
# with the SAME certificate — on every build machine and in CI. Ad-hoc signing,
# or a freshly minted cert per machine, changes the identity and silently breaks
# the overlay on update (the ad just stops). No Apple Developer account needed.
#
# Resolution order:
#   1. identity already in the keychain  -> reuse it
#   2. a shared .p12 is available        -> import it (every machine = same cert)
#   3. nothing yet                       -> mint one AND export it to share
#
# Usage:
#   scripts/setup-signing.sh
#   PRISM_SIGNING_P12=/path/to/PrismOverlaySigning.p12 scripts/setup-signing.sh
#
# Then build releases with:  make release SIGN_ID="Prism Overlay Signing"
set -eu

CN="Prism Overlay Signing"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
P12="${PRISM_SIGNING_P12:-$DIR/secrets/PrismOverlaySigning.p12}"
P12_PASS="${PRISM_SIGNING_P12_PASS:-prism}"

has_identity() { security find-identity -v -p codesigning 2>/dev/null | grep -q "$CN"; }

# 1) Already present — nothing to do.
if has_identity; then
  echo "✓ Identity \"$CN\" already present. Build releases:"
  echo "    make release SIGN_ID=\"$CN\""
  exit 0
fi

# 2) Shared .p12 available — import the SAME cert every machine uses.
if [ -f "$P12" ]; then
  echo "→ Importing the shared signing identity from $P12 …"
  security import "$P12" -k "$KEYCHAIN" -P "$P12_PASS" -T /usr/bin/codesign -A >/dev/null
  if has_identity; then
    echo "✓ Imported \"$CN\". Build releases:"
    echo "    make release SIGN_ID=\"$CN\""
    exit 0
  fi
  echo "⚠ Import of $P12 failed; falling back to minting a new identity."
fi

# 3) No cert anywhere — mint one, then export it so every other machine / CI can
#    import the SAME identity. That shared cert is what keeps the user's grant
#    across updates.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Generating a self-signed code-signing certificate…"
cat > "$TMP/cert.cnf" <<EOF
[req]
distinguished_name=dn
x509_extensions=v3
prompt=no
[dn]
CN=$CN
[v3]
keyUsage=critical,digitalSignature
extendedKeyUsage=critical,codeSigning
basicConstraints=critical,CA:false
EOF
openssl req -x509 -newkey rsa:2048 -keyout "$TMP/key.pem" -out "$TMP/cert.pem" \
  -days 3650 -nodes -config "$TMP/cert.cnf" >/dev/null 2>&1
openssl pkcs12 -export -legacy -inkey "$TMP/key.pem" -in "$TMP/cert.pem" \
  -out "$TMP/id.p12" -passout "pass:$P12_PASS" -name "$CN" >/dev/null 2>&1

echo "→ Importing into your login keychain (codesign-accessible)…"
security import "$TMP/id.p12" -k "$KEYCHAIN" -P "$P12_PASS" -T /usr/bin/codesign -A >/dev/null

echo "→ Trusting it for code signing (you may be asked for your password)…"
security add-trusted-cert -r trustRoot -p codeSign -k "$KEYCHAIN" "$TMP/cert.pem" >/dev/null 2>&1 || \
  echo "  (trust step skipped — see fallback below if signing fails)"

echo "→ Verifying codesign can use it…"
echo 'int main(){return 0;}' > "$TMP/t.c"
clang "$TMP/t.c" -o "$TMP/t" 2>/dev/null
if codesign --force --sign "$CN" "$TMP/t" 2>/dev/null; then
  mkdir -p "$DIR/secrets"
  cp "$TMP/id.p12" "$DIR/secrets/PrismOverlaySigning.p12"
  chmod 600 "$DIR/secrets/PrismOverlaySigning.p12"
  echo ""
  echo "✓ Done. Build signed releases with:"
  echo "    make release SIGN_ID=\"$CN\""
  echo ""
  echo "★ To make releases reproducible on EVERY machine, share this ONE file"
  echo "  (it is the private signing key — store it as a secret, never commit it):"
  echo "    $DIR/secrets/PrismOverlaySigning.p12   (password: $P12_PASS)"
  echo "  On another machine / in CI:"
  echo "    PRISM_SIGNING_P12=/path/to/PrismOverlaySigning.p12 scripts/setup-signing.sh"
else
  cat <<EOF

⚠ codesign couldn't use the identity automatically. Easiest fallback — create it
  in the GUI (more reliable, still no Apple account):

  Keychain Access → Certificate Assistant → Create a Certificate…
    Name: $CN
    Identity Type: Self Signed Root
    Certificate Type: Code Signing
  Then export it (right-click → Export) as PrismOverlaySigning.p12 and share it
  with your other build machines, and: make release SIGN_ID="$CN"
EOF
fi
