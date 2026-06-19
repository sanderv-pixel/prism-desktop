# Prism Claude Code Adapter

A lightweight `statusLine` adapter for [Claude Code](https://claude.ai/code) that displays a Prism ad line while Claude is working.

## What it looks like

The adapter renders a single-line status entry that matches the native Claude Code style:

```
🟩 R  Underlined ad copy here  1.4s
```

- A colored icon with the advertiser's initial.
- Underlined ad copy (clickable via the URL in the API response).
- Optional duration on the right when Claude Code reports `elapsedMs`.

If the Prism API is unreachable, it falls back to a static demo ad.

## Setup

1. Make the script executable:

   ```bash
   chmod +x /usr/local/bin/prism-status.sh
   ```

2. Add to your Claude Code config (`~/.claude/config.json`):

   ```json
   {
     "statusLine": "/usr/local/bin/prism-status.sh"
   }
   ```

3. Restart Claude Code or run `/refresh` to pick up the change.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PRISM_API_URL` | `https://goprism.dev/api` | Prism API base URL |
| `PRISM_USER_ID` | (none) | Anonymous user identifier |
| `PRISM_TIMEOUT` | `3` | Request timeout in seconds |

## How it works

The script receives Claude Code session JSON on stdin, calls the Prism `/ads` endpoint with `editor=claude-code`, and prints a single formatted line. It parses `elapsedMs` / `elapsed_ms` from the session payload to show the current-operation duration.
