#!/bin/bash
# Prism adapter for Claude Code statusLine
#
# Configure Claude Code to use this script in your Claude config, e.g.:
# {
#   "statusLine": "/Users/alanahmuylle/Desktop/AIAD/claude-adapter/prism-status.sh"
# }
#
# Environment variables:
#   PRISM_API_URL   - Prism API base URL (default: https://goprism.dev/api)
#   PRISM_USER_ID   - Optional anonymous user id
#   PRISM_TIMEOUT   - Request timeout in seconds (default: 3)

set -euo pipefail

PRISM_API_URL="${PRISM_API_URL:-https://goprism.dev/api}"
PRISM_USER_ID="${PRISM_USER_ID:-}"
PRISM_TIMEOUT="${PRISM_TIMEOUT:-3}"

# Consume stdin (Claude Code session JSON) for context / duration.
STDIN_DATA=""
if ! [[ -t 0 ]]; then
  STDIN_DATA=$(cat)
fi

# Render the status line. All formatting is done in Python for robust JSON/ANSI handling.
python3 - "$PRISM_API_URL" "$PRISM_TIMEOUT" "$PRISM_USER_ID" "$STDIN_DATA" <<'PY'
import json
import os
import subprocess
import sys
import time

api_url = sys.argv[1]
timeout_sec = int(sys.argv[2])
user_id = sys.argv[3] or None
stdin_data = sys.argv[4]

# Parse Claude Code session JSON if available.
session = {}
elapsed_ms = None
if stdin_data:
    try:
        session = json.loads(stdin_data)
    except Exception:
        pass
    # Claude Code may expose how long the current operation has been running.
    elapsed_ms = session.get("elapsedMs") or session.get("elapsed_ms") or session.get("durationMs") or session.get("duration_ms")

# Build context payload. Claude Code has no editor language by default, but we can
# sniff the active file extension from the session if exposed.
language = ""
files = session.get("files") or session.get("openFiles") or []
if files and isinstance(files, list):
    active = files[0].get("path", "")
    _, ext = os.path.splitext(active)
    language = ext.lstrip(".").lower()

payload = {
    "context": {
        "editor": "claude-code",
        "aiTool": "claude-code",
        "language": language,
        "waitState": True,
    }
}
if user_id:
    payload["userId"] = user_id

# Try to fetch a real ad from the Prism API.
start = time.time()
response = None
try:
    proc = subprocess.run(
        [
            "curl",
            "-sS",
            "-m", str(timeout_sec),
            "-X", "POST",
            "-H", "Content-Type: application/json",
            "-H", "X-Prism-Client: PrismClaudeAdapter/0.1.0",
            "-d", json.dumps(payload),
            f"{api_url.rstrip('/')}/ads",
        ],
        capture_output=True,
        text=True,
        timeout=timeout_sec + 1,
    )
    if proc.returncode == 0 and proc.stdout.strip():
        response = json.loads(proc.stdout)
except Exception:
    response = None

# Fallback ad if the API is unreachable.
if not response or not response.get("copy"):
    response = {
        "copy": "Ship faster on Railway →",
        "advertiserName": "Railway",
    }

copy = response.get("copy", "")
advertiser = response.get("advertiserName", "Prism") or "Prism"
icon = advertiser[0].upper()

# ANSI styling: underline for the ad copy.
RESET = "\033[0m"
UNDERLINE = "\033[4m"

# Pick a stable background color for the icon so each advertiser is visually
# distinct in the Claude Code status line.
def advertiser_color(name):
    colors = [
        "\033[41m",  # red
        "\033[42m",  # green
        "\033[43m",  # yellow
        "\033[44m",  # blue
        "\033[45m",  # magenta
        "\033[46m",  # cyan
    ]
    h = sum(ord(c) for c in name) if name else 0
    return colors[h % len(colors)]

ICON_BG = advertiser_color(advertiser)
ICON_STYLE = f"{ICON_BG}\033[1m\033[97m"

status = f"{ICON_STYLE} {icon} {RESET} {UNDERLINE}{copy}{RESET}"
print(status)
PY
