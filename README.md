# Prism

> Contextual ad network for AI builders.

Prism turns dead AI wait time into earnings for builders and high-intent ad inventory for developer-focused companies.

## Monorepo

This repo uses npm workspaces.

```bash
npm install
```

## Apps

- `apps/web` - Next.js landing page, dashboards, and API.
- `apps/extension` - VS Code / Cursor extension.
- `packages/shared` - shared types, API client, and constants.
- `claude-adapter` - Claude Code `statusLine` adapter.

## Quick start

```bash
# Install all workspace dependencies
npm install

# Build everything
npm run build

# Run tests
npm test

# Web app
cd apps/web
npm run dev

# VS Code / Cursor extension
cd apps/extension
npm run compile
npm run package        # produces prism-0.1.0.vsix
# Press F5 in VS Code to run the extension host
# In Cursor: Extensions → ⋯ → Install from VSIX… → select prism-0.1.0.vsix
```

## Docs

See [PLAN.md](./PLAN.md) for the full strategy and roadmap.
