## Your writing library, inside Claude

You already use Inkgest to turn links into newsletters, blogs, and tables. Now you can bring that same library into **Claude Desktop** and **Claude Code** — search drafts, edit markdown, track tasks on your board, and save translations — without switching tabs.

We call it the **Inkgest MCP server**. MCP (Model Context Protocol) is the open standard that lets AI assistants call tools on your behalf. Inkgest's MCP server connects Claude to your account over a secure API key.

Think of it as a bridge:

- **Claude** — where you brainstorm, research, and rewrite
- **Inkgest** — where your drafts, tables, and writing tasks live
- **MCP** — the wire between them

---

## What you can do with it

Once connected, Claude gets **12 tools** that talk to your Inkgest account:

### Library (drafts & tables)

| Tool | What it does |
| ---- | ------------ |
| `inkgest_search_docs` | Fuzzy search your drafts and tables by title or preview |
| `inkgest_list_docs` | List recent items in your library |
| `inkgest_read_doc` | Read full content of one draft or table |
| `inkgest_create_doc` | Create a new markdown draft |
| `inkgest_update_doc` | Update title, body, or notes on a draft |

### Writing tasks board

| Tool | What it does |
| ---- | ------------ |
| `inkgest_list_projects` | List canvas projects on your tasks board |
| `inkgest_list_tasks` | List Kanban tasks (filter by status or project) |
| `inkgest_get_task` | Open one task by id |
| `inkgest_create_task` | Add a new task to backlog, in progress, or done |
| `inkgest_update_task` | Move columns, change priority, link a draft |
| `inkgest_delete_task` | Remove a task |

### Translations

| Tool | What it does |
| ---- | ------------ |
| `inkgest_translate_doc` | Fetch a draft for translation, then save Claude's translation back to Inkgest |

**Example prompts you can try in Claude:**

- *"Search my Inkgest library for anything about AI newsletters."*
- *"Create a new draft called 'Weekly roundup' with this outline…"*
- *"Add a high-priority task: finish the Substack intro draft."*
- *"Read my latest newsletter draft and tighten the opening paragraph, then update it in Inkgest."*
- *"Translate my blog draft to Spanish and save it in Inkgest."*

---

## How it works (two parts)

Inkgest MCP is split into two layers — both are included when you use Inkgest:

1. **API on Inkgest (cloud)** — `/api/mcp/*` routes on [inkgest.com](https://inkgest.com). These run on our servers, authenticate your API key, and read/write your Firestore library.

2. **MCP server on your machine** — a small Node process (`mcp-server/index.js`) that Claude Desktop starts locally. It forwards tool calls to the Inkgest API. Claude talks to this process over stdio; the process talks to Inkgest over HTTPS.

You do **not** install anything on Vercel or run a separate cloud MCP host. Deploy Inkgest as usual; connect Claude from your laptop.

---

## Connect in five minutes

### Step 1 — Create an API key

1. Sign in to [Inkgest](https://inkgest.com).
2. Open **Settings → Integrations → Claude MCP** ([/settings/integrations](https://inkgest.com/settings/integrations)).
3. Click **Create key**, copy it once (it starts with `ink_`), and store it somewhere safe.

Keys are stored hashed — we never show the full secret again after creation.

### Step 2 — Install MCP dependencies

From the Inkgest repo (or your local clone):

```bash
yarn mcp:install
```

This installs the MCP SDK inside `mcp-server/`.

### Step 3 — Add Claude Desktop config

Open Claude Desktop → **Settings → Developer → Edit Config** and add:

```json
{
  "mcpServers": {
    "inkgest": {
      "command": "node",
      "args": ["/absolute/path/to/Inkgest/mcp-server/index.js"],
      "env": {
        "INKGEST_API_URL": "https://inkgest.com",
        "INKGEST_API_KEY": "ink_PASTE_YOUR_KEY_HERE"
      }
    }
  }
}
```

Replace:

- `/absolute/path/to/Inkgest/` — full path to your clone on disk
- `ink_PASTE_YOUR_KEY_HERE` — the key from Step 1

For local development, set `INKGEST_API_URL` to `http://localhost:3000` instead.

Restart Claude Desktop. You should see **inkgest** listed under MCP servers with all tools available.

### Step 4 — Verify

In Claude, ask:

> *List my recent Inkgest docs.*

If you get JSON back with your library (or an empty list for a new account), you're connected.

---

## Security & privacy

- Every MCP request uses `Authorization: Bearer <your key>`.
- Keys map to **your** Firebase user — Claude only sees **your** drafts and tasks.
- Revoke any key instantly from Settings → Integrations.
- Invocation logs (tool name, status, duration) appear in the same Integrations panel so you can audit what Claude did.

Treat your MCP key like a password. Do not commit it to git or paste it into public configs.

---

## Claude Code

The same MCP server works with **Claude Code** (CLI). Point your MCP config at the same `mcp-server/index.js` path and env vars. Your terminal agent gets the same Inkgest tools as Claude Desktop.

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `INKGEST_API_KEY is not set` | Add the key to Claude's MCP `env` block and restart Claude |
| `Invalid MCP API key` | Create a new key in Settings; old keys may be revoked |
| `Dependencies missing` | Run `yarn mcp:install` from the project root |
| Empty library | Normal for new accounts — try `inkgest_create_doc` first |
| MCP keys UI shows "Admin not configured" | Server needs Firebase Admin env on production (team ops) |

---

## What's next

The MCP launch covers **library + tasks + translations**. On the roadmap: URL scrape, AI generate, and agent runs directly from Claude — the same superpowers you get inside the Inkgest app.

For now: open Claude, connect Inkgest, and keep your entire writing workflow in one conversation.

**[Create your MCP key →](https://inkgest.com/settings/integrations)**  
**[Open Inkgest →](https://inkgest.com)**
