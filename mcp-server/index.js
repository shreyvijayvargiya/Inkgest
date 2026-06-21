#!/usr/bin/env node
/**
 * Inkgest MCP server — stdio transport for Claude Desktop / Claude Code.
 *
 * Env:
 *   INKGEST_API_URL — e.g. https://inkgest.com or http://localhost:3000
 *   INKGEST_API_KEY — MCP API key (from Settings → Integrations)
 */

import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

function fatal(message) {
	console.error(`[inkgest-mcp] ${message}`);
	process.exit(1);
}

process.on("unhandledRejection", (err) => {
	fatal(`Unhandled error: ${err?.stack || err?.message || err}`);
});

function validateStartup() {
	if (!existsSync(join(__dirname, "node_modules", "@modelcontextprotocol", "sdk"))) {
		fatal(
			"Dependencies missing. From the Inkgest project root run: yarn mcp:install",
		);
	}

	const apiKey = (
		process.env.INKGEST_API_KEY ||
		process.env.MCP_API_KEY ||
		""
	).trim();

	if (!apiKey) {
		fatal(
			"INKGEST_API_KEY is not set. Add it to your Claude MCP config env block (Settings → Integrations → copy your API key).",
		);
	}

	if (
		apiKey === "YOUR_MCP_API_KEY" ||
		apiKey === "ink_PASTE_YOUR_KEY_HERE" ||
		/PASTE|YOUR_/i.test(apiKey)
	) {
		fatal(
			"INKGEST_API_KEY is still a placeholder. Create a real key in Inkgest Settings → Integrations and paste it into Claude MCP config.",
		);
	}

	return apiKey;
}

const API_URL = (process.env.INKGEST_API_URL || "http://localhost:3000").replace(
	/\/$/,
	"",
);
const API_KEY = validateStartup();

