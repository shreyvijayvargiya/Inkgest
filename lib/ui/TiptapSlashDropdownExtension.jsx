import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { TiptapSlashDatePicker, formatInkDateLong } from "./TiptapSlashDatePicker.jsx";
import {
	inkInsertToggleBlock,
	inkFocusTaskItemText,
} from "./TiptapInkBlockFixes";

export const SlashDropdownPluginKey = new PluginKey("tiptap-slash-dropdown");

const INACTIVE = { active: false, range: null, query: "", kind: "slash" };

function getTextblockContext($from) {
	let depth = $from.depth;
	while (depth > 0 && !$from.node(depth).isTextblock) {
		depth -= 1;
	}
	if (depth === 0) return null;
	const parent = $from.node(depth);
	const blockStart = $from.start(depth);
	const blockEnd = $from.end(depth);
	return { depth, parent, blockStart, blockEnd };
}

/** Selection types that must not drive / or @ triggers (avoid `instanceof` — breaks with duplicate PM bundles). */
const TRIGGER_BLOCK_SELECTION_TYPES = new Set(["gapcursor", "node", "cell"]);

function isTriggerSelection(selection) {
	if (!selection || !selection.empty) return false;
	try {
		const t = selection.toJSON?.()?.type;
		if (t && TRIGGER_BLOCK_SELECTION_TYPES.has(t)) return false;
		return true;
	} catch {
		return false;
	}
}

function findSlashMatch(state) {
	const { selection } = state;
	if (!isTriggerSelection(selection)) return null;

	const { $from } = selection;
	if (!$from) return null;

	const ctx = getTextblockContext($from);
	if (!ctx) return null;

	const { parent, blockStart } = ctx;
	const parentType = parent.type?.name;
	if (
		parentType === "codeBlock" ||
		parentType === "codeGroup" ||
		parentType === "table"
	) {
		return null;
	}

	const textBefore = state.doc.textBetween(blockStart, $from.pos, "\n", "\0");

	const tail = textBefore.match(/\/([^\s]*)$/);
	if (!tail) return null;
	const slashIdx = textBefore.length - tail[0].length;
	const prevCh = slashIdx > 0 ? textBefore.charAt(slashIdx - 1) : "";
	const okSlash =
		slashIdx === 0 ||
		/\s/.test(prevCh) ||
		!/\w/.test(prevCh);
	if (!okSlash) return null;

	const query = tail[1] || "";
	const to = selection.from;
	let from = to - (query.length + 1);

	if (from < blockStart) from = blockStart;
	if (from >= to) return null;

	return { from, to, query, kind: "slash" };
}

/** @today, @to, @, etc. — only when completing the word "today". */
function findAtTodayMatch(state) {
	const { selection } = state;
	if (!isTriggerSelection(selection)) return null;

	const { $from } = selection;
	if (!$from) return null;

	const ctx = getTextblockContext($from);
	if (!ctx) return null;

	const { parent, blockStart } = ctx;
	const parentType = parent.type?.name;
	if (
		parentType === "codeBlock" ||
		parentType === "codeGroup" ||
		parentType === "table"
	) {
		return null;
	}

	const textBefore = state.doc.textBetween(blockStart, $from.pos, "\n", "\0");
	// ASCII @ and fullwidth ＠ (common on some keyboards / IME)
	const tail = textBefore.match(/(?:@|\uFF20)([^\s]*)$/);
	if (!tail) return null;
	const atIdx = textBefore.length - tail[0].length;
	// Start of block, or not immediately after a word char (avoid email-ish "user@")
	const prev = atIdx > 0 ? textBefore.charAt(atIdx - 1) : "";
	const okAt =
		atIdx === 0 || /\s/.test(prev) || !/\w/.test(prev);
	if (!okAt) return null;

	const rawQ = tail[1] || "";
	const query = rawQ.toLowerCase();
	if (query !== "") {
		const okToday = "today".startsWith(query);
		const okDate = "date".startsWith(query);
		if (!okToday && !okDate) return null;
	}

	const to = selection.from;
	const from = to - tail[0].length;
	if (from < blockStart) return null;
	if (from >= to) return null;

	return { from, to, query: rawQ, kind: "atdate" };
}

function findTriggerMatch(state) {
	// Prefer @-date so paths/URLs ending in `/…@` don’t hijack with a fake “slash” match.
	return findAtTodayMatch(state) || findSlashMatch(state);
}

