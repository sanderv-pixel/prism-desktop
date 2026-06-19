#!/usr/bin/env bash
set -euo pipefail

# Prism extension installer
# Usage:
#   curl -fsSL https://goprism.dev/install.sh | bash
#   curl -fsSL https://goprism.dev/install.sh | bash -s -- --cursor
#   curl -fsSL https://goprism.dev/install.sh | bash -s -- --code

DOWNLOAD_URL="https://goprism.dev/prism-extension.vsix"
TMP_DIR=""
VSIX_PATH=""

cleanup() {
  if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

err() {
  echo "$1" >&2
}

usage() {
  cat <<'EOF'
Usage: install.sh [OPTIONS]

Install the Prism extension for VS Code or Cursor.

Options:
  --code      Install for Visual Studio Code
  --cursor    Install for Cursor
  --help      Show this help message

If neither --code nor --cursor is given, the installer prefers VS Code and
falls back to Cursor. The editor's command-line launcher must either be on
PATH or installed in a default location.

If the installer cannot find your editor, add the CLI to PATH or pass
--code / --cursor explicitly. For example:

  # macOS (add this to ~/.zshrc or ~/.bash_profile)
  export PATH="/Applications/Cursor.app/Contents/Resources/app/bin:$PATH"

  # Linux (VS Code installed from the official .deb/.rpm)
  export PATH="/usr/share/code/bin:$PATH"
EOF
}

TARGET=""
for arg in "$@"; do
  case "$arg" in
    --cursor)
      TARGET="cursor"
      ;;
    --code)
      TARGET="code"
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      err "Unknown option: $arg"
      usage >&2
      exit 1
      ;;
  esac
done

resolve_editor() {
  local name="$1"

  # 1. PATH
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi

  # 2. macOS app bundles
  case "$name" in
    code)
      local mac_code_paths=(
        "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
        "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
      )
      for p in "${mac_code_paths[@]}"; do
        if [ -x "$p" ]; then
          echo "$p"
          return 0
        fi
      done
      ;;
    cursor)
      local mac_cursor_paths=(
        "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
        "$HOME/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
      )
      for p in "${mac_cursor_paths[@]}"; do
        if [ -x "$p" ]; then
          echo "$p"
          return 0
        fi
      done
      ;;
  esac

  # 3. Linux default locations
  local linux_paths=(
    "/usr/share/$name/bin/$name"
    "/usr/bin/$name"
    "/snap/bin/$name"
    "/opt/$name/bin/$name"
  )
  for p in "${linux_paths[@]}"; do
    if [ -x "$p" ]; then
      echo "$p"
      return 0
    fi
  done

  return 1
}

resolve_target() {
  for name in "$@"; do
    local cli_path
    if cli_path="$(resolve_editor "$name")"; then
      echo "$name:$cli_path"
      return 0
    fi
  done

  return 1
}

if [ -z "$TARGET" ]; then
  # Default: prefer code, then cursor
  if ! target_info="$(resolve_target code cursor)"; then
    err "Could not find 'code' or 'cursor'."
    err "Add the editor's CLI to PATH, or pass --code / --cursor explicitly."
    err ""
    err "Common fixes:"
    err "  macOS Cursor: export PATH=\"/Applications/Cursor.app/Contents/Resources/app/bin:\$PATH\""
    err "  macOS VS Code: export PATH=\"/Applications/Visual Studio Code.app/Contents/Resources/app/bin:\$PATH\""
    err "  Linux VS Code: export PATH=\"/usr/share/code/bin:\$PATH\""
    exit 1
  fi
else
  if ! target_info="$(resolve_target "$TARGET")"; then
    err "Could not find '$TARGET'."
    err "Add the '$TARGET' CLI to PATH, or check that $TARGET is installed."
    exit 1
  fi
fi

TARGET_NAME="${target_info%%:*}"
TARGET_CLI="${target_info#*:}"

TMP_DIR="$(mktemp -d)"
VSIX_PATH="$TMP_DIR/prism-extension.vsix"

echo "Installing Prism extension for $TARGET_NAME..."
echo "Using CLI: $TARGET_CLI"

curl -fsSL -o "$VSIX_PATH" "$DOWNLOAD_URL"
"$TARGET_CLI" --install-extension "$VSIX_PATH"

echo "Prism extension installed successfully."
echo "Open $TARGET_NAME and run 'Prism: Enable Prism' from the Command Palette if needed."
