#!/bin/bash
# Clean-install smoke test for the Prism VS Code/Cursor extension.
# This restores any previous Claude Code panel patch, removes old Prism builds,
# and installs the fresh prism-0.1.3.vsix so you can verify the extension patches
# Claude Code on activation.
# Usage:
#   ./scripts/test-clean-install.sh vscode
#   ./scripts/test-clean-install.sh cursor

set -e

# Make sure bundled editor CLIs are on PATH even if the user hasn't installed the shell command.
export PATH="/Applications/Cursor.app/Contents/Resources/app/bin:/Applications/Visual Studio Code.app/Contents/Resources/app/bin:$HOME/.local/bin:$PATH"

TARGET="${1:-vscode}"
VSCODE_CLI="code"
EXT_DIR="$HOME/.vscode/extensions"

if [ "$TARGET" = "cursor" ]; then
  VSCODE_CLI="cursor"
  EXT_DIR="$HOME/.cursor/extensions"
fi

VSIX="apps/extension/prism-0.1.3.vsix"
if [ ! -f "$VSIX" ]; then
  echo "VSIX not found at $VSIX. Run: npm run build:extension && npm run package:extension"
  exit 1
fi

echo "==> Restoring any previous Claude Code panel patch..."
npx tsx apps/cli/src/index.ts restore-panel || true

echo "==> Uninstalling existing Prism extension ($TARGET)..."
$VSCODE_CLI --uninstall-extension prism.prism 2>/dev/null || true

echo "==> Removing leftover Prism extension directories..."
rm -rf "$EXT_DIR"/prism.prism-*
rm -rf "$EXT_DIR"/prism-*

echo "==> Installing fresh Prism extension from $VSIX..."
$VSCODE_CLI --install-extension "$VSIX"

echo ""
echo "Done. Now:"
echo "1. Open/reload $TARGET."
echo "2. Open the Prism output channel (View → Output → Prism)."
echo "3. Open a workspace where Claude Code is installed."
echo "4. Use Claude Code — the panel ad should appear during thinking."
echo "5. If it doesn't, run Command Palette → 'Prism: Patch Claude Code panel' and reload."
echo ""
echo "To get a brand-new Claude Code extension, uninstall it from the Extensions panel"
echo "and reinstall it before running this script."