/** Insert long-form date; inline spacing if the line already has text before the trigger. */
export function insertTiptapDateWithContext(editor, date, rangeToDelete) {
	const formatted = formatInkDateLong(date);
	let hasTextBefore = false;
	const ch = editor.chain().focus();

	if (
		rangeToDelete?.from != null &&
		rangeToDelete?.to != null &&
		rangeToDelete.from < rangeToDelete.to
	) {
		const { state } = editor;
		const $pos = state.doc.resolve(rangeToDelete.from);
		let depth = $pos.depth;
		while (depth > 0 && !$pos.node(depth).isTextblock) depth--;
		const blockStart = $pos.start(depth);
		const beforeTrigger = state.doc.textBetween(
			blockStart,
			rangeToDelete.from,
			"\0",
			"\0",
		);
		hasTextBefore = beforeTrigger.replace(/\s/g, "").length > 0;
		ch.deleteRange(rangeToDelete);
	}

	const spacer = hasTextBefore ? " " : "";
	ch.insertContent(`${spacer}${formatted} `).run();
}

/** After /date deleted trigger; cursor is at insertion point. */
export function insertTiptapDateAtCursor(editor, date) {
	const formatted = formatInkDateLong(date);
	const { state } = editor;
	const pos = state.selection.from;
	const $pos = state.doc.resolve(pos);
	let depth = $pos.depth;
	while (depth > 0 && !$pos.node(depth).isTextblock) depth--;
	const blockStart = $pos.start(depth);
	const before = state.doc.textBetween(blockStart, pos, "\0", "\0");
	const hasTextBefore = before.replace(/\s/g, "").length > 0;
	const spacer = hasTextBefore ? " " : "";
	editor.chain().focus().insertContent(`${spacer}${formatted} `).run();
}

export const TiptapSlashDropdownExtension = Extension.create({
	name: "slashDropdown",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: SlashDropdownPluginKey,
				state: {
					init: () => ({ ...INACTIVE }),
					apply: (tr, prev, _oldState, newState) => {
						const meta = tr.getMeta(SlashDropdownPluginKey);
						if (meta?.type === "close") {
							return { ...INACTIVE };
						}

						const match = findTriggerMatch(newState);
						if (!match) {
							return { ...INACTIVE };
						}

						return {
							active: true,
							range: { from: match.from, to: match.to },
							query: match.query,
							kind: match.kind,
						};
					},
				},
				props: {
					handleKeyDown: (view, event) => {
						const pluginState = SlashDropdownPluginKey.getState(view.state);
						if (!pluginState?.active) return false;

						if (event.key === "Escape") {
							const tr = view.state.tr.setMeta(SlashDropdownPluginKey, {
								type: "close",
							});
							view.dispatch(tr);
							return true;
						}

						return false;
					},
				},
			}),
		];
	},
});

export function getSlashDropdownState(editor) {
	if (!editor?.view) return { ...INACTIVE };
	return (
		SlashDropdownPluginKey.getState(editor.view.state) || {
			...INACTIVE,
		}
	);
}

/** Delete `/query` range; if the text block is empty afterward, remove it (no extra blank line). */
export function applySlashTriggerDelete(editor, range) {
	if (!editor?.view) return;
	let { state } = editor;
	let tr = state.tr;
	const from = range?.from ?? state.selection.from;
	const to = range?.to ?? state.selection.to;
	if (typeof from === "number" && typeof to === "number" && from < to) {
		tr = tr.delete(from, to);
	}
	let $from = tr.doc.resolve(tr.selection.from);
	let depth = $from.depth;
	while (depth > 0 && !$from.node(depth).isTextblock) depth -= 1;
	if (depth > 0) {
		const block = $from.node(depth);
		const start = $from.start(depth);
		const end = $from.end(depth);
		const text = tr.doc.textBetween(start, end, "\0", "\ufffc").trim();
		if (block.type.name === "paragraph" && text === "") {
			const pos = $from.before(depth);
			tr = tr.delete(pos, pos + block.nodeSize);
		}
	}
	editor.view.dispatch(tr);
}

/** Plain snapshot so React always commits updates (no stale object identity). */
function slashSnapshotForReact(editor) {
	const s = getSlashDropdownState(editor);
	return {
		active: !!s.active,
		kind: s.kind === "atdate" ? "atdate" : "slash",
		query: String(s.query ?? ""),
		range:
			s.range != null &&
			typeof s.range.from === "number" &&
			typeof s.range.to === "number"
				? { from: s.range.from, to: s.range.to }
				: null,
	};
}

