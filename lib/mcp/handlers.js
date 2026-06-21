import { searchAssetsWithFuse } from "../agent/searchUserAssetsWithFuse";
import { buildAgentDraftRecord } from "../agent/buildAgentDraftRecord";
import {
	listAssetsServer,
	getAssetServer,
	createDraftServer,
	updateAssetServer,
} from "../api/userAssetsServer";
import {
	listWritingTasksServer,
	getWritingTaskServer,
	createWritingTaskServer,
	updateWritingTaskServer,
	deleteWritingTaskServer,
} from "../api/writingTasksServer";
import { listCanvasProjectsServer } from "../api/canvasProjectsServer";
import { mergeDraftTranslations, listDraftTranslationLangs } from "../utils/draftTranslationStore";
import { markdownToHtmlServer } from "../utils/markdownToHtmlServer";
import {
	normalizeTranslationLangCode,
	isSourceLanguage,
	resolveTranslationLanguageLabel,
} from "../utils/translateLanguage";

const READ_BODY_MAX = 24_000;

export async function mcpSearchDocs(uid, query, limit = 10) {
	const assets = await listAssetsServer(uid);
	const hits = searchAssetsWithFuse(assets, query, Math.min(limit, 25));
	return {
		ok: true,
		count: hits.length,
		results: hits,
	};
}

export async function mcpReadDoc(uid, assetId) {
	const got = await getAssetServer(uid, assetId);
	if (!got) {
		return { ok: false, error: "Document not found" };
	}

	if (got.type === "draft") {
		const body = String(got.doc.body ?? "");
		return {
			ok: true,
			id: assetId,
			type: "draft",
			title: got.doc.title || "",
			preview: got.doc.preview || "",
			body: body.slice(0, READ_BODY_MAX),
			truncated: body.length > READ_BODY_MAX,
			source: got.source,
			path: `/app/${assetId}`,
		};
	}

	if (got.type === "table") {
		const rows = got.doc.rows || [];
		return {
			ok: true,
			id: assetId,
			type: "table",
			title: got.doc.title || "",
			description: got.doc.description || "",
			columns: got.doc.columns || [],
			rowCount: rows.length,
			rowsPreview: rows.slice(0, 20),
			source: got.source,
			path: `/app/${assetId}`,
		};
	}

	return {
		ok: true,
		id: assetId,
		type: got.type,
		title: got.doc.title || "",
		description: got.doc.description || "",
		source: got.source,
		path: `/app/${assetId}`,
	};
}

export async function mcpCreateDoc(uid, { title, bodyMarkdown, prompt = "" }) {
	const record = buildAgentDraftRecord({ title, bodyMarkdown, prompt });
	const { id } = await createDraftServer(uid, record);
	return {
		ok: true,
		id,
		title: record.title,
		path: `/app/${id}`,
	};
}

