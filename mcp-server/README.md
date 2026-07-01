# Inkgest MCP server

Stdio MCP server for **Claude Desktop** and **Claude Code**. Talks to your Inkgest account over HTTPS (`/api/mcp/*`).

## API key (required)

Create a key at [inkgest.com/settings/integrations](https://inkgest.com/settings/integrations), then set:

```env
INKGEST_API_KEY=ink_your_key_here
```

For production use `INKGEST_API_URL=https://inkgest.com` (default in `.mcp.json`).

## Install dependencies

From the repo root:

```bash
yarn mcp:install
```

Or inside this folder:

```bash
npm install
```

## Claude Code — marketplace (recommended)

Add the Inkgest marketplace, then install the plugin:

```text
/plugin marketplace add shreyvijayvargiya/Inkgest
/plugin install inkgest-mcp@inkgest
```

After install, set `INKGEST_API_KEY` in your Claude MCP / plugin env settings.

## Claude Desktop — manual config

See `claude-desktop.config.example.json`. Use an **absolute path** to `index.js` and your API key.

## Tools

- Library: search, list, read, create, update drafts
- Tasks: list/create/update/delete writing board tasks; list projects
- Translate: fetch source markdown and save translations