export function defaultItems() {
	const chainForSlash = (editor, range) => {
		applySlashTriggerDelete(editor, range);
		return editor.chain().focus();
	};

	return [
		{
			id: "text",
			title: "Text",
			keywords: ["text", "tx", "paragraph", "p"],
			run: (editor, range) => chainForSlash(editor, range).setParagraph().run(),
		},
		{
			id: "h1",
			title: "Heading 1",
			keywords: ["h1", "heading1", "heading 1", "title"],
			run: (editor, range) =>
				chainForSlash(editor, range).toggleHeading({ level: 1 }).run(),
		},
		{
			id: "h2",
			title: "Heading 2",
			keywords: ["h2", "heading2", "heading 2", "subtitle"],
			run: (editor, range) =>
				chainForSlash(editor, range).toggleHeading({ level: 2 }).run(),
		},
		{
			id: "ol",
			title: "Ordered List",
			keywords: ["ordered", "ol", "numbered", "list"],
			run: (editor, range) =>
				chainForSlash(editor, range).toggleOrderedList().run(),
		},
		{
			id: "ul",
			title: "Bullet List",
			keywords: ["bullet", "ul", "list"],
			run: (editor, range) =>
				chainForSlash(editor, range).toggleBulletList().run(),
		},
		{
			id: "task",
			title: "Checklist",
			keywords: ["task", "todo", "check", "tl", "checklist", "tasks"],
			run: (editor, range) => {
				const ok = chainForSlash(editor, range).toggleTaskList().run();
				if (ok) inkFocusTaskItemText(editor);
			},
		},
		{
			id: "quote",
			title: "Quote",
			keywords: ["quote", "blockquote", "bq"],
			run: (editor, range) =>
				chainForSlash(editor, range).toggleBlockquote().run(),
		},
		{
			id: "divider",
			title: "Divider",
			keywords: ["divider", "horizontal", "rule", "hr", "separator", "---"],
			run: (editor, range) =>
				chainForSlash(editor, range).setHorizontalRule().run(),
		},
		{
			id: "code",
			title: "Code Block",
			keywords: ["code", "codeblock", "cb"],
			run: (editor, range) =>
				chainForSlash(editor, range)
					.insertContent({
						type: "codeBlock",
						attrs: { language: "text", code: "" },
					})
					.run(),
		},
		{
			id: "codeGroup",
			title: "Code Group",
			keywords: [
				"codegroup",
				"code group",
				"snippet",
				"snippets",
				"multi",
			],
			run: (editor, range) => {
				const now = Date.now();
				chainForSlash(editor, range)
					.insertContent({
						type: "codeGroup",
						attrs: {
							tabs: [
								{
									id: now,
									name: "Tab 1",
									codeBlocks: [
										{
											id: now + 1,
											name: "",
											code: "",
											language: "text",
										},
									],
								},
							],
						},
					})
					.run();
			},
		},
		{
			id: "table",
			title: "Table",
			keywords: ["table", "grid", "tb", "rows"],
			run: (editor, range) =>
				chainForSlash(editor, range)
					.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
					.run(),
		},
		{
			id: "toggle",
			title: "Toggle",
			keywords: [
				"toggle",
				"details",
				"disclosure",
				"collapsible",
				"accordion",
			],
			run: (editor, range) => {
				applySlashTriggerDelete(editor, range);
				inkInsertToggleBlock(editor);
			},
		},
		{
			id: "tabs",
			title: "Tabs",
			keywords: ["tabs", "tab", "panels", "tabgroup", "layout"],
			run: (editor, range) => chainForSlash(editor, range).insertTabGroup().run(),
		},
		{
			id: "image",
			title: "Image",
			keywords: ["image", "img", "photo", "picture", "upload"],
			run: (editor, range) => {
				applySlashTriggerDelete(editor, range);
				if (typeof window !== "undefined") {
					/* Sync dispatch keeps this in the same user-activation chain as the
					 * slash click; microtask deferral can block file dialogs in some browsers. */
					window.dispatchEvent(new CustomEvent("inkgest-tiptap-image-picker"));
				}
			},
		},
		{
			id: "embed",
			title: "Embed (YouTube)",
			keywords: ["embed", "youtube", "video", "iframe"],
			run: (editor, range) => {
				const url =
					typeof window !== "undefined" ? window.prompt("Paste YouTube URL") : "";
				applySlashTriggerDelete(editor, range);
				const ch = editor.chain().focus();
				if (url?.trim()) {
					ch.setYoutubeVideo({ src: url.trim() }).run();
				} else {
					ch.run();
				}
			},
		},
		{
			id: "date",
			title: "Date",
			keywords: ["date", "today", "calendar", "d", "time"],
			run: (editor, range) => {
				applySlashTriggerDelete(editor, range);
				if (typeof window !== "undefined") {
					queueMicrotask(() =>
						window.dispatchEvent(
							new CustomEvent("inkgest-tiptap-date-picker", {
								detail: { editor },
							}),
						),
					);
				}
			},
		},
	];
}