export async function mcpUpdateDoc(uid, assetId, { title, bodyMarkdown, prompt }) {
	const got = await getAssetServer(uid, assetId);
	if (!got) {
		return { ok: false, error: "Document not found" };
	}
	if (got.type !== "draft") {
		return { ok: false, error: "Only markdown drafts can be updated via MCP v1" };
	}

	const updates = {};
	if (title != null) updates.title = String(title).trim();
	if (bodyMarkdown != null) {
		const content = String(bodyMarkdown).trim();
		updates.body = content;
		const bodyText = content
			.split("\n")
			.filter((l) => !/^#{1,6}\s/.test(l.trim()))
			.join(" ")
			.replace(/[*_`]/g, "")
			.replace(/\s+/g, " ")
			.trim();
		updates.preview =
			bodyText.slice(0, 180) + (bodyText.length > 180 ? "…" : "");
		updates.words = content ? content.split(/\s+/).filter(Boolean).length : 0;
	}
	if (prompt != null) updates.prompt = String(prompt).trim();
	if (Object.keys(updates).length === 0) {
		return { ok: false, error: "No updates provided (title, bodyMarkdown, or prompt)" };
	}

	await updateAssetServer(uid, assetId, updates, got.source);
	return {
		ok: true,
		id: assetId,
		path: `/app/${assetId}`,
		updated: Object.keys(updates),
	};
}

export async function mcpListDocs(uid, limit = 20) {
	const assets = await listAssetsServer(uid);
	const drafts = assets
		.filter((a) => ["draft", "table"].includes(a?.type))
		.slice(0, Math.min(limit, 50))
		.map((a) => ({
			id: a.id,
			type: a.type,
			title: a.title || "(untitled)",
			preview: String(a.preview || a.description || "").slice(0, 160),
			date: a.date || "",
		}));
	return { ok: true, count: drafts.length, results: drafts };
}

export async function mcpListTasks(uid, { limit = 20, status, projectId } = {}) {
	const tasks = await listWritingTasksServer(uid, { limit, status, projectId });
	return {
		ok: true,
		count: tasks.length,
		projectId: projectId || null,
		results: tasks,
	};
}

export async function mcpListProjects(uid, { limit = 50 } = {}) {
	const projects = await listCanvasProjectsServer(uid);
	const cap = Math.min(Math.max(limit, 1), 100);
	const results = projects.slice(0, cap).map((p) => ({
		id: p.id,
		name: p.name,
		assetCount: p.assetCount,
	}));
	return { ok: true, count: results.length, results };
}

export async function mcpGetTask(uid, taskId) {
	const task = await getWritingTaskServer(uid, taskId);
	if (!task) return { ok: false, error: "Task not found" };
	return { ok: true, task };
}

export async function mcpCreateTask(uid, data) {
	if (!data?.title || typeof data.title !== "string" || !data.title.trim()) {
		return { ok: false, error: "title (string) is required" };
	}
	return createWritingTaskServer(uid, data);
}

export async function mcpUpdateTask(uid, taskId, updates) {
	return updateWritingTaskServer(uid, taskId, updates);
}

export async function mcpDeleteTask(uid, taskId) {
	return deleteWritingTaskServer(uid, taskId);
}

/**
 * Translate workflow for Claude MCP:
 * 1. Call without translatedMarkdown → returns source markdown to translate in Claude.
 * 2. Call with translatedMarkdown → saves to draft.translations[lang] in Firestore.
 */
export async function mcpTranslateDoc(uid, { docId, language, translatedMarkdown }) {
	const langCode = normalizeTranslationLangCode(language);
	if (!langCode || isSourceLanguage(langCode)) {
		return {
			ok: false,
			error: "Invalid or source language. Use a target like es, fr, spanish, french.",
		};
	}

	const got = await getAssetServer(uid, docId);
	if (!got) return { ok: false, error: "Document not found" };
	if (got.type !== "draft") {
		return { ok: false, error: "Only markdown drafts support translations" };
	}

	const savedLanguages = listDraftTranslationLangs(got.doc);

	if (!translatedMarkdown || !String(translatedMarkdown).trim()) {
		const sourceMarkdown = String(got.doc.body ?? "").trim();
		if (!sourceMarkdown) {
			return { ok: false, error: "Draft has no content to translate" };
		}
		return {
			ok: true,
			mode: "fetch_source",
			doc_id: docId,
			title: got.doc.title || "",
			language: langCode,
			languageLabel: resolveTranslationLanguageLabel(langCode),
			sourceMarkdown,
			savedLanguages,
			path: `/app/${docId}`,
			instructions:
				"Translate sourceMarkdown to the target language in Claude, then call inkgest_translate_doc again with translated_markdown to save.",
		};
	}

	const markdown = String(translatedMarkdown).trim();
	const html = markdownToHtmlServer(markdown);
	const translations = mergeDraftTranslations(got.doc.translations, langCode, {
		html,
		markdown,
	});

	await updateAssetServer(uid, docId, { translations }, got.source);

	return {
		ok: true,
		mode: "saved",
		doc_id: docId,
		language: langCode,
		languageLabel: resolveTranslationLanguageLabel(langCode),
		savedLanguages: listDraftTranslationLangs({ translations }),
		path: `/app/${docId}`,
	};
}
