#!/bin/sh
# Create a self-signed code-signing identity for release builds.
#
# Why: ad-hoc-signed apps are tracked by code hash, so every update would make
# the user re-grant Accessibility. Signing every release with ONE stable
# self-signed identity keeps the grant across updates — no Apple Developer
# account needed. (It does NOT satisfy notarization; we ship via the curl
# installer, which avoids quarantine, so that's fine.)
#
# Run once on the build machine. May prompt for your login-keychain password
# when adding trust. Then build releases with:
#
#   make release SIGN_ID="Prism Overlay Signing"
set -eu

CN="Prism Overlay Signing"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if security find-identity -v -p codesigning 2>/dev/null | grep -q "$CN"; then
  echo "✓ Identity \"$CN\" already exists and is valid for code signing."
  exit 0
fi

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
  -out "$TMP/id.p12" -passout pass:prism -name "$CN" >/dev/null 2>&1

echo "→ Importing into your login keychain (codesign-accessible)…"
security import "$TMP/id.p12" -k "$KEYCHAIN" -P prism -T /usr/bin/codesign -A >/dev/null

echo "→ Trusting it for code signing (you may be asked for your password)…"
security add-trusted-cert -r trustRoot -p codeSign -k "$KEYCHAIN" "$TMP/cert.pem" >/dev/null 2>&1 || \
  echo "  (trust step skipped — see fallback below if signing fails)"

echo "→ Verifying codesign can use it…"
echo 'int main(){return 0;}' > "$TMP/t.c"
clang "$TMP/t.c" -o "$TMP/t" 2>/dev/null
if codesign --force --sign "$CN" "$TMP/t" 2>/dev/null; then
  echo ""
  echo "✓ Done. Build signed releases with:"
  echo "    make release SIGN_ID=\"$CN\""
else
  cat <<EOF

⚠ codesign couldn't use the identity automatically. Easiest fallback — create it
  in the GUI (more reliable, still no Apple account):

  Keychain Access → Certificate Assistant → Create a Certificate…
    Name: $CN
    Identity Type: Self Signed Root
    Certificate Type: Code Signing
  Then: make release SIGN_ID="$CN"

  Or just ship ad-hoc (make release) and accept that updates re-prompt for
  the Accessibility toggle.
EOF
fi
