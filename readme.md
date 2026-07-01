# Inkgest

AI-powered content drafting tool from one LINK. Paste URLs, get a structured newsletter, blog, tweets, posts, infographics and more, edit it in the browser, and save it to your account.

## Stack

- **Next.js** — framework
- **Firebase** — auth + Firestore database
- **Redux** — user session state
- **React Query** — server state / data fetching
- **Firecrawl** — URL scraping
- **OpenRouter** — AI draft generation
- **Polar** — payments / subscriptions
- **PostHog** — analytics

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd inkgest
npm install
```

### 2. Create `.env.local`

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=


# App URL
NEXT_PUBLIC_DOMAIN=http://localhost:3000

# AI & scraping
OPENROUTER_API_KEY=
FIRECRAWL_API_KEY=

```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## MCP (Claude Desktop)

Server-side API + stdio MCP server so Claude can **search, read, create, and update** your Inkgest drafts and **manage your writing tasks board**.

### Server env (`.env.local` or Vercel)

```env
# Firebase Admin — service account JSON (string) or base64
FIREBASE_SERVICE_ACCOUNT_JSON=
# or FIREBASE_SERVICE_ACCOUNT_BASE64=

# MCP API keys → Firebase UID map
MCP_API_KEYS={"ink_your_secret_key":"YOUR_FIREBASE_UID"}

# Or single dev key:
# MCP_API_KEY=ink_dev_xxx
# MCP_USER_UID=YOUR_FIREBASE_UID
```

Generate a key: `node -e "console.log('ink_'+require('crypto').randomBytes(24).toString('hex'))"`

### User API keys (Settings UI)

Users can create keys at **Settings → Integrations → Claude MCP** (`/settings/integrations`).
Keys are stored hashed in Firestore (`mcp_api_keys` + `users/{uid}/mcpKeys`).

Env-based keys (`MCP_API_KEYS`) still work for dev/ops.

### Install MCP server deps

```bash
yarn mcp:install
```

### Claude Code marketplace

This repo includes `.claude-plugin/marketplace.json` for Claude Code:

```text
/plugin marketplace add shreyvijayvargiya/Inkgest
/plugin install inkgest-mcp@inkgest
```

Then set `INKGEST_API_KEY` (from Settings → Integrations) in Claude MCP env. Run `yarn mcp:install` once for Node dependencies.

### Claude Desktop config

Copy `mcp-server/claude-desktop.config.example.json` into Claude Desktop MCP settings. Set:

- `INKGEST_API_URL` — `http://localhost:3000` or your production URL
- `INKGEST_API_KEY` — same key as in `MCP_API_KEYS`

### Tools exposed to Claude

| Tool | Action |
|------|--------|
| `inkgest_search_docs` | Fuzzy search drafts/tables |
| `inkgest_list_docs` | List recent docs |
| `inkgest_read_doc` | Read one doc by id |
| `inkgest_create_doc` | Create markdown draft |
| `inkgest_update_doc` | Update draft title/body |

### API routes (for testing)

- `POST /api/mcp/search` — `{ "query": "..." }`
- `GET /api/mcp/docs` — list
- `POST /api/mcp/docs` — `{ "title", "bodyMarkdown" }`
- `GET /api/mcp/docs/:id` — read
- `PATCH /api/mcp/docs/:id` — update
- `GET /api/mcp/tasks` — list tasks (`?status=backlog|in-progress|done&project_id=<id|unassigned>`)
- `GET /api/mcp/projects` — list canvas projects (for task board project filter)
- `POST /api/mcp/tasks` — create task
- `GET /api/mcp/tasks/:id` — get task
- `PATCH /api/mcp/tasks/:id` — update task
- `DELETE /api/mcp/tasks/:id` — delete task
- `POST /api/mcp/translate` — fetch source markdown or save Claude translation (`{ doc_id, language, translated_markdown? }`)

All require header: `Authorization: Bearer <MCP_API_KEY>`

---

## Where to get each key

| Key        | Where                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| Firebase   | [console.firebase.google.com](https://console.firebase.google.com) → new project → Web app |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys)                                           |
| Firecrawl  | [firecrawl.dev](https://www.firecrawl.dev)                                                 |

---
