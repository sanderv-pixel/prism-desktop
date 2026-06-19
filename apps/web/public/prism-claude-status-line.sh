#!/usr/bin/env bash
set -euo pipefail

# Prism status-line helper for Claude Code.
# Fetches a contextual ad, prints it as a clickable status line, and updates
# the spinner verb so Claude Code's thinking spinner shows the same copy.

API_URL="${PRISM_API_URL:-https://goprism.dev/api}"
API_KEY="${PRISM_API_KEY:-}"
USER_ID_FILE="${HOME}/.prism-user-id"
SETTINGS_FILE="${HOME}/.claude/settings.json"

ensure_user_id() {
  if [ ! -f "$USER_ID_FILE" ]; then
    mkdir -p "$(dirname "$USER_ID_FILE")"
    if command -v openssl >/dev/null 2>&1; then
      openssl rand -hex 16 > "$USER_ID_FILE"
    else
      LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 32 > "$USER_ID_FILE"
    fi
  fi
  cat "$USER_ID_FILE"
}

fetch_ad() {
  local user_id
  user_id="$(ensure_user_id)"

  local headers=(-H "Content-Type: application/json" -H "X-Prism-Client: PrismTerminal/0.1.0")
  if [ -n "$API_KEY" ]; then
    headers+=(-H "X-Prism-Api-Key: $API_KEY")
  fi

  local body
  body="$(cat <<EOF
{"context":{"editor":"claude","aiTool":"claude-code","intent":"coding","audience":"developers","waitState":true},"userId":"$user_id","hiddenAdvertisers":[]}
EOF
  )"

  curl -s -m 3 -X POST "${API_URL}/ads" "${headers[@]}" -d "$body" || true
}

parse_field() {
  local json="$1" field="$2"
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import sys,json; d=json.loads(sys.argv[1]); print(d.get('$field',''))" "$json" 2>/dev/null || true
  elif command -v jq >/dev/null 2>&1; then
    jq -r ".$field // empty" <<< "$json" 2>/dev/null || true
  fi
}

update_spinner_verb() {
  local text="$1"
  if [ ! -f "$SETTINGS_FILE" ]; then
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$text" <<'PY'
import json, os, sys
text = sys.argv[1]
path = os.path.expanduser("~/.claude/settings.json")
try:
    with open(path, "r") as f:
        settings = json.load(f)
except Exception:
    settings = {}
settings.setdefault("spinnerVerbs", {"mode": "replace", "verbs": []})
settings["spinnerVerbs"]["mode"] = "replace"
settings["spinnerVerbs"]["verbs"] = [text]
with open(path, "w") as f:
    json.dump(settings, f, indent=2)
PY
  fi
}

main() {
  local resp adv copy url text
  resp="$(fetch_ad)"

  if [ -n "$resp" ]; then
    adv="$(parse_field "$resp" advertiserName)"
    copy="$(parse_field "$resp" copy)"
    url="$(parse_field "$resp" clickUrl)"
    if [ -z "$url" ]; then
      url="$(parse_field "$resp" url)"
    fi
  fi

  if [ -z "${adv:-}" ] || [ -z "${copy:-}" ]; then
    adv="Prism"
    copy="contextual ads for AI wait states →"
    url="https://goprism.dev"
  fi

  text="${adv} · ${copy}"
  update_spinner_verb "$text"

  # Print a bold black-on-yellow status line with an explicit URL for terminal
  # auto-linkify and an OSC 8 hyperlink for terminals that support it.
  printf '\e]8;;%s\e\\' "$url"
  printf '\e[1;30;103m 🪧 %s %s \e[0m' "$text" "$url"
  printf '\e]8;;\e\\\n'
}

main "$@"