export function SlashDropdownMenu({ editor, items = defaultItems() }) {
	// Subscribe on every transaction with a primitive signature (avoid deep-equal missing plugin updates).
	useEditorState({
		editor,
		selector: ({ editor: ed }) => {
			if (!ed || ed.isDestroyed || !ed.view?.state) return "";
			const s = SlashDropdownPluginKey.getState(ed.state) || INACTIVE;
			const r = s.range;
			return [
				s.active ? 1 : 0,
				s.kind ?? "",
				String(s.query ?? ""),
				r?.from ?? "",
				r?.to ?? "",
			].join("\u001f");
		},
		equalityFn: (a, b) => a === b,
	});

	const slashSnapshot =
		editor && !editor.isDestroyed && editor.view
			? slashSnapshotForReact(editor)
			: { ...INACTIVE };

	const [slashOnlyDate, setSlashOnlyDate] = React.useState(false);
	const { active, range, query, kind } = slashSnapshot;

	const closeSlash = React.useCallback(() => {
		if (!editor?.view) return;
		try {
			editor.view.dispatch(
				editor.view.state.tr.setMeta(SlashDropdownPluginKey, { type: "close" }),
			);
		} catch {
			// ignore
		}
	}, [editor]);

	React.useEffect(() => {
		const onDateSlash = (e) => {
			if (e.detail?.editor === editor) {
				setSlashOnlyDate(true);
			}
		};
		window.addEventListener("inkgest-tiptap-date-picker", onDateSlash);
		return () =>
			window.removeEventListener("inkgest-tiptap-date-picker", onDateSlash);
	}, [editor]);

	React.useEffect(() => {
		const onKey = (ev) => {
			if (ev.key !== "Escape") return;
			if (slashOnlyDate) setSlashOnlyDate(false);
			if (active && (kind === "atdate" || kind === "slash")) closeSlash();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [slashOnlyDate, active, kind, closeSlash]);

	const onPickDate = React.useCallback(
		(date) => {
			if (!editor || editor.isDestroyed) return;
			const st = getSlashDropdownState(editor);
			const k = st.kind;
			const r = st.range;
			if (k === "atdate" && r?.from != null && r?.to != null) {
				insertTiptapDateWithContext(editor, date, r);
			} else {
				insertTiptapDateAtCursor(editor, date);
			}
			closeSlash();
			setSlashOnlyDate(false);
		},
		[editor, closeSlash],
	);

	if (!editor) return null;

	const filtered = (items || []).filter((item) => {
		const q = (query || "").trim().toLowerCase();
		if (!q) return true;
		const title = (item.title || "").toLowerCase();
		if (title.includes(q)) return true;
		const id = (item.id || "").toLowerCase();
		if (id.includes(q)) return true;
		return (
			item.keywords?.some((k) => (k || "").toLowerCase().includes(q)) ?? false
		);
	});

	const showAtDate = active && kind === "atdate" && range;
	const showSlashList = active && kind === "slash" && range;
	const showSlashDateOnly = slashOnlyDate && !active;
	const showCalendar = showAtDate || showSlashDateOnly;

	const popMotion = {
		initial: { opacity: 0, y: 6, scale: 0.98 },
		animate: { opacity: 1, y: 0, scale: 1 },
		exit: { opacity: 0, y: 4, scale: 0.98 },
		transition: { type: "spring", stiffness: 420, damping: 30 },
	};

	if (typeof document === "undefined") return null;

	const pos = editor.state.selection.from;
	let left = 0;
	let top = 0;
	if (showCalendar || showSlashList) {
		const coords = editor.view.coordsAtPos(pos);
		left = coords.left;
		top = coords.bottom + 8;
	}

	// Portal keeps popovers out of overflow/transform clipping; AnimatePresence handles mount/exit motion.
	return createPortal(
		<AnimatePresence mode="wait">
			{showCalendar && (
				<motion.div
					key="slash-calendar"
					className="fixed z-[10050]"
					style={{ left, top }}
					onMouseDown={(e) => {
						e.preventDefault();
					}}
					{...popMotion}
				>
					<TiptapSlashDatePicker
						initialDate={new Date()}
						onSelect={onPickDate}
					/>
				</motion.div>
			)}
			{showSlashList && (
				<motion.div
					key="slash-commands"
					className="slash-dropdown-container fixed z-[10050]"
					style={{ left, top }}
					onMouseDown={(e) => {
						e.preventDefault();
					}}
					{...popMotion}
				>
					<div className="slash-dropdown min-w-[220px] max-w-[320px] bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
						<div className="max-h-[min(360px,55vh)] overflow-y-auto">
							{filtered.length === 0 ? (
								<div className="px-3 py-2 text-xs text-zinc-500">
									No commands
								</div>
							) : (
								filtered.map((item) => (
									<button
										key={item.id}
										type="button"
										className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 active:bg-zinc-100 flex items-center justify-between"
										onClick={() => {
											item.run(editor, range);
											closeSlash();
										}}
									>
										<span className="text-zinc-900 font-medium">
											{item.title}
										</span>
										<span className="text-[10px] text-zinc-400">
											/{item.keywords?.[0] || item.id}
										</span>
									</button>
								))
							)}
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
