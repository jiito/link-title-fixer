# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An Obsidian community plugin that auto-converts pasted URLs into Markdown links with fetched page titles (Google Docs-style behavior). ~60 lines of TypeScript across two files.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode (rebuilds on file change)
npm run build        # Type-check + production build (minified)
npm run lint         # ESLint
```

No automated tests exist. Testing is manual: copy `main.js` and `manifest.json` to `<Vault>/.obsidian/plugins/link-title-fixer/`, reload Obsidian, enable the plugin.

## Architecture

- **`src/main.ts`** — Plugin lifecycle only. Extends `Plugin`, registers an `editor-paste` event that delegates to `PasteHandler`.
- **`src/paste.ts`** — All business logic. `PasteHandler` validates URLs, inserts a `[Fetching title...](url)` placeholder, fetches the page title via `requestUrl`, and replaces the placeholder with `[Title](url)`. Falls back to `[url](url)` on error.
- **`esbuild.config.mjs`** — Bundles `src/main.ts` → `main.js` (CJS, ES2018 target). Obsidian/electron/CodeMirror are externals.

## Key Conventions

- Keep `main.ts` minimal (lifecycle only); feature logic goes in separate modules.
- Uses Obsidian's `requestUrl` for network requests (not `fetch`).
- Strict TypeScript (`"strict": true`). Tab indentation (4-char), LF line endings.
- `manifest.json` `id` must never change. Version tags have no `v` prefix.
- `main.js` is committed (it's the release artifact Obsidian loads).
