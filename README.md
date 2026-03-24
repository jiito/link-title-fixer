# Link Title Fixer

Shows a Google Docs-style tooltip when you paste a bare URL in Obsidian, then lets you replace that URL with the page title.

When you paste a single `http` or `https` URL into the editor, the plugin:

- inserts the raw URL immediately
- fetches the page title in the background
- anchors a small tooltip to that pasted link
- lets you replace the URL with `[Page title](url)` or keep the raw URL

![Demo](<Screen Recording 2026-03-04 at 10.13.36 PM.gif>)

## Quick start

- `cd .obsidian/plugins`
- `git clone git@github.com:jiito/link-title-fixer.git`