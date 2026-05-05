import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { inkgestAgentRequestHeaders } from "../config/agent";
import {
	createDraft,
	createTable,
	createInfographicsAsset,
} from "../api/userAssets";

const API_BASE = "https://api.buildsaas.dev";

/** @param {string} text */
export function parseUrls(text) {
	return text
		.split(/[\n,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

async function fetchJson(userId, path, body) {
	const res = await fetch(`${API_BASE}${path}`, {
		method: "POST",
		headers: inkgestAgentRequestHeaders(userId),
		body: JSON.stringify(body),
	});
	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = { _raw: text };
	}
	if (!res.ok) {
		const msg = data.error || data.message || text || `HTTP ${res.status}`;
		throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
	}
	return data;
}

async function fetchImageToCode(userId, file) {
	const fd = new FormData();
	fd.append("image", file);
	const headers = {};
	if (userId != null && String(userId).trim() !== "") {
		headers.Authorization = String(userId);
	}
	const res = await fetch(`${API_BASE}/image-to-code`, {
		method: "POST",
		headers,
		body: fd,
	});
	const text = await res.text();
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = { _raw: text };
	}
	if (!res.ok) {
		const msg = data.error || data.message || text || `HTTP ${res.status}`;
		throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
	}
	return data;
}

function extractDraftBody(data) {
	if (typeof data === "string") return data;
	if (data.markdown) return data.markdown;
	if (typeof data.content === "string") return data.content;
	if (data.body != null)
		return typeof data.body === "string"
			? data.body
			: JSON.stringify(data.body, null, 2);
	if (data.code != null)
		return typeof data.code === "string"
			? data.code
			: JSON.stringify(data.code, null, 2);
	if (data.data != null && typeof data.data === "object") {
		const inner = extractDraftBody(data.data);
		if (inner !== JSON.stringify(data.data, null, 2)) return inner;
	}
	return JSON.stringify(data, null, 2);
}

/** @returns {Promise<string>} new asset id */
async function saveSimpleBuilderResult(
	userId,
	queryClient,
	label,
	data,
	urls,
	prompt,
) {
	const now = new Date().toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});

	let infographics =
		data.infographics ?? data.data?.infographics ?? data.result?.infographics;
	if (!Array.isArray(infographics) && typeof data.result === "string") {
		try {
			const parsed = JSON.parse(data.result);
			if (Array.isArray(parsed)) infographics = parsed;
			else if (Array.isArray(parsed?.infographics))
				infographics = parsed.infographics;
		} catch {
			/* ignore */
		}
	}

	if (Array.isArray(infographics) && infographics.length > 0) {
		const { id } = await createInfographicsAsset(userId, {
			title: `${label}`,
			description: "",
			prompt: prompt || "",
			infographics,
			sourceUrls: urls,
		});
		await queryClient.invalidateQueries({ queryKey: ["assets", userId] });
		return id;
	}

	const columns = data.columns ?? data.data?.columns ?? data.result?.columns;
	const rows = data.rows ?? data.data?.rows ?? data.result?.rows;
	if (Array.isArray(columns) && columns.length > 0 && Array.isArray(rows)) {
		const { id } = await createTable(userId, {
			title: data.title ?? label,
			description: data.description ?? "",
			columns,
			rows,
			sourceUrls: urls,
			prompt: prompt || "",
		});
		await queryClient.invalidateQueries({ queryKey: ["assets", userId] });
		return id;
	}

	const body = extractDraftBody(data);
	const title = (typeof data.title === "string" && data.title.trim()) || label;
	const words = body.trim().split(/\s+/).filter(Boolean).length;
	const { id } = await createDraft(userId, {
		title,
		preview: body.slice(0, 180) + (body.length > 180 ? "…" : ""),
		body,
		urls,
		prompt: prompt || "",
		words,
		date: now,
		tag: "Simple builder",
		format: "substack",
	});
	await queryClient.invalidateQueries({ queryKey: ["assets", userId] });
	return id;
}

/** @typedef {{ id: string, label: string, title: string, kind: 'json' | 'image', path?: string, needsPrompt?: boolean, needsUrls?: boolean, buildBody?: (urls: string[], prompt: string) => object }} BuilderAction */