async function api(path, { method = "GET", body } = {}) {
	const res = await fetch(`${API_URL}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			"Content-Type": "application/json",
		},
		body: body != null ? JSON.stringify(body) : undefined,
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data.error || `HTTP ${res.status}`);
	}
	return data;
}

function textResult(data) {
	return {
		content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
	};
}

try {
	const server = new McpServer({
		name: "inkgest",
		version: "1.0.0",
	});

	server.tool(
		"inkgest_search_docs",
		"Fuzzy search the user's Inkgest drafts and tables by title, preview, or description.",
		{
			query: z.string().describe("Search phrase, e.g. 'newsletter about AI'"),
			limit: z
				.number()
				.int()
				.min(1)
				.max(25)
				.optional()
				.describe("Max results (default 10)"),
		},
		async ({ query, limit }) =>
			textResult(
				await api("/api/mcp/search", { method: "POST", body: { query, limit } }),
			),
	);

	server.tool(
		"inkgest_list_docs",
		"List recent drafts and tables in the user's Inkgest library.",
		{
			limit: z
				.number()
				.int()
				.min(1)
				.max(50)
				.optional()
				.describe("Max items (default 20)"),
		},
		async ({ limit }) => {
			const q = limit != null ? `?limit=${limit}` : "";
			return textResult(await api(`/api/mcp/docs${q}`));
		},
	);

	server.tool(
		"inkgest_read_doc",
		"Read full content of one draft or table by id (from search/list results).",
		{
			doc_id: z.string().describe("Firestore asset document id"),
		},
		async ({ doc_id }) =>
			textResult(await api(`/api/mcp/docs/${encodeURIComponent(doc_id)}`)),
	);

	server.tool(
		"inkgest_create_doc",
		"Create a new markdown draft in the user's Inkgest library.",
		{
			title: z
				.string()
				.optional()
				.describe("Draft title (inferred from body if omitted)"),
			bodyMarkdown: z.string().describe("Full draft content in markdown"),
			prompt: z.string().optional().describe("Optional source prompt / notes"),
		},
		async ({ title, bodyMarkdown, prompt }) =>
			textResult(
				await api("/api/mcp/docs", {
					method: "POST",
					body: { title, bodyMarkdown, prompt },
				}),
			),
	);

	server.tool(
		"inkgest_update_doc",
		"Update an existing markdown draft (title and/or body).",
		{
			doc_id: z.string().describe("Firestore asset document id"),
			title: z.string().optional(),
			bodyMarkdown: z.string().optional(),
			prompt: z.string().optional(),
		},
		async ({ doc_id, title, bodyMarkdown, prompt }) =>
			textResult(
				await api(`/api/mcp/docs/${encodeURIComponent(doc_id)}`, {
					method: "PATCH",
					body: { title, bodyMarkdown, prompt },
				}),
			),
	);

	server.tool(
		"inkgest_list_projects",
		"List canvas projects on the tasks board. Use project ids with inkgest_list_tasks to filter by project.",
		{
			limit: z
				.number()
				.int()
				.min(1)
				.max(50)
				.optional()
				.describe("Max items (default 50)"),
		},
		async ({ limit }) => {
			const q = limit != null ? `?limit=${limit}` : "";
			return textResult(await api(`/api/mcp/projects${q}`));
		},
	);

	server.tool(
		"inkgest_list_tasks",
		"List tasks on the user's Inkgest writing tasks board (Kanban). Filter by status and/or project.",
		{
			limit: z
				.number()
				.int()
				.min(1)
				.max(50)
				.optional()
				.describe("Max items (default 20)"),
			status: z
				.enum(["backlog", "in-progress", "done"])
				.optional()
				.describe("Filter by column/status"),
			project_id: z
				.string()
				.optional()
				.describe(
					"Filter by project — id from inkgest_list_projects, or 'unassigned' for tasks with no project",
				),
		},
		async ({ limit, status, project_id }) => {
			const params = new URLSearchParams();
			if (limit != null) params.set("limit", String(limit));
			if (status) params.set("status", status);
			if (project_id) params.set("project_id", project_id);
			const q = params.toString() ? `?${params}` : "";
			return textResult(await api(`/api/mcp/tasks${q}`));
		},
	);

	server.tool(
		"inkgest_get_task",
		"Get one writing task by id (from list_tasks results).",
		{
			task_id: z.string().describe("Writing task id"),
		},
		async ({ task_id }) =>
			textResult(await api(`/api/mcp/tasks/${encodeURIComponent(task_id)}`)),
	);

	server.tool(
		"inkgest_create_task",
		"Create a new task on the writing tasks board.",
		{
			title: z.string().describe("Task title"),
			description: z.string().optional().describe("Task description"),
			status: z
				.enum(["backlog", "in-progress", "done"])
				.optional()
				.describe("Column (default backlog)"),
			priority: z.enum(["High", "Medium", "Low"]).optional(),
			projectId: z.string().optional().describe("Optional canvas project id"),
			draftId: z.string().optional().describe("Optional linked draft id"),
		},
		async ({ title, description, status, priority, projectId, draftId }) =>
			textResult(
				await api("/api/mcp/tasks", {
					method: "POST",
					body: { title, description, status, priority, projectId, draftId },
				}),
			),
	);

	server.tool(
		"inkgest_update_task",
		"Update a writing task (move columns, change title, link draft, etc.).",
		{
			task_id: z.string().describe("Writing task id"),
			title: z.string().optional(),
			description: z.string().optional(),
			status: z.enum(["backlog", "in-progress", "done"]).optional(),
			priority: z.enum(["High", "Medium", "Low"]).optional(),
			progress: z.number().int().min(0).max(100).optional(),
			projectId: z.string().optional().nullable(),
			draftId: z.string().optional().nullable(),
		},
		async ({ task_id, ...body }) =>
			textResult(
				await api(`/api/mcp/tasks/${encodeURIComponent(task_id)}`, {
					method: "PATCH",
					body,
				}),
			),
	);

	server.tool(
		"inkgest_delete_task",
		"Delete a task from the writing tasks board.",
		{
			task_id: z.string().describe("Writing task id"),
		},
		async ({ task_id }) =>
			textResult(
				await api(`/api/mcp/tasks/${encodeURIComponent(task_id)}`, {
					method: "DELETE",
				}),
			),
	);

	server.tool(
		"inkgest_translate_doc",
		"Translate a draft and save to Firestore. Claude performs the translation (not Inkgest LLM). Step 1: call with doc_id + language only to fetch source markdown. Step 2: translate it yourself. Step 3: call again with translated_markdown — the server auto-saves to the draft's translations field.",
		{
			doc_id: z.string().describe("Draft document id (from list_docs / read_doc)"),
			language: z
				.string()
				.describe("Target language — ISO code (es, fr, de) or name (spanish, french)"),
			translated_markdown: z
				.string()
				.optional()
				.describe(
					"Your translated markdown. Omit on the first call to fetch source; include on the second call to save.",
				),
		},
		async ({ doc_id, language, translated_markdown }) =>
			textResult(
				await api("/api/mcp/translate", {
					method: "POST",
					body: { doc_id, language, translated_markdown },
				}),
			),
	);

	const transport = new StdioServerTransport();
	await server.connect(transport);
} catch (err) {
	fatal(`Startup failed: ${err?.stack || err?.message || err}`);
}
