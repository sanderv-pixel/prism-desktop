# Prism for VS Code / Cursor

Contextual ads for AI builders. Earn while AI codes.

## What it does

Prism displays a tiny, native-looking ad in your status bar while AI coding assistants (GitHub Copilot, Cursor Tab, Cursor Composer, etc.) are generating suggestions or thinking.

- One-line status bar ad styled to match Claude Code: colored advertiser icon, ad copy, and live wait duration.
- Detects AI activity through multiple signals: typing bursts, large accepted completions, running terminal commands, AI command invocations, and visible AI panels.
- No source code, prompts, or filenames leave your device.
- Click the ad to visit the advertiser's landing page.
- Hide any advertiser instantly from the command palette.
- Disable Prism anytime.

## Supported editors

- **Visual Studio Code** 1.74+
- **Cursor** (VS Code-based; install the `.vsix` manually)

## Commands

| Command | Action |
|---------|--------|
| `Prism: Enable Prism` | Turn ads on |
| `Prism: Disable Prism` | Turn ads off |
| `Prism: Hide this advertiser` | Hide the advertiser currently shown |
| `Prism: Open Prism ad` | Visit the current ad's landing page |
| `Prism: Refresh Prism status` | Re-evaluate AI wait state |
| `Prism: Open dashboard to connect account` | Link this editor to your Prism account |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `prism.enabled` | `true` | Show ads during AI wait states |
| `prism.apiUrl` | `https://goprism.dev/api` | Prism API base URL |
| `prism.showAdsWhenNoWait` | `false` | Show an ad even when no wait state is detected |
| `prism.minimumWaitMs` | `1500` | Minimum wait time before showing an ad |

## Local development

```bash
cd apps/extension
npm install
npm run compile
```

Press `F5` in VS Code to open the Extension Development Host.

## Packaging

```bash
npm run package       # prism-0.1.0.vsix
```

## Installing via command line (no marketplace needed)

You can install Prism directly from our hosted `.vsix` without waiting for marketplace approval.

### macOS / Linux

**VS Code:**
```bash
curl -fsSL https://goprism.dev/install.sh | bash
```

**Cursor:**
```bash
curl -fsSL https://goprism.dev/install.sh | bash -s -- --cursor
```

The installer first checks PATH, then common macOS app-bundle and Linux install locations. If your editor CLI is not found, add it to PATH or pass `--code` / `--cursor` explicitly.

### Windows (PowerShell)

**VS Code:**
```powershell
irm https://goprism.dev/install.ps1 | iex
```

**Cursor:**
```powershell
& ([scriptblock]::Create((irm https://goprism.dev/install.ps1))) -Cursor
```

The script downloads the latest `prism-extension.vsix` and installs it using the `code` or `cursor` CLI. If your editor CLI is not on PATH, the installer looks in the default Windows install folders; otherwise add the editor's `bin` folder to PATH or pass `-Code` / `-Cursor` explicitly.

## Linking your Prism account

After installation:

1. Reload the editor window if prompted.
2. Open the Command Palette (<kbd>Cmd/Ctrl + Shift + P</kbd>).
3. Run **Prism: Open dashboard to connect account**.
4. Sign in (or sign up) on the page that opens.
5. The page links your editor to your account automatically.

Once linked, every validated impression from this device counts toward your dashboard earnings.

## Installing in Cursor (manual / beta)

1. Run `npm run package` to build `prism-0.1.3.vsix`.
2. In Cursor, open **Extensions** → **⋯** → **Install from VSIX…**.
3. Select the generated `.vsix` file.

## Publishing to the official marketplaces

### VS Code Marketplace

1. Create a publisher at https://marketplace.visualstudio.com/manage.
2. Generate an Azure DevOps Personal Access Token with **Marketplace > Publish** scope.
3. Login: `npx @vscode/vsce login <publisher>`.
4. Publish: `npx @vscode/vsce publish` ( bumps version automatically) or `npx @vscode/vsce package && npx @vscode/vsce publish --packagePath prism-0.1.3.vsix`.

> Because Prism shows ads, make sure the README and listing clearly disclose: ads are shown, users can disable them, and no source code/prompts leave the device. Microsoft may require a privacy policy.

### Cursor marketplace (Open VSX)

Cursor uses the **Open VSX Registry** for its built-in Extensions view.

1. Create an account and namespace at https://open-vsx.org.
2. Create an access token under your user settings.
3. Install the Open VSX CLI: `npm i -g ovsx`.
4. Login: `ovsx create-namespace prism --pat <token>` (once per namespace).
5. Publish: `ovsx publish prism-0.1.3.vsix --pat <token>`.

After Open VSX approves the namespace, the extension appears inside Cursor’s Extensions search.