/** @type {BuilderAction[]} */
const BUILDER_ACTIONS = [
	{
		id: "urlToCode",
		label: "URL → code",
		title: "URL → code",
		kind: "json",
		path: "/url-to-code",
		needsPrompt: false,
		needsUrls: true,
		buildBody: (urls) => ({ urls, url: urls[0] }),
	},
	{
		id: "imageToCode",
		label: "Image → code",
		title: "Image → code",
		kind: "image",
		needsPrompt: false,
		needsUrls: false,
	},
	{
		id: "blog",
		label: "Blog",
		title: "URLs + prompt → blog",
		kind: "json",
		path: "/url-prompt-to-blog",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
	{
		id: "email",
		label: "Email",
		title: "URLs + prompt → email",
		kind: "json",
		path: "/url-prompt-to-email",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		title: "URLs + prompt → LinkedIn",
		kind: "json",
		path: "/url-prompt-to-linkedin",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
	{
		id: "x",
		label: "X",
		title: "URLs + prompt → X",
		kind: "json",
		path: "/url-prompt-to-x",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
	{
		id: "substack",
		label: "Substack",
		title: "URLs + prompt → Substack",
		kind: "json",
		path: "/url-prompt-to-substack",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
	{
		id: "infographics",
		label: "Infographics",
		title: "URLs + prompt → infographics",
		kind: "json",
		path: "/url-prompt-to-infographics",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
	{
		id: "table",
		label: "Table",
		title: "URLs + prompt → table",
		kind: "json",
		path: "/url-prompt-to-table",
		needsPrompt: true,
		needsUrls: true,
		buildBody: (urls, prompt) => ({ urls, prompt }),
	},
];

/**
 * Plain forms that call api.buildsaas.dev; results are saved like InkAgent assets.
 * @param {{ userId?: string, theme: Record<string, string>, onLoginRequired?: () => void }} props
 */
export default function SimpleBuilderTab({
	userId,
	theme: T,
	onLoginRequired,
}) {
	const queryClient = useQueryClient();
	const [urlsText, setUrlsText] = useState("");
	const [prompt, setPrompt] = useState("");
	const [imageFile, setImageFile] = useState(null);
	/** Which action button is hovered/focused — drives which inputs are shown */
	const [focusActionId, setFocusActionId] = useState(null);

	const [lastJson, setLastJson] = useState(null);
	const [savedAssetId, setSavedAssetId] = useState(null);
	const [lastActionLabel, setLastActionLabel] = useState(null);

	const focused = focusActionId
		? BUILDER_ACTIONS.find((a) => a.id === focusActionId)
		: null;

	/** Default (idle): URLs + prompt only. Hover/focus refines what’s shown. */
	const showUrls =
		focused == null || (focused.kind === "json" && focused.needsUrls !== false);
	const showPrompt = focused == null || focused.needsPrompt === true;
	const showImage = focused != null && focused.kind === "image";

	const mutation = useMutation({
		mutationFn: async (/** @type {BuilderAction} */ action) => {
			if (!userId) throw new Error("Sign in to run requests.");
			if (action.kind === "image") {
				if (!imageFile) throw new Error("Choose an image file.");
				return fetchImageToCode(userId, imageFile);
			}
			const urls = parseUrls(urlsText);
			if (action.needsUrls && urls.length === 0)
				throw new Error("Add at least one URL.");
			if (action.needsPrompt && !prompt.trim())
				throw new Error("Add a prompt.");
			const body = action.buildBody(urls, prompt.trim());
			return fetchJson(userId, action.path, body);
		},
		onSuccess: async (data, action) => {
			setLastJson(data);
			setLastActionLabel(action.title);
			const urls = action.kind === "image" ? [] : parseUrls(urlsText);
			const id = await saveSimpleBuilderResult(
				userId,
				queryClient,
				action.title,
				data,
				urls,
				prompt.trim(),
			);
			setSavedAssetId(id);
		},
	});

	const run = (action) => {
		if (!userId) {
			onLoginRequired?.();
			return;
		}
		mutation.mutate(action);
	};

	const inputDisabled = mutation.isPending;
	const hint =
		focused == null
			? "Add URLs and a prompt, then pick an action. Hover Image → code for image upload only."
			: focused.kind === "image"
				? "Image → code: choose a file, then click the button again to run."
				: focused.needsPrompt
					? `${focused.label}: needs URLs + prompt.`
					: `${focused.label}: URLs only (no prompt).`;

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 0,
				marginBottom: 24,
				width: "100%",
			}}
		>
			<div
				style={{
					border: `1.5px solid ${T.border}`,
					borderRadius: 12,
					padding: 16,
					marginBottom: 16,
					background: T.surface,
				}}
			>
				<p
					style={{
						fontSize: 12,
						color: T.muted,
						marginBottom: 14,
						lineHeight: 1.45,
					}}
				>
					{hint}
				</p>

				{showUrls && (
					<div style={{ marginBottom: showPrompt || showImage ? 12 : 0 }}>
						<label
							style={{
								display: "block",
								fontSize: 11,
								fontWeight: 700,
								textTransform: "",
								letterSpacing: "0.06em",
								color: T.muted,
								marginBottom: 6,
							}}
						>
							URLs
						</label>
						<textarea
							value={urlsText}
							onChange={(e) => setUrlsText(e.target.value)}
							placeholder={"https://example.com\nhttps://another.com"}
							rows={3}
							disabled={inputDisabled}
							style={{
								width: "100%",
								resize: "vertical",
								background: T.base,
								border: `1.5px solid ${T.border}`,
								borderRadius: 10,
								padding: "10px 12px",
								fontSize: 13,
								color: T.accent,
							}}
						/>
					</div>
				)}

				{showPrompt && (
					<div style={{ marginBottom: showImage ? 12 : 0 }}>
						<label
							style={{
								display: "block",
								fontSize: 11,
								fontWeight: 700,
								textTransform: "",
								letterSpacing: "0.06em",
								color: T.muted,
								marginBottom: 6,
							}}
						>
							Prompt
						</label>
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="What should the model produce?"
							rows={4}
							disabled={inputDisabled}
							style={{
								width: "100%",
								resize: "vertical",
								background: T.base,
								border: `1.5px solid ${T.border}`,
								borderRadius: 10,
								padding: "10px 12px",
								fontSize: 13,
								color: T.accent,
							}}
						/>
					</div>
				)}

				{showImage && (
					<div>
						<label
							style={{
								display: "block",
								fontSize: 11,
								fontWeight: 700,
								textTransform: "",
								letterSpacing: "0.06em",
								color: T.muted,
								marginBottom: 6,
							}}
						>
							Image file
						</label>
						<input
							type="file"
							accept="image/*"
							disabled={inputDisabled}
							onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
							style={{ fontSize: 13 }}
						/>
					</div>
				)}
			</div>

			<p
				style={{
					fontSize: 11,
					fontWeight: 700,
					textTransform: "",
					letterSpacing: "0.08em",
					color: T.muted,
					marginBottom: 10,
				}}
			>
				Generate & save
			</p>
			<div
				role="group"
				aria-label="Simple builder actions"
				onMouseLeave={() => setFocusActionId(null)}
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: 8,
				}}
			>
				{BUILDER_ACTIONS.map((action) => {
					const isRunning =
						mutation.isPending && mutation.variables?.id === action.id;
					return (
						<motion.button
							key={action.id}
							type="button"
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onMouseEnter={() => setFocusActionId(action.id)}
							onFocus={() => setFocusActionId(action.id)}
							onBlur={(e) => {
								if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
									setFocusActionId(null);
								}
							}}
							disabled={mutation.isPending}
							onClick={() => run(action)}
							title={action.title}
							style={{
								padding: "10px 14px",
								borderRadius: 10,
								border: `1.5px solid ${
									focusActionId === action.id ? T.accent : T.border
								}`,
								background: focusActionId === action.id ? T.base : T.surface,
								color: T.accent,
								fontWeight: 700,
								fontSize: 13,
								cursor: mutation.isPending ? "not-allowed" : "pointer",
								opacity: mutation.isPending && !isRunning ? 0.55 : 1,
							}}
						>
							{isRunning ? "…" : action.label}
						</motion.button>
					);
				})}
			</div>

			{mutation.isError && (
				<p style={{ marginTop: 12, fontSize: 12, color: "#B91C1C" }}>
					{mutation.error?.message || "Request failed"}
				</p>
			)}
			{savedAssetId && !mutation.isPending && (
				<p style={{ marginTop: 10, fontSize: 13 }}>
					<Link
						href={`/app/${savedAssetId}`}
						style={{ color: T.accent, fontWeight: 700 }}
					>
						Open saved asset →
					</Link>
					{lastActionLabel && (
						<span style={{ color: T.muted, fontWeight: 500 }}>
							{" "}
							({lastActionLabel})
						</span>
					)}
				</p>
			)}
			{lastJson != null && !mutation.isPending && (
				<details style={{ marginTop: 12 }} open>
					<summary
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: T.muted,
							cursor: "pointer",
						}}
					>
						Last response (JSON)
					</summary>
					<pre
						style={{
							marginTop: 8,
							padding: 12,
							borderRadius: 8,
							background: T.base,
							border: `1px solid ${T.border}`,
							fontSize: 11,
							overflow: "auto",
							maxHeight: 280,
							color: T.accent,
						}}
					>
						{JSON.stringify(lastJson, null, 2)}
					</pre>
				</details>
			)}
		</motion.div>
	);
}
