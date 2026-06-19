#!/usr/bin/env bash
set -euo pipefail

# Prism terminal installer for Claude Code.
# Usage:
#   curl -fsSL https://goprism.dev/install-terminal.sh | bash

STATUS_LINE_URL="https://goprism.dev/prism-claude-status-line.sh"
INSTALL_DIR="${HOME}/.prism/bin"
STATUS_LINE_PATH="${INSTALL_DIR}/prism-claude-status-line"
SETTINGS_FILE="${HOME}/.claude/settings.json"

err() {
  echo "$1" >&2
}

if ! command -v curl >/dev/null 2>&1; then
  err "curl is required to install Prism for the terminal."
  exit 1
fi

mkdir -p "$INSTALL_DIR"

echo "Downloading Prism status-line helper..."
curl -fsSL -o "$STATUS_LINE_PATH" "$STATUS_LINE_URL"
chmod +x "$STATUS_LINE_PATH"

# Ensure Claude Code settings file exists.
mkdir -p "$(dirname "$SETTINGS_FILE")"
if [ ! -f "$SETTINGS_FILE" ]; then
  echo "{}" > "$SETTINGS_FILE"
fi

# Run the status-line helper once to generate the first ad and spinner verb.
echo "Fetching first ad..."
"$STATUS_LINE_PATH"

# Register the status line in Claude Code settings.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$STATUS_LINE_PATH" <<'PY'
import json, os, sys
script_path = sys.argv[1]
settings_path = os.path.expanduser("~/.claude/settings.json")
try:
    with open(settings_path, "r") as f:
        settings = json.load(f)
except Exception:
    settings = {}
settings["statusLine"] = {
    "type": "command",
    "command": script_path,
    "refreshInterval": 10,
}
with open(settings_path, "w") as f:
    json.dump(settings, f, indent=2)
PY
else
  err "python3 is required to update Claude Code settings."
  exit 1
fi

echo ""
echo "Prism for Claude Code terminal installed successfully."
echo "Start a new Claude Code session to see ads in the spinner and status line."
echo "To uninstall, remove these lines from ${SETTINGS_FILE}:"
echo "  spinnerVerbs, statusLine"
