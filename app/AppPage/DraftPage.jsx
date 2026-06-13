import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoginModal from "../../lib/ui/LoginModal";
import AppSidebarTasksNav from "../../lib/ui/AppSidebarTasksNav";
import AIChatSidebar from "../../lib/ui/AIChatSidebar";
import {
	listAssets,
	getAsset,
	updateAsset,
	deleteAsset,
} from "../../lib/api/userAssets";
import { uploadFile } from "../../lib/api/upload";
import { uploadInlineImagesToUploadThing } from "../../lib/fileUpload";
import { FREE_CREDIT_LIMIT, getUserCredits } from "../../lib/utils/credits";
import { useCompactAssetsNav } from "../../lib/hooks/useCompactAssetsNav";
import { useMermaidHydrateEditorRoot } from "../../lib/hooks/useMermaidHydrateEditorRoot";
import MotionSelect from "../../lib/ui/MotionSelect";
import {
	tryInsertInfographicFromDragData,
	INK_INFOGRAPHIC_DRAG_MIME,
} from "../../lib/ui/infographicInsertion";
import { tryInsertMermaidFromDragData } from "../../lib/ui/mermaidInsertion";
import {
	FontLink,
	T,
	Icons,
	Icon,
	ItemCard,
	MAX_TABS,
	insertDraftRichBlock,
	deleteDraftSlashFromCaret,
	deleteDraftSlashToken,
	escapeAttr,
	makeDraftImageFigureHtml,
	makeSimpleTableHtml,
	makeDraftQuoteHtml,
	makeDraftDividerHtml,
	makeToggleGroupHtml,
	makeCardBlockHtml,
	makeIconBlockHtml,
	makeAudioBlockHtml,
	makeDraftTabsHtml,
	makeDraftCodeGroupHtml,
	makeDraftToggleHtml,
	draftSlashItemMatchesQuery,
	measureDraftSlashCoords,
	measureDraftSlashMenuPosition,
	getSelectionLinkContext,
	getDraftBubbleBlock,
	getDraftBlockFromSelection,
	getTextFromBlockStartToCaret,
	matchDraftSlashQuery,
	syncDraftSlashQueryHighlight,
	unwrapAllDraftSlashQuerySpans,
	draftSelectionSpansMultipleBlocks,
	unwrapDraftInlineSpan,
	applyDraftBubbleInlineStyle,
	execDraftForeColor,
	execDraftHiliteColor,
	getDraftSlashFlatRows,
	DRAFT_SLASH_BASE_ITEMS,
	makeCalloutHtml,
	makeCodeBlockHtml,
	CALLOUT_CONFIGS,
	normalizeTodoLists,
	migrateCalloutIconSelectors,
	stripDraftSlashQueryFromHtmlString,
	parseInlineMarkdown,
	buildThemedReactSnippet,
	resolvePublicThemeId,
	formatInkDateLong,
	THEMES,
} from "./draftPageLib";
import { htmlToMarkdown } from "../../lib/utils/htmlToMarkdown";
import normalizeYoutubeEmbedsInHtml from "../../lib/utils/normalizeYoutubeEmbeds";
import { buildThemedHTML } from "../../lib/blogExportThemes";
import { useDraftPageRuntime } from "./hooks/useDraftPageRuntime";
import { useDraftIconPicker } from "./hooks/useDraftIconPicker";
import { useDraftTranslation } from "./hooks/useDraftTranslation";
import { useDraftBlogAudio } from "./hooks/useDraftBlogAudio";
import DraftIconPickerPortal from "./components/DraftIconPickerPortal";
import DraftBlockCategoryDropdown from "./components/DraftBlockCategoryDropdown";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import DraftDetailsDrawer from "./components/DraftDetailsDrawer";
import DraftTitleBlock from "./components/DraftTitleBlock";
import DraftSlashMenu from "./components/DraftSlashMenu";
import DraftEditorOverlays from "./components/DraftEditorOverlays";
import DraftSelectionToolbar from "./components/DraftSelectionToolbar";
import DraftPagePortals from "./components/DraftPagePortals";

export default function DraftPage() {
	const router = useRouter();
	const { draftId, tabs: tabsQuery } = router.query;
	const reduxUser = useSelector((state) => state.user?.user ?? null);

	
	/* Open tabs from URL query (?tabs=id1,id2,id3) — active tab = draftId from path */
	const openTabs = (() => {
		if (!draftId) return [];
		const fromQuery =
			typeof tabsQuery === "string" ? tabsQuery.split(",").filter(Boolean) : [];
		if (fromQuery.length === 0) return [draftId];
		if (!fromQuery.includes(draftId))
			return [draftId, ...fromQuery].slice(0, MAX_TABS);
		return fromQuery;
	})();

	const navigateWithTabs = (targetDraftId, newTabIds) => {
		const ids = newTabIds.length > 0 ? newTabIds : [targetDraftId];
		router.push(`/app/${targetDraftId}?tabs=${ids.join(",")}`, undefined, {
			shallow: false,
		});
	};

	const openDraftInTab = (id) => {
		if (id === draftId) return;
		const current = openTabs.includes(draftId)
			? openTabs
			: [draftId, ...openTabs];
		let next = current.includes(id)
			? current
			: [id, ...current.filter((x) => x !== id)].slice(0, MAX_TABS);
		navigateWithTabs(id, next);
	};

	const closeTab = (id, e) => {
		e?.stopPropagation();
		const next = openTabs.filter((t) => t !== id);
		if (next.length === 0) {
			router.push("/app");
			return;
		}
		const target = id === draftId ? next[0] : draftId;
		navigateWithTabs(target, next);
	};

	/* Lookup draft title by id (from drafts list, tables list, or current doc) */
	const getTabTitle = (id) => {
		if (draft?.id === id) return draft?.title || "Untitled";
		if (docData?.type === "table" && docData.doc?.id === id)
			return docData.doc.title || "Untitled";
		if (docData?.type === "infographics" && docData.doc?.id === id)
			return docData.doc.title || "Infographics";
		if (docData?.type === "landing_page" && docData.doc?.id === id)
			return docData.doc.title || "Landing Page";
		if (docData?.type === "image_gallery" && docData.doc?.id === id)
			return docData.doc.title || "Image Gallery";
		const d =
			drafts.find((x) => x.id === id) ||
			tables.find((x) => x.id === id) ||
			infographics.find((x) => x.id === id) ||
			landingPages.find((x) => x.id === id) ||
			imageGalleries.find((x) => x.id === id);
		return d?.title || "Untitled";
	};

	const truncate = (s, len = 18) =>
		!s ? "Untitled" : s.length <= len ? s : s.slice(0, len - 1) + "…";

	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [copied, setCopied] = useState(false);
	const [saved, setSaved] = useState(false);
	const [wordCount, setWordCount] = useState(0);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
	const [copiedTheme, setCopiedTheme] = useState(null); // { key, format: 'html' | 'react' | 'markdown' | 'text' | 'publicUrl' }
	const [previewTheme, setPreviewTheme] = useState("ink");
	const [translationLang, setTranslationLang] = useState("en");
	const [translatedHTML, setTranslatedHTML] = useState("");
	const [themeExportOpen, setThemeExportOpen] = useState(false);
	const themeExportRef = useRef(null);
	const [chatOpen, setChatOpen] = useState(false);
	const [blockMenuOpen, setBlockMenuOpen] = useState(false);
	const [imageDropdownOpen, setImageDropdownOpen] = useState(false);
	const [imageUrlInput, setImageUrlInput] = useState("");
	const [imageUploading, setImageUploading] = useState(false);
	const [selectionDropdown, setSelectionDropdown] = useState(null);
	const [selectionSubtool, setSelectionSubtool] = useState(null);
	const [selectionLinkUrl, setSelectionLinkUrl] = useState("");
	const selectionSavedRangeRef = useRef(null);
	const selectionLinkInputRef = useRef(null);
	const [selectionContext, setSelectionContext] = useState("");
	const [slashCommand, setSlashCommand] = useState(null);
	const slashCommandRef = useRef(null);
	slashCommandRef.current = slashCommand;
	const [slashListIndex, setSlashListIndex] = useState(0);
	const slashListIndexRef = useRef(0);
	slashListIndexRef.current = slashListIndex;
	const [draftImageModalOpen, setDraftImageModalOpen] = useState(false);
	const [draftImageModalUrl, setDraftImageModalUrl] = useState("");
	const [audioModalOpen, setAudioModalOpen] = useState(false);
	const [audioUploading, setAudioUploading] = useState(false);
	const audioFileInputRef = useRef(null);
	const [embedModalOpen, setEmbedModalOpen] = useState(false);
	const [embedUrlInput, setEmbedUrlInput] = useState("");
	const [embedResolved, setEmbedResolved] = useState(null); // resolved embed object
	const embedRangeRef = useRef(null); // saved cursor range before modal opened
	const [recordingOpen, setRecordingOpen] = useState(false);
	const [recordingState, setRecordingState] = useState("idle"); // idle | requesting | recording | uploading
	const [recordingSeconds, setRecordingSeconds] = useState(0);
	const [recordingMode, setRecordingMode] = useState("audio"); // "audio" | "text"
	const [transcriptFinal, setTranscriptFinal] = useState("");
	const [transcriptInterim, setTranscriptInterim] = useState("");
	const mediaRecorderRef = useRef(null);
	const recordingChunksRef = useRef([]);
	const recordingStreamRef = useRef(null);
	const recordingTimerRef = useRef(null);
	const recognitionRef = useRef(null);
	const [draftSlashDatePickerPos, setDraftSlashDatePickerPos] = useState(null);
	const [datePickerInitial, setDatePickerInitial] = useState(new Date());
	const dateEditTargetRef = useRef(null);
	// ── Details drawer + export dropdown ──
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [exportDropOpen, setExportDropOpen] = useState(false);
	const exportDropRef = useRef(null);
	// ── Navbar block-menu ──
	const [blocksMenuOpen, setBlocksMenuOpen] = useState(false);
	const blocksMenuRef = useRef(null);
	const [detailFontOpen, setDetailFontOpen] = useState(false);
	const [detailStyleOpen, setDetailStyleOpen] = useState(false);
	// ── Publish settings ──
	const [isPublic, setIsPublic] = useState(false);
	const [slugInput, setSlugInput] = useState("");
	const [publishDropOpen, setPublishDropOpen] = useState(false);
	const [publishSaving, setPublishSaving] = useState(false);
	const [publishCopied, setPublishCopied] = useState(false);
	const [publishShareTheme, setPublishShareTheme] = useState("ink");
	const [publishThemedCopied, setPublishThemedCopied] = useState(false);
	const [copiedPubThemeRow, setCopiedPubThemeRow] = useState(null);
	const publishDropRef = useRef(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [translationModalOpen, setTranslationModalOpen] = useState(false);
	const [translationCopyOpen, setTranslationCopyOpen] = useState(false);
	const translationCopyRef = useRef(null);
	const [previewCopied, setPreviewCopied] = useState(null);
	const [previewExportOpen, setPreviewExportOpen] = useState(false);
	const previewExportRef = useRef(null);
	const [previewData, setPreviewData] = useState({
		title: "",
		htmlDoc: "",
		markdown: "",
		reactSnippet: "",
	});
	const [editorFont, setEditorFont] = useState("Comic");
	const [editorFontSize, setEditorFontSize] = useState(15);
	const [editorVariant, setEditorVariant] = useState("default"); // "default" | "paper" | "typewriter" | "terminal" | "minimal"
	const [localTableData, setLocalTableData] = useState(null);
	const [iconPicker, setIconPicker] = useState(null); // { x, y, mode: 'block' | 'inline' }
	const iconPickerRef = useRef(null);
	const iconPickerTargetRef = useRef(null);
	const [dragHandle, setDragHandle] = useState(null); // { top, handleLeft, block }
	const [dropIndicator, setDropIndicator] = useState(null); // { top, left, width }
	const dragSrcRef = useRef(null);
	const dragOverRef = useRef(null); // { block, before }
	const editorRef = useRef(null);
	const titleRef = useRef(null);
	const imageFileInputRef = useRef(null);
	const handleSlashCommandRef = useRef(() => {});
	const editorContainerRef = useRef(null);

	/* All assets (drafts + tables) — from users/uid/assets or fallback to drafts+tables */
	const { data: items = [] } = useQuery({
		queryKey: ["assets", reduxUser?.uid],
		queryFn: () => listAssets(reduxUser.uid),
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	const drafts = useMemo(
		() => items.filter((i) => i.type === "draft"),
		[items],
	);
	const tables = useMemo(
		() => items.filter((i) => i.type === "table"),
		[items],
	);
	const infographics = useMemo(
		() => items.filter((i) => i.type === "infographics"),
		[items],
	);
	const landingPages = useMemo(
		() => items.filter((i) => i.type === "landing_page"),
		[items],
	);
	const imageGalleries = useMemo(
		() => items.filter((i) => i.type === "image_gallery"),
		[items],
	);

	/* Single doc by ID — assets first, then drafts, then tables */
	const { data: docData, isLoading: loadingDraft } = useQuery({
		queryKey: ["doc", draftId, reduxUser?.uid],
		queryFn: async () => {
			const result = await getAsset(reduxUser.uid, draftId);
			if (result) return result;
			router.replace("/app");
			return null;
		},
		enabled: !!router.isReady && !!draftId && !!reduxUser,
		staleTime: 5 * 60 * 1000,
		retry: false,
	});

	/* Resolve doc by type; fallback: infer from structure when type missing/wrong */
	const doc = docData?.doc;
	const docType = docData?.type;
	const draft =
		(docType === "draft" || docType === "blog")
			? doc
			: (!docType && doc?.body != null)
				? doc
				: null;
	const tableDoc =
		docType === "table"
			? doc
			: !docType && Array.isArray(doc?.columns)
				? doc
				: null;
	const infographicsDoc =
		docType === "infographics"
			? doc
			: !docType && Array.isArray(doc?.infographics) && doc.infographics.length > 0
				? doc
				: null;
	const landingPageDoc =
		docType === "landing_page"
			? doc
			: !docType && (doc?.html || doc?.url)
				? doc
				: null;
	const imageGalleryDoc =
		docType === "image_gallery"
			? doc
			: !docType && Array.isArray(doc?.images) && doc.images.length > 0
				? doc
				: null;

	useMermaidHydrateEditorRoot(editorRef, Boolean(draft));
	const closePreviewPanel = useCallback(() => {
		setPreviewOpen(false);
		setPreviewExportOpen(false);
	}, []);

	const closeThemeDrawer = useCallback(() => {
		setThemeDrawerOpen(false);
		setThemeExportOpen(false);
		setTranslatedHTML("");
		setTranslationLang("en");
	}, []);

	const closeTranslationModal = useCallback(() => {
		setTranslationModalOpen(false);
		setTranslationCopyOpen(false);
	}, []);

	const publishFormKey = draft
		? `${draft.id}-${draft.isPublic}-${draft.slug ?? ""}`
		: "no-draft";



	const compactAssetsNav = useCompactAssetsNav();
	const draftNavHeaderStackRef = useRef(null);
	const [compactNavTopInset, setCompactNavTopInset] = useState(56);

	/* Credits for free users (10/month) */
	const { data: credits = null } = useQuery({
		queryKey: ["credits", reduxUser?.uid],
		queryFn: () => getUserCredits(reduxUser.uid),
		enabled: !!reduxUser?.uid,
	});
	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;

	/* Format markdown body → editor HTML, handling rich blocks */
	const formatBody = (body = "") => {
		if (body.trim().startsWith("<")) return body;

		/* 1. Extract multi-line blocks into tokens so line-splitting is safe */
		const tokens = [];
		let text = body;

		// Code fences  ```lang\ncode\n```
		text = text.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
			const language = lang.trim() || "text";
			const escaped = code
				.trim()
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			const tok = `\x01BLK${tokens.length}\x01`;
			tokens.push(makeCodeBlockHtml(language, escaped));
			return tok;
		});

		// Callout blocks  :::type\ntext\n:::
		text = text.replace(/:::(\w+)\r?\n([\s\S]*?):::/g, (_, type, content) => {
			const innerHtml = content.trim().replace(/\n/g, "<br>");
			const tok = `\x01BLK${tokens.length}\x01`;
			tokens.push(makeCalloutHtml(type, innerHtml));
			return tok;
		});

		/* 2. Line grouping: lists, blockquotes, headings, paragraphs (+ inline MD) */
		const restore = (s) => s.replace(/\x01BLK(\d+)\x01/g, (_, i) => tokens[+i]);

		const rawLines = text.split("\n");
		const parts = [];
		let i = 0;

		const h1Style =
			"font-family:'Comic',sans-serif;font-size:26px;color:#1A1A1A;margin:24px 0 10px;line-height:1.2;font-weight:700";
		const h2Style =
			"font-family:'Comic',sans-serif;font-size:20px;color:#1A1A1A;margin:20px 0 8px;line-height:1.3;font-weight:650";
		const h3Style =
			"font-family:'Comic',sans-serif;font-size:17px;color:#1A1A1A;margin:16px 0 7px;font-weight:600";
		const pStyle =
			"font-size:15px;line-height:1.75;color:#37352F;margin:0 0 6px;min-height:1.4em";
		const bqStyle =
			"border-left:3px solid #E8E7E4;padding:4px 0 4px 14px;color:#6F6A64;margin:12px 0;font-size:15px;line-height:1.75";

		while (i < rawLines.length) {
			let line = rawLines[i];
			if (/\x01BLK\d+\x01/.test(line)) {
				parts.push(restore(line));
				i++;
				continue;
			}
			if (line.trim() === "") {
				parts.push("<br/>");
				i++;
				continue;
			}

			if (line.startsWith("### ")) {
				parts.push(
					`<h3 style="${h3Style}">${parseInlineMarkdown(line.slice(4))}</h3>`,
				);
				i++;
				continue;
			}
			if (line.startsWith("## ")) {
				parts.push(
					`<h2 style="${h2Style}">${parseInlineMarkdown(line.slice(3))}</h2>`,
				);
				i++;
				continue;
			}
			if (line.startsWith("# ")) {
				parts.push(
					`<h1 style="${h1Style}">${parseInlineMarkdown(line.slice(2))}</h1>`,
				);
				i++;
				continue;
			}

			if (/^(\*{3}|-{3}|_{3})\s*$/.test(line.trim())) {
				parts.push(
					'<hr style="border:none;border-top:1px solid #E8E7E4;margin:22px 0"/>',
				);
				i++;
				continue;
			}

			if (line.startsWith("> ")) {
				const bqLines = [];
				while (i < rawLines.length && rawLines[i].startsWith("> ")) {
					bqLines.push(rawLines[i].slice(2));
					i++;
				}
				parts.push(
					`<blockquote style="${bqStyle}">${parseInlineMarkdown(bqLines.join("<br/>"))}</blockquote>`,
				);
				continue;
			}

			const taskRe = /^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/;
			if (taskRe.test(line)) {
				const lis = [];
				while (i < rawLines.length) {
					const m = rawLines[i].match(taskRe);
					if (!m) break;
					const checked = m[2].toLowerCase() === "x";
					const content = parseInlineMarkdown(m[3]);
					const chk = checked ? " checked" : "";
					lis.push(
						`<li class="todo-item" style="list-style:none;margin:4px 0;display:flex;align-items:flex-start;gap:10px;line-height:1.75"><input type="checkbox"${chk} class="todo-cb" style="margin-top:4px;flex-shrink:0;width:1em;height:1em;accent-color:#37352F"/><span class="todo-label" style="flex:1;min-width:0">${content}</span></li>`,
					);
					i++;
				}
				parts.push(
					`<ul data-todo="true" style="list-style:none;padding-left:0;margin:8px 0">${lis.join("")}</ul>`,
				);
				continue;
			}

			const ordRe = /^(\s*)\d+\.\s+(.*)$/;
			if (ordRe.test(line)) {
				const lis = [];
				while (i < rawLines.length) {
					const m = rawLines[i].match(/^(\s*)\d+\.\s+(.*)$/);
					if (!m) break;
					lis.push(
						`<li style="margin:3px 0;line-height:1.75">${parseInlineMarkdown(m[2])}</li>`,
					);
					i++;
				}
				parts.push(
					`<ol style="padding-left:28px;margin:8px 0;list-style:decimal">${lis.join("")}</ol>`,
				);
				continue;
			}

			const bulletRe = /^(\s*)[-*]\s+(?!\[[ xX]\])(.+)$/;
			const bm = line.match(bulletRe);
			if (bm) {
				const lis = [];
				while (i < rawLines.length) {
					const m = rawLines[i].match(bulletRe);
					if (!m) break;
					lis.push(
						`<li style="margin:3px 0;line-height:1.75">${parseInlineMarkdown(m[2])}</li>`,
					);
					i++;
				}
				parts.push(
					`<ul style="padding-left:28px;margin:8px 0;list-style:disc">${lis.join("")}</ul>`,
				);
				continue;
			}

			parts.push(`<p style="${pStyle}">${parseInlineMarkdown(line)}</p>`);
			i++;
		}

		return parts.join("");
	};

	const draftTranslation = useDraftTranslation({
		reduxUser,
		draft,
		draftId,
		docSource: docData?.source,
		editorRef,
		formatBody,
		translationLang,
		setTranslationLang,
		translatedHTML,
		setTranslatedHTML,
		themeDrawerOpen,
		queryClient,
		creditRemaining,
	});

	const audioSourceText = useMemo(() => {
		const html = stripDraftSlashQueryFromHtmlString(
			translatedHTML || draft?.body || "",
		);
		if (!html.trim()) return "";
		try {
			const d = document.createElement("div");
			d.innerHTML = html;
			return (d.innerText || "").trim();
		} catch {
			return "";
		}
	}, [translatedHTML, draft?.body]);

	const draftBlogAudio = useDraftBlogAudio({
		reduxUser,
		draft,
		draftId,
		docSource: docData?.source,
		queryClient,
		creditRemaining,
		content: audioSourceText,
		title: draft?.title || "Blog audio",
	});

	/* Sync tabs to URL when we have draftId but no tabs query (e.g. direct link) */

	/* Set editor content when draft loads */

	/* Sync publish state from Firestore doc */

	/* Close publish dropdown on outside click */

	/* Close export dropdown on outside click */

	/* Close blocks menu on outside click */

	const countWords = () => {
		const text = editorRef.current?.innerText || "";
		setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
	};

	const onEditorInput = () => {
		migrateCalloutIconSelectors(editorRef.current);
		normalizeTodoLists(editorRef.current);
		syncDraftSlashQueryHighlight(editorRef.current);
		countWords();
		const updateSlashMenu = () => {
			const sel = window.getSelection();
			if (!editorRef.current || !sel?.rangeCount) {
				setSlashCommand(null);
				return;
			}
			const range = sel.getRangeAt(0);
			const block = getDraftBlockFromSelection(editorRef.current, range);
			if (!block) {
				setSlashCommand(null);
				return;
			}
			if (
				block.closest?.(
					"pre, code, [contenteditable='false']",
				)
			) {
				setSlashCommand(null);
				return;
			}
			const inSummary = block.closest?.("summary");
			if (
				inSummary &&
				!block.matches?.("span[contenteditable='true']")
			) {
				setSlashCommand(null);
				return;
			}
			const text = getTextFromBlockStartToCaret(block, range);
			const slash = matchDraftSlashQuery(text);
			if (!slash) {
				setSlashCommand(null);
				return;
			}
			const pos = measureDraftSlashMenuPosition(
				block,
				range,
				editorRef.current,
				editorFontSize,
			);
			if (!pos) {
				setSlashCommand(null);
				return;
			}
			setSlashCommand({ x: pos.x, y: pos.y, query: slash.query });
		};
		queueMicrotask(updateSlashMenu);
	};

	const restoreEditorSelection = () => {
		const r = selectionSavedRangeRef.current;
		if (!r) return false;
		try {
			editorRef.current?.focus();
			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r.cloneRange());
			return true;
		} catch {
			return false;
		}
	};

	const handleCopy = () => {
		const text = editorRef.current?.innerText || draft?.body || "";
		navigator.clipboard.writeText(text).catch(() => {});
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSave = async () => {
		if (!draftId || !reduxUser?.uid) return;
		try {
			if (editorRef.current) unwrapAllDraftSlashQuerySpans(editorRef.current);
			let html = editorRef.current?.innerHTML || "";
			html = await uploadInlineImagesToUploadThing(html);
			if (editorRef.current) editorRef.current.innerHTML = html;
			const title =
				titleRef.current?.innerText?.trim() || draft?.title || "Untitled";
			await updateAsset(
				reduxUser.uid,
				draftId,
				{ body: html, title },
				docData?.source || "drafts",
			);
		} catch (e) {
			console.error("Save failed", e);
		}
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	/* ── Publish helpers ── */
	const toSlug = (str) =>
		(str || "")
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.slice(0, 80) || draftId;

	const getEffectiveSlug = () =>
		toSlug(slugInput) || toSlug(titleRef.current?.innerText?.trim() || draft?.title || "") || draftId;

	const getPublicUrl = (slug, themeId) => {
		if (typeof window === "undefined") return "";
		const pathSlug = slug || getEffectiveSlug();
		let url = `${window.location.origin}/p/${pathSlug}`;
		const tid =
			themeId !== undefined && themeId !== null && String(themeId).trim() !== ""
				? resolvePublicThemeId(String(themeId))
				: null;
		if (tid) url += `?theme=${encodeURIComponent(tid)}`;
		return url;
	};

	const savePublishSettings = async (nextPublic, nextSlug) => {
		if (!draftId || !reduxUser?.uid) return;
		setPublishSaving(true);
		const slug = toSlug(nextSlug ?? slugInput) || toSlug(titleRef.current?.innerText?.trim() || draft?.title || "") || draftId;
		try {
			// 1. Update asset doc with publish fields
			await updateAsset(
				reduxUser.uid,
				draftId,
				{ isPublic: nextPublic, slug },
				docData?.source || "assets",
			);
			// 2. Mirror to / remove from published_blogs top-level collection
			const { doc: fsDoc, setDoc: fsSetDoc, deleteDoc: fsDeleteDoc } = await import("firebase/firestore");
			const { db: fsDb } = await import("../../lib/config/firebase");
			const oldSlug = draft?.slug;
			if (nextPublic) {
				const rawHtml =
					editorRef.current?.innerHTML || draft?.body || "";
				const html = normalizeYoutubeEmbedsInHtml(rawHtml);
				const title = titleRef.current?.innerText?.trim() || draft?.title || "Untitled";
				await fsSetDoc(fsDoc(fsDb, "published_blogs", slug), {
					userId: reduxUser.uid,
					assetId: draftId,
					slug,
					title,
					description: draft?.description || "",
					body: html,
					publishedAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});
				// Clean up old slug doc if slug changed
				if (oldSlug && oldSlug !== slug) {
					try { await fsDeleteDoc(fsDoc(fsDb, "published_blogs", oldSlug)); } catch (_) {}
				}
			} else {
				// Unpublishing: remove from published_blogs
				const slugToRemove = oldSlug || slug;
				try { await fsDeleteDoc(fsDoc(fsDb, "published_blogs", slugToRemove)); } catch (_) {}
			}
			setIsPublic(nextPublic);
			setSlugInput(slug);
		} catch (e) {
			console.error("Publish settings save failed", e);
		} finally {
			setPublishSaving(false);
		}
	};

	/* ── Insert image or video at cursor ── */
	const insertImageOrVideo = (url, isVideo = false) => {
		if (!url?.trim()) return;
		editorRef.current?.focus();
		if (isVideo) {
			const html = `<p style="margin:16px 0"><video src="${escapeAttr(url)}" controls style="max-width:100%;border-radius:8px;display:block"></video></p>`;
			document.execCommand("insertHTML", false, html);
		} else {
			document.execCommand(
				"insertHTML",
				false,
				makeDraftImageFigureHtml(url),
			);
		}
		countWords();
		setImageUrlInput("");
		setImageDropdownOpen(false);
	};

	const handleImageFileSelect = (e) => {
		const file = e.target?.files?.[0];
		if (!file) return;
		const isVideo = file.type.startsWith("video/");
		const isImage = file.type.startsWith("image/");
		if (!isImage && !isVideo) {
			alert("Please select an image or video file.");
			return;
		}

		/* Images: keep as data URL until save (UploadThing via uploadInlineImagesToUploadThing) */
		if (isImage) {
			const reader = new FileReader();
			reader.onload = () => {
				const dataUrl = reader.result;
				insertImageOrVideo(dataUrl, false);
				setDraftImageModalOpen(false);
			};
			reader.readAsDataURL(file);
		} else {
			/* Videos: upload first (too large for base64), then insert */
			if (!reduxUser?.uid) {
				alert("Please sign in to upload videos.");
				return;
			}
			setImageUploading(true);
			const ext = file.name.split(".").pop() || "mp4";
			const path = `users/${reduxUser.uid}/drafts/${draftId || "new"}/media/${Date.now()}.${ext}`;
			uploadFile(file, path)
				.then((downloadUrl) => {
					insertImageOrVideo(downloadUrl, true);
					setDraftImageModalOpen(false);
				})
				.catch((err) => {
					console.error("Upload failed:", err);
					alert("Upload failed. Please try again.");
				})
				.finally(() => {
					setImageUploading(false);
					e.target.value = "";
				});
		}
		e.target.value = "";
	};

	/* ── Insert audio block at cursor ── */
	const insertAudioBlock = (src, name = "Audio track") => {
		if (!editorRef.current) return;
		editorRef.current.focus();
		const html = makeAudioBlockHtml(src, name, "");
		document.execCommand("insertHTML", false, html);
		countWords();
		setAudioModalOpen(false);
		setRecordingOpen(false);
		requestAnimationFrame(() => editorRef.current?.focus());
	};

	/* ── Recording: start microphone capture ── */
	const startRecording = async () => {
		try {
			setRecordingState("requesting");
			setTranscriptFinal("");
			setTranscriptInterim("");
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			recordingStreamRef.current = stream;
			const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
			const mr = new MediaRecorder(stream, { mimeType });
			recordingChunksRef.current = [];
			mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
			mr.start(100);
			mediaRecorderRef.current = mr;
			setRecordingSeconds(0);
			setRecordingState("recording");
			recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
			// start speech recognition in text mode
			const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
			if (SpeechRecognition) {
				const rec = new SpeechRecognition();
				rec.continuous = true;
				rec.interimResults = true;
				rec.lang = "en-US";
				rec.onresult = (ev) => {
					let finalChunk = "";
					let interimChunk = "";
					for (let i = ev.resultIndex; i < ev.results.length; i++) {
						if (ev.results[i].isFinal) finalChunk += ev.results[i][0].transcript + " ";
						else interimChunk += ev.results[i][0].transcript;
					}
					if (finalChunk) setTranscriptFinal((p) => p + finalChunk);
					setTranscriptInterim(interimChunk);
				};
				rec.onerror = () => {};
				rec.start();
				recognitionRef.current = rec;
			}
		} catch {
			setRecordingState("idle");
			alert("Microphone access was denied. Please allow microphone in your browser settings.");
		}
	};

	const stopRecordingStream = () => {
		clearInterval(recordingTimerRef.current);
		try {
			if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
		} catch (_) {}
		try { recognitionRef.current?.stop(); } catch (_) {}
		recognitionRef.current = null;
		recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
		recordingStreamRef.current = null;
	};

	const handleRecordingDone = async () => {
		if (recordingState !== "recording") return;
		clearInterval(recordingTimerRef.current);
		try { recognitionRef.current?.stop(); } catch (_) {}
		recognitionRef.current = null;

		// ── Text mode: just insert transcript as paragraph ──
		if (recordingMode === "text") {
			const text = (transcriptFinal + transcriptInterim).trim();
			recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
			recordingStreamRef.current = null;
			try { mediaRecorderRef.current?.stop(); } catch (_) {}
			if (text && editorRef.current) {
				editorRef.current.focus();
				document.execCommand("insertHTML", false, `<p>${text.replace(/\n/g, "<br>")}</p>`);
				countWords();
			}
			setRecordingOpen(false);
			setRecordingState("idle");
			setRecordingSeconds(0);
			setTranscriptFinal("");
			setTranscriptInterim("");
			setRecordingMode("audio");
			return;
		}

		// ── Audio mode: upload and insert block ──
		setRecordingState("uploading");
		const mr = mediaRecorderRef.current;
		if (!mr) return;
		await new Promise((res) => { mr.onstop = res; try { mr.stop(); } catch (_) { res(); } });
		recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
		recordingStreamRef.current = null;
		const mimeType = recordingChunksRef.current[0]?.type || "audio/webm";
		const blob = new Blob(recordingChunksRef.current, { type: mimeType });
		const label = `Voice note ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const res = await fetch("/api/uploadAudio", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dataUrl: reader.result, name: label, type: mimeType }),
				});
				const json = await res.json();
				if (!res.ok || json.error) throw new Error(json.error || "Upload failed");
				insertAudioBlock(json.url, label);
			} catch (err) {
				alert(`Recording upload failed: ${err.message}`);
			} finally {
				setRecordingState("idle");
				setRecordingSeconds(0);
			}
		};
		reader.readAsDataURL(blob);
	};

	const handleRecordingCancel = () => {
		stopRecordingStream();
		setRecordingOpen(false);
		setRecordingState("idle");
		setRecordingSeconds(0);
		setTranscriptFinal("");
		setTranscriptInterim("");
		setRecordingMode("audio");
	};

	const handleAudioFileSelect = (e) => {
		const file = e.target?.files?.[0];
		if (!file) return;
		const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
		if (!isAudio) { alert("Please select an audio file (MP3, WAV, OGG, M4A…)"); return; }

		const name = file.name.replace(/\.[^.]+$/, "");
		e.target.value = "";

		setAudioUploading(true);

		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const dataUrl = reader.result;
				const res = await fetch("/api/uploadAudio", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ dataUrl, name, type: file.type }),
				});
				const json = await res.json();
				if (!res.ok || json.error) throw new Error(json.error ?? "Upload failed");
				insertAudioBlock(json.url, name);
			} catch (err) {
				console.error("Audio upload failed:", err);
				alert(`Audio upload failed: ${err.message}`);
			} finally {
				setAudioUploading(false);
			}
		};
		reader.onerror = () => {
			setAudioUploading(false);
			alert("Could not read audio file.");
		};
		reader.readAsDataURL(file);
	};

	const isVideoUrl = (url) => {
		try {
			const u = new URL(url);
			const path = u.pathname.toLowerCase();
			return /\.(mp4|webm|ogg|mov)(\?|$)/.test(path) || path.includes("video");
		} catch {
			return false;
		}
	};

	const confirmDraftImageFromUrl = () => {
		const raw = draftImageModalUrl.trim();
		if (!raw) return;
		try {
			const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
			if (!/^https?:$/i.test(u.protocol)) {
				alert("Only http(s) URLs are allowed.");
				return;
			}
			const href = u.href;
			insertImageOrVideo(href, isVideoUrl(href));
		} catch {
			alert("Invalid URL.");
			return;
		}
		setDraftImageModalOpen(false);
		setDraftImageModalUrl("");
	};

	const isNodeInEditor = (node, editor) => {
		if (!node || !editor) return false;
		let n = node;
		while (n) {
			if (n === editor) return true;
			n = n.parentNode;
		}
		return false;
	};


	/* ── Close selection dropdown when clicking outside (defer to avoid same-stroke close) ── */





	/* ── Slash command: Escape / arrows / Enter, click outside ── */

	/* Draft date picker (slash / date): calendar portal, not window.prompt */

	/* Draft image modal (/ image): Escape to close */

	const makeDateChipHtml = (d) => {
		const label = formatInkDateLong(d);
		if (!label) return "";
		const iso = d.toISOString();
		const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		return `<span data-ink-date="${iso}" contenteditable="false" title="Click to change date" style="display:inline-flex;align-items:center;gap:5px;background:#FEF3E2;border:1px solid #F6D9A8;border-radius:6px;padding:2px 9px 2px 7px;color:#92400E;font-weight:600;font-size:0.92em;cursor:pointer;user-select:none;white-space:nowrap;vertical-align:middle;line-height:1.7"><svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#C17B2F' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>${safe}</span>`;
	};

	const insertDraftDateAtCursor = (d) => {
		if (!editorRef.current) return;

		/* If we're editing an existing chip, update it in-place */
		if (dateEditTargetRef.current) {
			const chip = dateEditTargetRef.current;
			const label = formatInkDateLong(d);
			if (label) {
				chip.setAttribute("data-ink-date", d.toISOString());
				const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
				chip.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#C17B2F' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>${safe}`;
			}
			dateEditTargetRef.current = null;
			setDraftSlashDatePickerPos(null);
			return;
		}

		editorRef.current.focus();
		const sel = window.getSelection();
		if (sel?.rangeCount) {
			const range = sel.getRangeAt(0);
			const block = getDraftBlockFromSelection(editorRef.current, range);
			if (block) {
				const text = getTextFromBlockStartToCaret(block, range);
				const slash = matchDraftSlashQuery(text);
				if (slash) deleteDraftSlashToken(block, range, slash.slashToken.length);
			}
		}

		const html = makeDateChipHtml(d);
		if (!html) { setDraftSlashDatePickerPos(null); return; }
		document.execCommand("insertHTML", false, html);
		countWords();
		setDraftSlashDatePickerPos(null);
		requestAnimationFrame(() => editorRef.current?.focus());
	};

	const handleSlashCommand = (action) => {
		const sel =
			typeof window !== "undefined" ? window.getSelection() : null;
		if (action === "continue-writing" || action === "ask-ai") {
			const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
			let ctx = "";
			if (range) {
				const el = range.commonAncestorContainer;
				const block = el?.nodeType === 3 ? el.parentElement : el;
				if (block?.closest) {
					const p = block.closest("p, h1, h2, h3, li");
					ctx = p?.innerText?.trim?.() || "";
				}
			}
			setSelectionContext(ctx);
			setChatOpen(true);
		} else if (action === "text") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "p");
		} else if (action === "h1") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "h1");
		} else if (action === "h2") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "h2");
		} else if (action === "h3") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("formatBlock", false, "h3");
		} else if (action === "bullet") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("insertUnorderedList");
		} else if (action === "numbered") {
			deleteDraftSlashFromCaret(editorRef.current);
			document.execCommand("insertOrderedList");
		} else if (action === "todo") {
			insertDraftRichBlock(
				editorRef.current,
				`<ul data-todo="true" style="${TODO_UL_STYLE}"><li class="todo-item" style="${TODO_LI_STYLE}"><input type="checkbox" class="todo-cb" style="${TODO_CHECKBOX_STYLE}"/><span class="todo-label" style="flex:1;min-width:0"> </span></li></ul><p><br></p>`,
			);
		} else if (action === "quote") {
			insertDraftRichBlock(editorRef.current, makeDraftQuoteHtml());
		} else if (action === "divider") {
			insertDraftRichBlock(
				editorRef.current,
				makeDraftDividerHtml("solid").replace(/<p><br><\/p>\s*$/, ""),
			);
		} else if (action === "divider-dashed") {
			insertDraftRichBlock(
				editorRef.current,
				makeDraftDividerHtml("dashed").replace(/<p><br><\/p>\s*$/, ""),
			);
		} else if (action === "divider-dotted") {
			insertDraftRichBlock(
				editorRef.current,
				makeDraftDividerHtml("dotted").replace(/<p><br><\/p>\s*$/, ""),
			);
		} else if (action === "toggle-group") {
			insertDraftRichBlock(editorRef.current, makeToggleGroupHtml());
		} else if (action === "card") {
			insertDraftRichBlock(editorRef.current, makeCardBlockHtml());
		} else if (action === "icon-block") {
			insertDraftRichBlock(editorRef.current, makeIconBlockHtml("✨", "emoji"));
		} else if (action === "audio") {
			deleteDraftSlashFromCaret(editorRef.current);
			setAudioModalOpen(true);
		} else if (action === "record") {
			deleteDraftSlashFromCaret(editorRef.current);
			setRecordingOpen(true);
			setTimeout(() => startRecording(), 300);
		} else if (action === "code") {
			insertDraftRichBlock(
				editorRef.current,
				makeCodeBlockHtml("text", "// Your code here") + "<p><br></p>",
			);
		} else if (action === "codeGroup") {
			insertDraftRichBlock(editorRef.current, makeDraftCodeGroupHtml());
		} else if (action === "tabs") {
			insertDraftRichBlock(editorRef.current, makeDraftTabsHtml());
		} else if (action === "toggle") {
			insertDraftRichBlock(editorRef.current, makeDraftToggleHtml());
		} else if (
			action === "callout-info" ||
			action === "callout-warning" ||
			action === "callout-success" ||
			action === "callout-danger"
		) {
			const type = action.replace(/^callout-/, "");
			const cfg = CALLOUT_CONFIGS[type];
			if (cfg) {
				insertDraftRichBlock(
					editorRef.current,
					makeCalloutHtml(
						type,
						`${cfg.label} — edit this text.`,
					) + "<p><br></p>",
				);
			}
		} else if (action === "date") {
			const pos = slashCommand
				? {
						left: Math.max(
							8,
							Math.min(slashCommand.x, window.innerWidth - 300),
						),
						top: slashCommand.y + 4,
					}
				: { left: 80, top: 120 };
			setDraftSlashDatePickerPos(pos);
		} else if (action === "image") {
			deleteDraftSlashFromCaret(editorRef.current);
			setDraftImageModalOpen(true);
		} else if (action === "table") {
			insertDraftRichBlock(editorRef.current, makeSimpleTableHtml());
		} else if (action === "embed") {
			deleteDraftSlashFromCaret(editorRef.current);
			// Save cursor position BEFORE modal steals focus
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				embedRangeRef.current = sel.getRangeAt(0).cloneRange();
			}
			setEmbedUrlInput("");
			setEmbedResolved(null);
			setEmbedModalOpen(true);
		}
		countWords();
		setSlashCommand(null);
	};

	handleSlashCommandRef.current = handleSlashCommand;

	const { openAtPoint: openIconPickerAtPoint, close: closeIconPicker } =
		useDraftIconPicker({
			editorRef,
			draftId,
			draftBody: draft?.body,
			iconPickerRef,
			iconPickerTargetRef,
			setIconPicker,
			iconPicker,
		});

	useDraftPageRuntime({
		router,
		draftId,
		tabsQuery,
		openTabs,
		reduxUser,
		draft,
		tableDoc,
		setIsPublic,
		setSlugInput,
		setLocalTableData,
		editorRef,
		editorContainerRef,
		countWords,
		formatBody,
		normalizeTodoLists,
		migrateCalloutIconSelectors,
		compactAssetsNav,
		draftNavHeaderStackRef,
		setCompactNavTopInset,
		previewExportOpen,
		previewExportRef,
		setPreviewExportOpen,
		previewOpen,
		themeExportOpen,
		themeExportRef,
		setThemeExportOpen,
		themeDrawerOpen,
		translationCopyOpen,
		translationCopyRef,
		setTranslationCopyOpen,
		translationModalOpen,
		publishDropOpen,
		publishDropRef,
		setPublishDropOpen,
		exportDropOpen,
		exportDropRef,
		setExportDropOpen,
		blocksMenuOpen,
		blocksMenuRef,
		setBlocksMenuOpen,
		blockMenuOpen,
		setBlockMenuOpen,
		imageDropdownOpen,
		setImageDropdownOpen,
		selectionDropdown,
		setSelectionDropdown,
		selectionSavedRangeRef,
		setSelectionSubtool,
		setSelectionLinkUrl,
		selectionSubtool,
		selectionLinkInputRef,
		slashCommand,
		slashCommandRef,
		setSlashCommand,
		slashListIndexRef,
		setSlashListIndex,
		slashListIndex,
		draftSlashDatePickerPos,
		setDraftSlashDatePickerPos,
		draftImageModalOpen,
		setDraftImageModalOpen,
		setDraftImageModalUrl,
		dragSrcRef,
		dragOverRef,
		setDragHandle,
		dateEditTargetRef,
		setDatePickerInitial,
		getSelectionLinkContext,
		isNodeInEditor,
		getDraftSlashFlatRows,
		handleSlashCommandRef,
	});


	const handleDelete = (id) => setDeleteConfirm(id);
	
	const handleSidebarIconChange = async (assetId, sidebarIcon) => {
		if (!reduxUser) return;
		const item = items.find((i) => i.id === assetId);
		const isAsset =
			["infographics", "landing_page", "image_gallery"].includes(item?.type) ||
			tables.some((t) => t.id === assetId);
		const source =
			item?.source ||
			(isAsset ? "assets" : item?.type === "table" ? "tables" : "drafts");
		try {
			await updateAsset(reduxUser.uid, assetId, { sidebarIcon }, source);
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
		} catch (e) {
			console.error("Sidebar icon update failed", e);
		}
	};

	const handleSidebarRename = async (assetId, title) => {
		if (!reduxUser) return;
		const item = items.find((i) => i.id === assetId);
		const isAsset =
			["infographics", "landing_page", "image_gallery"].includes(item?.type) ||
			tables.some((t) => t.id === assetId);
		const source =
			item?.source ||
			(isAsset ? "assets" : item?.type === "table" ? "tables" : "drafts");
		try {
			await updateAsset(reduxUser.uid, assetId, { title }, source);
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser.uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
		} catch (e) {
			console.error("Sidebar rename failed", e);
		}
	};

	const confirmDelete = async () => {
		try {
			const item = items.find((i) => i.id === deleteConfirm);
			const isAsset =
				["infographics", "landing_page", "image_gallery"].includes(
					item?.type,
				) || tables.some((t) => t.id === deleteConfirm);
			const source =
				item?.source ||
				(isAsset ? "assets" : item?.type === "table" ? "tables" : "drafts");
			await deleteAsset(reduxUser.uid, deleteConfirm, source);
			queryClient.invalidateQueries({ queryKey: ["assets", reduxUser?.uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
			if (deleteConfirm === draftId) {
				router.push("/app");
			}
		} catch (e) {
			console.error("Delete failed", e);
		}
		setDeleteConfirm(null);
	};

	const handleCopyThemeHTML = (themeKey) => {
		const theme = THEMES[themeKey];
		if (!theme) return;
		const html = stripDraftSlashQueryFromHtmlString(
			editorRef.current?.innerHTML || draft?.body || "",
		);
		const title = draft?.title || "";
		const output = buildThemedHTML(html, theme, title);
		navigator.clipboard.writeText(output).catch(() => {});
		setCopiedTheme({ key: themeKey, format: "html" });
		setTimeout(() => setCopiedTheme(null), 2200);
	};

	const handleCopyThemeReact = (themeKey) => {
		if (!THEMES[themeKey]) return;
		const html = stripDraftSlashQueryFromHtmlString(
			editorRef.current?.innerHTML || draft?.body || "",
		);
		const title = draft?.title || "";
		const snippet = buildThemedReactSnippet(html, themeKey, title);
		if (!snippet) return;
		navigator.clipboard.writeText(snippet).catch(() => {});
		setCopiedTheme({ key: themeKey, format: "react" });
		setTimeout(() => setCopiedTheme(null), 2200);
	};

	

	const filtered = items.filter((i) => {
		const q = search.toLowerCase().trim();
		if (!q) return true;
		const title = (i.title || "").toLowerCase();
		const preview = (i.preview || i.description || "").toLowerCase();
		const type = (i.type || "").toLowerCase();
		const tag = (ASSET_TYPE_LABELS[i.type] || i.tag || "Draft").toLowerCase();
		const format = (i.format || "").toLowerCase();
		const prompt = (i.prompt || "").toLowerCase();
		return (
			title.includes(q) ||
			preview.includes(q) ||
			type.includes(q) ||
			tag.includes(q) ||
			format.includes(q) ||
			prompt.includes(q)
		);
	});

	const asset =
		draft ||
		(docData?.type === "table" ? docData.doc : null) ||
		(docData?.type === "infographics" ? docData.doc : null) ||
		(docData?.type === "landing_page" ? docData.doc : null) ||
		(docData?.type === "image_gallery" ? docData.doc : null) ||
		/* Fallback: doc exists but type unknown — treat as draft if has body */
		(docData?.doc?.body != null ? docData.doc : null);
	const sourceUrl = Array.isArray(asset?.urls)
		? asset.urls[0] || ""
		: Array.isArray(asset?.sourceUrls)
			? asset.sourceUrls[0] || ""
			: asset?.url || "";
	const assetPrompt = asset?.prompt || "";

	const TopToolbar = ({ draft: _draft, compactToolbar }) => {
		const insertBlock = (id) => {
			editorRef.current?.focus();
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) {
				const range = document.createRange();
				const el = editorRef.current;
				if (el) { range.selectNodeContents(el); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); }
			}
			handleSlashCommand(id);
			setBlocksMenuOpen(false);
		};
		const getContent = () => {
			const raw = stripDraftSlashQueryFromHtmlString(editorRef.current?.innerHTML || draft?.body || "");
			return raw.trim().startsWith("<") ? raw : formatBody(raw);
		};
		const getTitle = () => titleRef.current?.innerText?.trim() || draft?.title || "Untitled draft";
		const gIconBtn = (onClick, title, children, active = false) => (
			<motion.button type="button" onClick={onClick} title={title} whileHover={{ background: "#F0F0F0" }} whileTap={{ scale: 0.93 }}
				style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: `1px solid ${active ? "#111" : "transparent"}`, background: active ? "#111" : "transparent", cursor: "pointer", color: active ? "#fff" : T.muted, transition: "all 0.15s", flexShrink: 0 }}>
				{children}
			</motion.button>
		);
		const ADV_CATEGORIES = [
			{ key: "media",      label: "Media",      ids: ["image","embed","audio","record"] },
			{ key: "components", label: "Components", ids: ["card","toggle-group","toggle","tabs","icon-block"] },
			{ key: "callouts",   label: "Callouts",   ids: ["callout-info","callout-warning","callout-success","callout-danger"] },
			{ key: "data",       label: "Data",       ids: ["table","date"] },
			{ key: "dividers",   label: "Dividers",   ids: ["divider","divider-dashed","divider-dotted"] },
			{ key: "code",       label: "Code",       ids: ["code","codeGroup"] },
		];
		const QUICK_BLOCKS = [
			{ id: "h1", tip: "Heading 1",
			  svgEl: <svg width="22" height="18" viewBox="0 0 22 18"><text x="1" y="14" style={{fontSize:13,fontWeight:800,fill:"currentColor",fontFamily:"system-ui,sans-serif"}}>H<tspan fontSize="9" dy="3">1</tspan></text></svg> },
			{ id: "h2", tip: "Heading 2",
			  svgEl: <svg width="22" height="18" viewBox="0 0 22 18"><text x="1" y="14" style={{fontSize:13,fontWeight:800,fill:"currentColor",fontFamily:"system-ui,sans-serif"}}>H<tspan fontSize="9" dy="3">2</tspan></text></svg> },
			null,
			{ id: "text", tip: "Paragraph",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg> },
			{ id: "quote", tip: "Blockquote",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg> },
			null,
			{ id: "bullet", tip: "Bullet list",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg> },
			{ id: "numbered", tip: "Numbered list",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 10h2" stroke="currentColor" strokeWidth="1.8"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" stroke="currentColor" strokeWidth="1.8"/></svg> },
			{ id: "todo", tip: "To-do list",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="6" height="6" rx="1"/><polyline points="4 14 6 16 9 13" strokeWidth="2"/><line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="15" x2="21" y2="15"/></svg> },
			null,
			{ id: "code", tip: "Code block",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg> },
			{ id: "table", tip: "Table",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg> },
			{ id: "image", tip: "Image",
			  svgEl: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
		];
		const sep = () => <div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 4px", flexShrink: 0 }} />;
		const blocksToolbar = (
			<div
				ref={blocksMenuRef}
				className="hidescrollbar flex min-w-0 flex-nowrap items-center gap-0 overflow-x-auto overflow-y-visible"
				style={{
					background: "#ffffff",
					padding: "0 6px",
					height: 38,
					flexShrink: 0,
					WebkitOverflowScrolling: "touch",
				}}
			>
				<div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 6px", flexShrink: 0 }} />
				{QUICK_BLOCKS.map((item, i) =>
					item === null ? (
						<React.Fragment key={`sep-${i}`}>{sep()}</React.Fragment>
					) : (
						<motion.button
							key={item.id}
							type="button"
							title={item.tip}
							onClick={() => insertBlock(item.id)}
							whileHover={{ background: "#F0F0F0" }}
							whileTap={{ scale: 0.93 }}
							style={{
								height: 30,
								minWidth: 30,
								padding: "0 5px",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								borderRadius: 7,
								border: "none",
								background: "transparent",
								color: "#555",
								cursor: "pointer",
								flexShrink: 0,
							}}
						>
							{item.svgEl}
						</motion.button>
					),
				)}
				<div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 6px", flexShrink: 0 }} />
				{ADV_CATEGORIES.map((cat) => {
					const isOpen = blocksMenuOpen === cat.key;
					const catItems = DRAFT_SLASH_BASE_ITEMS.filter((i) =>
						cat.ids.includes(i.id),
					);
					return (
						<DraftBlockCategoryDropdown
							key={cat.key}
							cat={cat}
							isOpen={isOpen}
							onToggle={() =>
								setBlocksMenuOpen((v) =>
									v === cat.key ? false : cat.key,
								)
							}
							catItems={catItems}
							onSelectItem={insertBlock}
						/>
					);
				})}
				<div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 4px", flexShrink: 0 }} />
				<motion.button
					type="button"
					onClick={() => insertBlock("ask-ai")}
					whileHover={{ background: "#F0F0F0" }}
					whileTap={{ scale: 0.93 }}
					style={{
						height: 30,
						padding: "0 10px",
						display: "flex",
						alignItems: "center",
						gap: 5,
						borderRadius: 7,
						border: "none",
						background: "transparent",
						color: "#111",
						fontSize: 12,
						fontWeight: 700,
						cursor: "pointer",
						whiteSpace: "nowrap",
						flexShrink: 0,
					}}
				>
					✦ AI
				</motion.button>
				<div style={{ width: 1, height: 20, background: "#E2E2E2", margin: "0 6px", flexShrink: 0 }} />
			</div>
		);
		const actionsToolbar = (
				<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, ...(compactToolbar ? {} : { marginLeft: "auto" }) }}>
					{gIconBtn(() => setDetailsOpen(v => !v), "Document details",
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
						detailsOpen
					)}
					{gIconBtn(() => setThemeDrawerOpen(true), "Themes — preview, download & copy",
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="11" rx="1"/><path d="M7 19h10"/><path d="M12 16v3"/><circle cx="12" cy="10.5" r="2"/></svg>,
						themeDrawerOpen
					)}
					
					<motion.button type="button" onClick={handleSave} whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }} whileTap={{ scale: 0.96 }}
						style={{ height: 30, display: "flex", alignItems: "center", gap: 5, background: saved ? "#EFF6EE" : T.accent, border: "none", borderRadius: 8, padding: "0 12px", fontSize: 12, fontWeight: 700, color: saved ? "#3D7A35" : "white", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
						<Icon d={Icons.save} size={12} stroke={saved ? "#3D7A35" : "white"} />
						{saved ? "Saved!" : "Save"}
					</motion.button>
					<div style={{ position: "relative" }} ref={exportDropRef}>
						<AnimatePresence>
						{exportDropOpen && (
							<motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.13 }}
								style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 200, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 10px 28px rgba(0,0,0,0.12)", zIndex: 400, padding: "6px" }}>
								{[
									{ icon: "📋", label: "Copy as text", action: () => { handleCopy(); setExportDropOpen(false); } },
									{ icon: "🌐", label: "Copy HTML", action: () => { navigator.clipboard.writeText(buildThemedHTML(getContent(), THEMES.ink, getTitle())); setExportDropOpen(false); } },
									{ icon: "⚛️", label: "Copy React", action: () => { navigator.clipboard.writeText(buildThemedReactSnippet(getContent(), "ink", getTitle())); setExportDropOpen(false); } },
									{ icon: "📝", label: "Copy Markdown", action: () => { navigator.clipboard.writeText(htmlToMarkdown(getContent()) || ""); setExportDropOpen(false); } },
								].map(item => (
									<button key={item.label} type="button" onClick={item.action}
										style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, border: "none", background: "transparent", fontSize: 12, color: T.accent, cursor: "pointer" }}
										onMouseEnter={e => { e.currentTarget.style.background = "#F0F0F0"; }}
										onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
										<span>{item.icon}</span>{item.label}
									</button>
								))}
							</motion.div>
						)}
						</AnimatePresence>
					</div>
					<div style={{ position: "relative" }} ref={publishDropRef}>
						<motion.button type="button" onClick={() => setPublishDropOpen(v => !v)} whileHover={{ background: isPublic ? "#EFF6EE" : "#F0F0F0" }} whileTap={{ scale: 0.93 }}
							style={{ display: "flex", alignItems: "center", gap: 5, height: 30, padding: "0 9px", borderRadius: 8, border: `1px solid ${isPublic ? "#8BC57E" : T.border}`, background: isPublic ? "#EFF6EE" : "transparent", color: isPublic ? "#3D7A35" : T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
							<span style={{ width: 6, height: 6, borderRadius: "50%", background: isPublic ? "#3D7A35" : T.border, flexShrink: 0, display: "inline-block" }} />
							{isPublic ? "Published" : "Private"}
							<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
						</motion.button>
						<AnimatePresence>
						{publishDropOpen && (
							<motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.13 }}
								style={{ position: "fixed", top: "50px", right: "20px", width: 320, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 12px 32px rgba(0,0,0,0.14)", zIndex: 300, padding: "16px 16px 14px" }}>
								<p style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>Visibility</p>
								<div className="flex gap-2 mb-4 bg-zinc-50 rounded-xl p-1">
									{[{ val: false, label: "Private", icon: "🔒" }, { val: true, label: "Public", icon: "🌐" }].map(opt => (
										<button key={String(opt.val)} type="button" onClick={() => setIsPublic(opt.val)}
										className={`flex-1 flex items-center justify-center gap-2 p-1.5 rounded-xl text-sm font-medium ${isPublic === opt.val ? (opt.val ? "bg-amber-50 text-amber-700" : "bg-zinc-50 text-zinc-900") : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}>
											{opt.icon} {opt.label}
										</button>
									))}
				</div>
								<p style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Page URL</p>
								<div style={{ display: "flex", alignItems: "center", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
									<span style={{ padding: "7px 8px 7px 10px", fontSize: 11, color: T.muted, whiteSpace: "nowrap", flexShrink: 0 }}>/p/</span>
									<input value={slugInput} onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-"))} placeholder={toSlug(titleRef.current?.innerText?.trim() || draft?.title || "") || draftId}
										style={{ flex: 1, border: "none", background: "transparent", fontSize: 12, fontWeight: 500, color: T.accent, padding: "7px 4px", outline: "none", minWidth: 0 }} />
									<button type="button" onClick={() => { navigator.clipboard.writeText(getPublicUrl(toSlug(slugInput)||undefined)); setPublishCopied(true); setTimeout(()=>setPublishCopied(false),2000); }}
										style={{ padding: "7px 10px", background: "transparent", border: "none", borderLeft: `1px solid ${T.border}`, cursor: "pointer", color: publishCopied ? "#3D7A35" : T.muted, display: "flex", alignItems: "center" }}>
										{publishCopied ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
									</button>
								</div>
								<p style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Published view theme (share link)</p>
								<div style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: publishThemedCopied ? 8 : (!isPublic ? 10 : 6) }}>
									<div style={{ flex: 1, minWidth: 0, alignSelf: "stretch" }}>
										<MotionSelect
											value={publishShareTheme}
											onChange={setPublishShareTheme}
											disabled={!isPublic}
											zIndex={450}
											options={Object.entries(THEMES).map(([k, t]) => ({
												value: k,
												label: t.name,
											}))}
											triggerStyle={{
												flex: 1,
												minWidth: 0,
												padding: "7px 8px",
												borderRadius: 8,
												border: `1px solid ${T.border}`,
												fontSize: 11,
												fontWeight: 500,
												background: isPublic ? T.surface : T.bg,
												color: isPublic ? T.accent : T.muted,
												cursor: isPublic ? "pointer" : "not-allowed",
											}}
											menuStyle={{
												border: `1px solid ${T.border}`,
												background: T.surface,
											}}
											optionStyle={{
												fontSize: 11,
												fontWeight: 500,
											}}
										/>
									</div>
									<button
										type="button"
										disabled={!isPublic}
										onClick={() => {
											if (!isPublic) return;
											navigator.clipboard.writeText(getPublicUrl(toSlug(slugInput) || undefined, publishShareTheme));
											setPublishThemedCopied(true);
											setTimeout(() => setPublishThemedCopied(false), 2000);
										}}
										style={{
											flexShrink: 0,
											padding: "7px 12px",
											borderRadius: 8,
											border: `1px solid ${isPublic ? T.border : T.border}`,
											background: publishThemedCopied ? "#EFF6EE" : T.surface,
											color: publishThemedCopied ? "#3D7A35" : T.accent,
											fontWeight: 600,
											fontSize: 11,
											cursor: isPublic ? "pointer" : "not-allowed",
											whiteSpace: "nowrap",
											opacity: isPublic ? 1 : 0.55,
										}}
									>
										{publishThemedCopied ? "Copied" : "Copy themed link"}
									</button>
								</div>
								{!isPublic && (
									<p style={{ fontSize: 10, color: T.muted, marginTop: -4, marginBottom: 10 }}>
										Publish the post first to generate a shareable theme URL.
									</p>
								)}
								{isPublic && (
									<div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
										<a
											href={getPublicUrl(draft?.slug || undefined)}
											target="_blank"
											rel="noopener noreferrer"
											style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:"#A8A29E",textDecoration:"underline" }}
										>
											Open default layout
										</a>
									</div>
								)}
								<div style={{ display: "flex", justifyContent: "flex-end" }}>
									<button type="button" disabled={publishSaving} onClick={() => savePublishSettings(isPublic, slugInput)}
										style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: isPublic ? "#3D7A35" : T.accent, color: "white", fontWeight: 700, fontSize: 12, cursor: publishSaving ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: publishSaving ? 0.7 : 1 }}>
										{publishSaving && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:"recSpin 0.7s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
										{publishSaving ? "Saving…" : isPublic ? "Publish" : "Save as Private"}
									</button>
								</div>
							</motion.div>
						)}
						</AnimatePresence>
					</div>
				</div>
		);

		if (compactToolbar) {
			return (
				<div className="flex w-full min-w-0 items-center gap-2">
					<div
						className="hidescrollbar min-w-0 overflow-x-auto overflow-y-visible pb-px"
						style={{ WebkitOverflowScrolling: "touch" }}
					>
						{blocksToolbar}
					</div>
					{actionsToolbar}
				</div>
			);
		}

		return (
			<div className="flex min-w-0 items-center gap-2 z-[1000]">
				<div
					className="hidescrollbar min-w-0 overflow-x-auto overflow-y-visible"
					style={{ WebkitOverflowScrolling: "touch" }}
				>
					{blocksToolbar}
				</div>
				{actionsToolbar}
			</div>
		);
	};
	
	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				background: T.base,
				fontFamily: "'Comic', sans-serif",
				overflow: "hidden",
			}}
		>
			<FontLink />

			{/* ── TOP BAR (stack: row 1 tabs + toolbar on wide; row 2 toolbar on compact) ── */}
			<div ref={draftNavHeaderStackRef} style={{ flexShrink: 0, zIndex: 100 }}>
				<div
					style={{
						background: T.surface,
						borderBottom: `1px solid ${T.border}`,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 12,
						flexShrink: 0,
						flexWrap: "nowrap",
						minWidth: 0,
						overflow: "hidden",
						paddingLeft: 20,
						paddingRight: 20,
						paddingTop: 4,
						paddingBottom: 6,
						minHeight: 46,
					}}
				>
				<div className="flex items-center gap-2">
					{/* Logo */}
				<motion.a
					onClick={() => router.push("/")}
					className="home-page-button-link flex items-center gap-2 cursor-pointer"
				>
					<motion.span
						whileHover={{ scale: 1.3 }}
						style={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							background: T.warm,
							display: "inline-block",
						}}
					/>
					inkgest
				</motion.a>

				{/* Sidebar toggle — only when logged in */}
				{reduxUser && (
					<motion.button
						whileHover={{ background: "#F0ECE5" }}
						whileTap={{ scale: 0.93 }}
						title={
							sidebarOpen
								? "Close drafts & assets"
								: "Open drafts & assets"
						}
						onClick={() => setSidebarOpen((s) => !s)}
						style={{
							background: "transparent",
							border: "none",
							borderRadius: 8,
							padding: "6px 8px",
							cursor: "pointer",
						}}
					>
						<Icon d={sidebarOpen ? Icons.chevronL : Icons.chevronR} size={16} />
					</motion.button>
				)}

				<div style={{ width: 1, height: 20, background: T.border }} />

				{/* Tabs — inline in navbar */}
				{draftId && openTabs.length > 0 && (
					<div
						className="flex hidescrollbar min-w-0 flex-nowrap gap-2 items-center overflow-x-auto overscroll-x-contain ml-2 pr-2 sm:ml-8 sm:pr-4"
						style={{
							scrollbarWidth: "thin",
							WebkitOverflowScrolling: "touch",
							maxHeight: 40,
						}}
					>
						{openTabs.map((tabId) => {
							const isActive = tabId === draftId;
							return (
								<motion.div
									key={tabId}
									layout
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									onClick={() =>
										tabId !== draftId && navigateWithTabs(tabId, openTabs)
									}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										padding: "6px 10px 6px 12px",
										borderRadius: 8,
										background: isActive ? T.warmBg : "transparent",
										border: `1px solid ${isActive ? T.border : "transparent"}`,
										cursor: isActive ? "default" : "pointer",
										flexShrink: 0,
										maxWidth: 160,
										boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
										transition: "background 0.15s, border-color 0.15s",
									}}
									whileHover={!isActive ? { background: "#F7F5F0" } : {}}
								>
									<span
										style={{
											fontSize: 12,
											fontWeight: isActive ? 600 : 500,
											color: isActive ? T.accent : T.muted,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											flex: 1,
											minWidth: 0,
										}}
										title={getTabTitle(tabId)}
									>
										{truncate(getTabTitle(tabId), 18)}
									</span>
									<motion.button
										onClick={(e) => closeTab(tabId, e)}
										whileHover={{ background: "rgba(0,0,0,0.06)" }}
										whileTap={{ scale: 0.9 }}
										style={{
											background: "none",
											border: "none",
											borderRadius: 4,
											padding: 2,
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											color: T.muted,
										}}
										title="Close tab"
									>
										<Icon
											d={Icons.close}
											size={12}
											stroke={T.muted}
											strokeWidth={2}
										/>
									</motion.button>
								</motion.div>
							);
						})}
					</div>
				)}
				</div>

				{draft && !(compactAssetsNav && draft) && (
					<div
						className="min-w-0 overflow-visible flex justify-between items-center"
					>
						<TopToolbar draft={draft} compactToolbar={false} />
					</div>
				)}

				</div>

				{compactAssetsNav && draft && (
					<div
						className="overflow-x-auto overflow-y-visible"
						style={{
							display: "flex",
							alignItems: "center",
							background: T.surface,
							borderBottom: `1px solid ${T.border}`,
							paddingLeft: 12,
							paddingRight: 12,
							paddingTop: 2,
							paddingBottom: 8,
							minWidth: 0,
							WebkitOverflowScrolling: "touch",
						}}
					>
						<TopToolbar draft={draft} compactToolbar />
					</div>
				)}

			</div>

			<LoginModal
				isOpen={loginModalOpen}
				onClose={() => setLoginModalOpen(false)}
			/>

			{/* ── MAIN BODY ── */}
			<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
				<AnimatePresence>
					{reduxUser && sidebarOpen && compactAssetsNav && (
						<motion.div
							key="draft-assets-backdrop"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							onClick={() => setSidebarOpen(false)}
							style={{
								position: "fixed",
								inset: 0,
								top: compactNavTopInset,
								background: "rgba(0,0,0,0.35)",
								zIndex: 40,
								backdropFilter: "blur(2px)",
							}}
						/>
					)}
				</AnimatePresence>
				{/* ── LEFT SIDEBAR — only for logged-in users ── */}
				<AnimatePresence initial={false}>
					{reduxUser && sidebarOpen && (
						<motion.aside
							key="draft-sidebar"
							initial={
								compactAssetsNav
									? { x: -300, opacity: 0 }
									: { width: 0, opacity: 0 }
							}
							animate={
								compactAssetsNav
									? { x: 0, opacity: 1 }
									: { width: 280, opacity: 1 }
							}
							exit={
								compactAssetsNav
									? { x: -300, opacity: 0 }
									: { width: 0, opacity: 0 }
							}
							transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
							style={{
								...(compactAssetsNav
									? {
											position: "fixed",
											top: compactNavTopInset,
											left: 0,
											bottom: 0,
											width: 280,
											zIndex: 45,
											boxShadow: "8px 0 32px rgba(0,0,0,0.12)",
										}
									: {}),
								background: T.sidebar,
								borderRight: `1px solid ${T.border}`,
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
								flexShrink: 0,
							}}
						>
							<div
								style={{
									padding: "16px 14px 12px",
									borderBottom: `1px solid ${T.border}`,
									flexShrink: 0,
								}}
							>
								{/* Search + new draft */}
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<div style={{ position: "relative", flex: 1, minWidth: 0 }}>
									<div
										style={{
											position: "absolute",
											left: 10,
											top: "50%",
											transform: "translateY(-50%)",
											pointerEvents: "none",
										}}
									>
										<Icon d={Icons.search} size={13} stroke={T.muted} />
									</div>
									<input
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										placeholder="Search drafts, tables, blog, scrape…"
										style={{
											width: "100%",
											background: T.surface,
											border: `1px solid ${T.border}`,
											borderRadius: 9,
											padding: "7px 10px 7px 30px",
											fontSize: 13,
											color: T.accent,
											outline: "none",
											transition: "border-color 0.2s",
										}}
										onFocus={(e) => (e.target.style.borderColor = T.warm)}
										onBlur={(e) => (e.target.style.borderColor = T.border)}
									/>
									</div>
									<motion.button
										type="button"
										title="New draft"
										whileHover={{ opacity: 0.92 }}
										whileTap={{ scale: 0.96 }}
										onClick={() => router.push("/app")}
										style={{
											flexShrink: 0,
											width: 34,
											height: 34,
											borderRadius: 9,
											border: `1px solid ${T.border}`,
											background: T.accent,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "pointer",
										}}
									>
										<Icon d={Icons.plus} size={14} stroke="#fff" strokeWidth={2} />
									</motion.button>
								</div>
							</div>

							{/* Tasks nav + draft list */}
							<div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
								<AppSidebarTasksNav
									onNavigate={() => {
										if (compactAssetsNav) setSidebarOpen(false);
									}}
								/>
								<AnimatePresence>
									{filtered.length === 0 ? (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											style={{
												textAlign: "center",
												padding: "40px 16px",
												color: T.muted,
											}}
										>
											<p style={{ fontSize: 32, marginBottom: 10 }}>📭</p>
											<p style={{ fontSize: 13, marginBottom: 12 }}>
												No inkgest found
											</p>
											<motion.button
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												onClick={() => router.push("/app")}
												style={{
													fontSize: 12,
													fontWeight: 600,
											color: "#111",
													background: "transparent",
													border: `1px solid ${T.border}`,
													borderRadius: 8,
													padding: "8px 14px",
													cursor: "pointer",
												}}
											>
												Create New →
											</motion.button>
										</motion.div>
									) : (
										filtered.map((d) => (
											<ItemCard
												key={d.id}
												item={d}
												active={d.id === draftId}
												onIconChange={handleSidebarIconChange}
												onRename={handleSidebarRename}
												onClick={() => {
													openDraftInTab(d.id);
													if (compactAssetsNav)
														setSidebarOpen(false);
												}}
												onDelete={handleDelete}
											/>
										))
									)}
								</AnimatePresence>
							</div>

						{/* Sidebar footer — credits + upgrade */}
						{reduxUser && (
							<div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
								{/* Credit bar */}
								<div style={{ marginBottom: 8 }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
										<span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
											{credits?.plan === "pro" ? "Pro plan" : "Free credits"}
										</span>
										<span style={{ fontSize: 11, fontWeight: 700, color: creditRemaining === 0 ? "#EF4444" : T.accent }}>
											{credits?.plan === "pro" ? "∞" : `${credits ? credits.creditsUsed.toFixed(1) : "0"}/${credits?.creditsLimit ?? FREE_CREDIT_LIMIT}`}
										</span>
									</div>
									{credits?.plan !== "pro" && (
										<div style={{ height: 4, background: T.border, borderRadius: 4, overflow: "hidden" }}>
											<div style={{
												height: "100%",
												borderRadius: 4,
												background: creditRemaining === 0 ? "#EF4444" : T.warm,
												width: `${Math.min(100, ((credits?.creditsUsed ?? 0) / (credits?.creditsLimit ?? FREE_CREDIT_LIMIT)) * 100)}%`,
												transition: "width 0.3s",
											}} />
										</div>
									)}
								</div>
								{/* Account — opens same LoginModal account panel as /app */}
								<motion.button
									type="button"
									whileHover={{ opacity: 0.9 }}
									whileTap={{ scale: 0.99 }}
									onClick={() => setLoginModalOpen(true)}
								style={{
										width: "100%",
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "8px 10px",
										marginBottom: 8,
										borderRadius: 8,
										border: `1px solid ${T.border}`,
										background: T.surface,
										cursor: "pointer",
										textAlign: "left",
									}}
								>
									{reduxUser.photoURL ? (
										<img
											src={reduxUser.photoURL}
											alt={reduxUser.displayName || "User"}
											style={{
												width: 30,
												height: 30,
												borderRadius: "50%",
												objectFit: "cover",
												flexShrink: 0,
											}}
										/>
									) : (
										<div
											style={{
												width: 30,
												height: 30,
												borderRadius: "50%",
												background: T.border,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
											}}
										>
											<Icon d={Icons.settings} size={14} stroke={T.muted} />
										</div>
									)}
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												fontSize: 12,
												fontWeight: 600,
												color: T.accent,
												lineHeight: 1.3,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												margin: 0,
											}}
										>
											{reduxUser.displayName || reduxUser.email?.split("@")[0] || "Account"}
										</p>
										<p
											style={{
												fontSize: 11,
												color: T.muted,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												margin: 0,
											}}
										>
											{reduxUser.email}
										</p>
									</div>
								</motion.button>
								{/* Upgrade button */}
								<motion.button
									type="button"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.97 }}
									onClick={() => router.push("/pricing")}
									style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: "none", background: credits?.plan === "pro" ? T.base : T.accent, color: credits?.plan === "pro" ? T.muted : "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
								>
									{credits?.plan === "pro" ? "Manage plan" : "Upgrade to Pro"}
								</motion.button>
							</div>
						)}
						</motion.aside>
					)}
				</AnimatePresence>

				{/* ── CENTER PANEL — Editor ── */}
				<div
					style={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						minWidth: 0,
					}}
				>
					{((!router.isReady || loadingDraft) &&
						!draft &&
						draftId) && (
							<div
								style={{
									flex: 1,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									background: T.surface,
								}}
							>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										gap: 14,
									}}
								>
									<div
										style={{
											width: 32,
											height: 32,
											borderRadius: "50%",
											border: `3px solid ${T.muted}33`,
											borderTop: `3px solid ${T.accent}`,
											animation: "spin 0.8s linear infinite",
											marginBottom: 2,
										}}
									/>
									<div style={{ fontSize: 13, color: T.muted }}>
									Loading…
									</div>
								</div>
		
							</div>
						)}
					{draft && (
						<motion.div
							key={`editor-${draftId}`}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.2 }}
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
							}}
						>
						<DraftDetailsDrawer
							open={detailsOpen}
							onClose={() => setDetailsOpen(false)}
							wordCount={wordCount}
							editorRef={editorRef}
							draft={draft}
							sourceUrl={sourceUrl}
							detailFontOpen={detailFontOpen}
							setDetailFontOpen={setDetailFontOpen}
							editorFont={editorFont}
							setEditorFont={setEditorFont}
							editorFontSize={editorFontSize}
							setEditorFontSize={setEditorFontSize}
							detailStyleOpen={detailStyleOpen}
							setDetailStyleOpen={setDetailStyleOpen}
							editorVariant={editorVariant}
							setEditorVariant={setEditorVariant}
							assetPrompt={assetPrompt}
							setChatOpen={setChatOpen}
						/>

						<div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
					{/* Draft title — inherits variant background so it blends seamlessly */}
					<DraftTitleBlock
						editorVariant={editorVariant}
						editorFont={editorFont}
						editorRef={editorRef}
						titleRef={titleRef}
						draftTitleHtml={draft?.title || ""}
					/>

					{/* Editor body — no independent scroll; parent container scrolls */}
								<div
									ref={editorContainerRef}
									data-editor-root
					data-editor-variant={editorVariant}
									style={{
										"--editor-font-size": `${editorFontSize}px`,
										flex: 1,
										position: "relative",
							backgroundColor:
								editorVariant === "terminal"   ? "#0D1117" :
								editorVariant === "typewriter" ? "#EDE3CC" :
								editorVariant === "paper"      ? "#FEFDF4" :
								editorVariant === "minimal"    ? "#FAFAF8" :
								T.surface,
							// Terminal: faint scanlines via CSS gradient on the container
							backgroundImage:
								editorVariant === "terminal"
									? "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.015) 2px, rgba(0,255,0,0.015) 4px)"
									: editorVariant === "typewriter"
										? "none"
										: "none",
									}}
								>
									
									<div
										ref={editorRef}
										contentEditable
										suppressContentEditableWarning
										onInput={onEditorInput}
										onCompositionEnd={onEditorInput}
										onKeyDown={(e) => {
											if ((e.key === " " || e.code === "Space") && !e.defaultPrevented) {
												const root = editorRef.current;
												const sel = window.getSelection();
												if (root && sel?.rangeCount) {
													const range = sel.getRangeAt(0);
													let node = range.commonAncestorContainer;
													if (node.nodeType === 3) node = node.parentElement;
													const callout = node?.closest?.(
														"[data-block^='callout-']",
													);
													if (callout && root.contains(callout)) {
														const flex = callout.querySelector(
															':scope > div[style*="flex:1"]',
														);
														const bodyDiv =
															flex?.querySelector(":scope > p + div") ||
															flex?.querySelector(":scope > div:last-of-type");
														const bodyText = (
															bodyDiv?.innerText ||
															bodyDiv?.textContent ||
															""
														)
															.replace(/\u00a0/g, " ")
															.trim();
														if (!bodyText) {
															e.preventDefault();
															const p = document.createElement("p");
															p.appendChild(document.createElement("br"));
															callout.replaceWith(p);
															const r = document.createRange();
															r.setStart(p, 0);
															r.collapse(true);
															sel.removeAllRanges();
															sel.addRange(r);
															countWords();
															onEditorInput();
															return;
														}
													}
												}
											}
											if (e.key === "Enter" && !e.shiftKey) {
												const sel = window.getSelection();
												if (sel?.rangeCount && editorRef.current) {
													const range = sel.getRangeAt(0);
													const li =
														range.commonAncestorContainer.nodeType === 3
															? range.commonAncestorContainer.parentElement?.closest(
																	"li",
																)
															: range.commonAncestorContainer.closest?.("li");
													const ul = li?.closest?.('ul[data-todo="true"]');
													if (li && ul && editorRef.current.contains(li)) {
														e.preventDefault();
														const span =
															li.querySelector("span.todo-label") ||
															li.querySelector(":scope > span");
														if (!span) {
															const newLi = document.createElement("li");
															newLi.className = "todo-item";
															newLi.setAttribute(
																"style",
																TODO_LI_STYLE,
															);
															newLi.innerHTML = `<input type="checkbox" class="todo-cb" style="${TODO_CHECKBOX_STYLE}"/><span class="todo-label" style="flex:1;min-width:0"> </span>`;
															ul.insertBefore(newLi, li.nextSibling);
															const ns = newLi.querySelector("span");
															const r = document.createRange();
															const tn = ns?.firstChild;
															if (tn && tn.nodeType === 3) {
																r.setStart(tn, 1);
																r.collapse(true);
															} else {
																r.selectNodeContents(ns);
																r.collapse(true);
															}
															sel.removeAllRanges();
															sel.addRange(r);
														} else {
															const pre = document.createRange();
															pre.selectNodeContents(span);
															pre.setEnd(
																range.startContainer,
																range.startOffset,
															);
															const beforeText = pre.toString();
															const post = document.createRange();
															post.selectNodeContents(span);
															post.setStart(
																range.startContainer,
																range.startOffset,
															);
															const afterText = post.toString();
															span.textContent = beforeText;

															const newLi = document.createElement("li");
															newLi.className = "todo-item";
															newLi.setAttribute(
																"style",
																li.getAttribute("style") || TODO_LI_STYLE,
															);
															const cb = document.createElement("input");
															cb.className = "todo-cb";
															cb.setAttribute("type", "checkbox");
															cb.setAttribute("style", TODO_CHECKBOX_STYLE);
															const newSpan = document.createElement("span");
															newSpan.className = "todo-label";
															newSpan.setAttribute("style", "flex:1;min-width:0");
															const nextText =
																afterText.length > 0 ? afterText : " ";
															newSpan.textContent = nextText;
															newLi.appendChild(cb);
															newLi.appendChild(newSpan);
															ul.insertBefore(newLi, li.nextSibling);

															const r = document.createRange();
															const nc = newSpan.firstChild;
															if (nc && nc.nodeType === 3) {
																const off = afterText.length > 0 ? 0 : 1;
																r.setStart(nc, off);
																r.collapse(true);
															} else {
																r.selectNodeContents(newSpan);
																r.collapse(true);
															}
															sel.removeAllRanges();
															sel.addRange(r);
														}
														countWords();
														return;
													}
												}
											}
									}}
								onDragOver={(e) => {
									if (
										e.dataTransfer?.types &&
										Array.from(e.dataTransfer.types).includes(
											INK_INFOGRAPHIC_DRAG_MIME,
										)
									) {
										e.preventDefault();
										e.dataTransfer.dropEffect = "copy";
										return;
									}
									if (!dragSrcRef.current) return;
									e.preventDefault();
									e.dataTransfer.dropEffect = "move";
									const editor = editorRef.current;
									const container = editorContainerRef.current;
									if (!editor || !container) return;
									let target = e.target;
									if (target.nodeType === 3) target = target.parentElement;
									while (target && target.parentElement !== editor) target = target.parentElement;
									if (!target || target === dragSrcRef.current) { setDropIndicator(null); return; }
									const tgtRect = target.getBoundingClientRect();
									const containerRect = container.getBoundingClientRect();
									const before = e.clientY < tgtRect.top + tgtRect.height / 2;
									const editorRect = editor.getBoundingClientRect();
									dragOverRef.current = { block: target, before };
									setDropIndicator({
										top: (before ? tgtRect.top : tgtRect.bottom) - containerRect.top + container.scrollTop,
										left: editorRect.left - containerRect.left,
										width: editorRect.width,
									});
								}}
								onDragLeave={(e) => {
									if (!editorRef.current?.contains(e.relatedTarget)) {
										setDropIndicator(null);
										dragOverRef.current = null;
									}
								}}
								onDrop={(e) => {
									const editor = editorRef.current;
									if (
										editor &&
										tryInsertMermaidFromDragData(
											editor,
											e.dataTransfer,
										)
									) {
										e.preventDefault();
										if (dragSrcRef.current) {
											dragSrcRef.current.style.opacity = "";
											dragSrcRef.current.style.outline = "";
										}
										dragSrcRef.current = null;
										dragOverRef.current = null;
										setDragHandle(null);
										setDropIndicator(null);
										countWords();
										return;
									}
									if (
										editor &&
										tryInsertInfographicFromDragData(
											editor,
											e.dataTransfer,
										)
									) {
										e.preventDefault();
										if (dragSrcRef.current) {
											dragSrcRef.current.style.opacity = "";
											dragSrcRef.current.style.outline = "";
										}
										dragSrcRef.current = null;
										dragOverRef.current = null;
										setDragHandle(null);
										setDropIndicator(null);
										countWords();
										return;
									}
									const src = dragSrcRef.current;
									if (!src) return;
									e.preventDefault();
									const dropEditor = editorRef.current;
									if (!dropEditor) return;
									const over = dragOverRef.current;
									if (over?.block && over.block !== src) {
										if (over.before) dropEditor.insertBefore(src, over.block);
										else dropEditor.insertBefore(src, over.block.nextSibling);
									}
									src.style.opacity = "";
									src.style.outline = "";
									dragSrcRef.current = null;
									dragOverRef.current = null;
									setDragHandle(null);
									setDropIndicator(null);
									countWords();
										}}
										data-placeholder="Write, or type / for commands…"
										style={{
							maxWidth:
								editorVariant === "minimal" ? 620 :
								editorVariant === "paper"   ? 760 : 720,
											margin: "0 auto",
							padding:
								editorVariant === "minimal"    ? "48px 72px 120px" :
								editorVariant === "paper"      ? "0 48px 100px 0" :
								editorVariant === "typewriter" ? "36px 56px 100px" :
								"36px 48px 100px",
											minHeight: "100%",
											outline: "none",
											fontSize: `${editorFontSize}px`,
							lineHeight:
								editorVariant === "paper"   ? `${Math.round(editorFontSize * 1.75)}px` :
								editorVariant === "minimal" ? 2 : 1.75,
							color:
								editorVariant === "terminal"   ? "#57FF57" :
								editorVariant === "typewriter" ? "#2C1A0E" :
								editorVariant === "paper"      ? "#2A2018" :
								editorVariant === "minimal"    ? "#3D3530" :
								"#37352F",
											fontFamily:
								editorVariant === "typewriter" ? "'Courier New', Courier, monospace" :
								editorVariant === "terminal"   ? "'Fira Code', 'Cascadia Code', 'Courier New', monospace" :
								editorVariant === "minimal"    ? "Georgia, 'Times New Roman', serif" :
								editorFont === "Georgia"       ? "Georgia, serif" :
								editorFont === "system-ui"     ? "system-ui, sans-serif" :
								"'Comic', sans-serif",
							letterSpacing:
								editorVariant === "typewriter" ? "0.06em" :
								editorVariant === "terminal"   ? "0.03em" :
								editorVariant === "minimal"    ? "0.01em" : "normal",
							// backgroundColor (not background shorthand) so CSS background-image for paper lines is NOT overridden
							backgroundColor: "transparent",
										}}
									/>
									<input
										ref={imageFileInputRef}
										type="file"
										accept="image/*,video/*"
										style={{ display: "none" }}
										onChange={handleImageFileSelect}
									/>
							<input
								ref={audioFileInputRef}
								type="file"
								accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
								style={{ display: "none" }}
								onChange={handleAudioFileSelect}
									/>
									{/* Slash command dropdown */}
									<DraftSlashMenu
										slashCommand={slashCommand}
										slashListIndex={slashListIndex}
										handleSlashCommand={handleSlashCommand}
									/>

									{/* ── Drag handle ── */}
								{dragHandle && dragHandle.block && (
									<div
										contentEditable={false}
										draggable
										onDragStart={(e) => {
											dragSrcRef.current = dragHandle.block;
											e.dataTransfer.effectAllowed = "move";
											/* Ghost image: small translucent clone */
											try {
												const ghost = dragHandle.block.cloneNode(true);
												ghost.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0.7;pointer-events:none;max-width:400px;background:#fff;border-radius:8px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.12)";
												document.body.appendChild(ghost);
												e.dataTransfer.setDragImage(ghost, 20, 20);
												setTimeout(() => document.body.removeChild(ghost), 0);
											} catch (_) {}
											dragHandle.block.style.opacity = "0.35";
											dragHandle.block.style.outline = `2px dashed ${T.border}`;
											dragHandle.block.style.borderRadius = "6px";
										}}
										onDragEnd={() => {
											if (dragSrcRef.current) {
												dragSrcRef.current.style.opacity = "";
												dragSrcRef.current.style.outline = "";
												dragSrcRef.current.style.borderRadius = "";
											}
											dragSrcRef.current = null;
											dragOverRef.current = null;
											setDropIndicator(null);
										}}
																			style={{
											position: "absolute",
											left: dragHandle.handleLeft,
											top: dragHandle.top + (dragHandle.height / 2) - 11,
											width: 22,
											height: 22,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											cursor: "grab",
											opacity: 0,
											borderRadius: 5,
											background: "transparent",
											transition: "opacity 0.12s, background 0.12s",
											userSelect: "none",
											zIndex: 20,
											color: "#B0AAA3",
										}}
										title="Drag to reorder"
										onMouseEnter={(e) => {
											e.currentTarget.style.opacity = "1";
											e.currentTarget.style.background = "#F0ECE5";
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.opacity = "0";
											e.currentTarget.style.background = "transparent";
										}}
										/* make it visible when parent block is hovered */
										ref={(el) => {
											if (el && dragHandle.block) {
												const show = () => { el.style.opacity = "1"; };
												const hide = () => { if (!dragSrcRef.current) el.style.opacity = "0"; };
												dragHandle.block.addEventListener("mouseenter", show);
												dragHandle.block.addEventListener("mouseleave", hide);
											}
										}}
									>
										{/* 6-dot grip */}
										<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
											<circle cx="4.5" cy="3.5" r="1.2" fill="#9A9490"/>
											<circle cx="4.5" cy="7" r="1.2" fill="#9A9490"/>
											<circle cx="4.5" cy="10.5" r="1.2" fill="#9A9490"/>
											<circle cx="9.5" cy="3.5" r="1.2" fill="#9A9490"/>
											<circle cx="9.5" cy="7" r="1.2" fill="#9A9490"/>
											<circle cx="9.5" cy="10.5" r="1.2" fill="#9A9490"/>
										</svg>
									</div>
								)}

								{/* ── Drop indicator line ── */}
								{dropIndicator && (
									<div
										contentEditable={false}
										style={{
											position: "absolute",
											top: dropIndicator.top - 1,
											left: dropIndicator.left,
											width: dropIndicator.width,
											height: 2,
											background: T.warm,
											borderRadius: 2,
											zIndex: 30,
											pointerEvents: "none",
											boxShadow: `0 0 0 3px ${T.warm}22`,
										}}
									/>
								)}

								<DraftIconPickerPortal
									iconPicker={iconPicker}
									pickerRef={iconPickerRef}
									targetRef={iconPickerTargetRef}
									editorRef={editorRef}
									selectionSavedRangeRef={selectionSavedRangeRef}
									restoreEditorSelection={restoreEditorSelection}
									countWords={countWords}
									onClose={closeIconPicker}
									onInlineInserted={() => {
										setSelectionDropdown(null);
										setSelectionSubtool(null);
									}}
								/>

									<DraftEditorOverlays
									draftSlashDatePickerPos={draftSlashDatePickerPos}
									datePickerInitial={datePickerInitial}
									insertDraftDateAtCursor={insertDraftDateAtCursor}
									onDatePickerClose={() => {
										dateEditTargetRef.current = null;
										setDraftSlashDatePickerPos(null);
									}}
									draftImageModalOpen={draftImageModalOpen}
									draftImageModalUrl={draftImageModalUrl}
									setDraftImageModalUrl={setDraftImageModalUrl}
									setDraftImageModalOpen={setDraftImageModalOpen}
									imageUploading={imageUploading}
									imageFileInputRef={imageFileInputRef}
									confirmDraftImageFromUrl={confirmDraftImageFromUrl}
									audioModalOpen={audioModalOpen}
									setAudioModalOpen={setAudioModalOpen}
									audioUploading={audioUploading}
									audioFileInputRef={audioFileInputRef}
									recordingOpen={recordingOpen}
									recordingMode={recordingMode}
									setRecordingMode={setRecordingMode}
									recordingState={recordingState}
									recordingSeconds={recordingSeconds}
									transcriptFinal={transcriptFinal}
									transcriptInterim={transcriptInterim}
									handleRecordingCancel={handleRecordingCancel}
									handleRecordingDone={handleRecordingDone}
									embedModalOpen={embedModalOpen}
									embedUrlInput={embedUrlInput}
									setEmbedUrlInput={setEmbedUrlInput}
									embedResolved={embedResolved}
									setEmbedResolved={setEmbedResolved}
									setEmbedModalOpen={setEmbedModalOpen}
									editorRef={editorRef}
									embedRangeRef={embedRangeRef}
									countWords={countWords}
								/>

									<DraftSelectionToolbar
									selectionDropdown={selectionDropdown}
									setSelectionDropdown={setSelectionDropdown}
									selectionSubtool={selectionSubtool}
									setSelectionSubtool={setSelectionSubtool}
									selectionLinkUrl={selectionLinkUrl}
									setSelectionLinkUrl={setSelectionLinkUrl}
									selectionLinkInputRef={selectionLinkInputRef}
									setSelectionContext={setSelectionContext}
									setChatOpen={setChatOpen}
									editorRef={editorRef}
									titleRef={titleRef}
									draft={draft}
									restoreEditorSelection={restoreEditorSelection}
									selectionSavedRangeRef={selectionSavedRangeRef}
									countWords={countWords}
									applyDraftBubbleInlineStyle={applyDraftBubbleInlineStyle}
									execDraftForeColor={execDraftForeColor}
									execDraftHiliteColor={execDraftHiliteColor}
									unwrapDraftInlineSpan={unwrapDraftInlineSpan}
									openIconPickerAtPoint={openIconPickerAtPoint}
									iconPicker={iconPicker}
									closeIconPicker={closeIconPicker}
									getSelectionLinkContext={getSelectionLinkContext}
								/>

																	</div>
							</div>

						</motion.div>
					)}
					
				</div>

				{/* ── RIGHT PANEL — AI Chat (inline, not overlay) ── */}
				<AIChatSidebar
					open={chatOpen}
					onClose={() => {
						setChatOpen(false);
						setSelectionContext("");
					}}
					onClearSelectionContext={() => setSelectionContext("")}
					editorRef={editorRef}
					draftContent={stripDraftSlashQueryFromHtmlString(
						editorRef.current?.innerHTML || draft?.body || "",
					)}
					draftTitle={draft?.title || "Draft"}
					userId={reduxUser?.uid || ""}
					onAgentDraftCreated={(newDraftId) =>
						router.push(`/app/${newDraftId}`)
					}
					selectionContext={selectionContext}
					asPanel={!compactAssetsNav}
					clampOverlayToViewport={compactAssetsNav}
				/>
			</div>

			<DraftPagePortals
				previewExport={{
					open: themeDrawerOpen,
					onClose: closeThemeDrawer,
					editorRef,
					titleRef,
					draft,
					previewTheme,
					setPreviewTheme,
					translatedHTML,
					translationLang,
					setTranslationLang,
					themeExportOpen,
					setThemeExportOpen,
					themeExportRef,
					copiedTheme,
					setCopiedTheme,
					copiedPubThemeRow,
					setCopiedPubThemeRow,
					isPublic,
					slugInput,
					toSlug,
					getPublicUrl,
					onCopyThemeHTML: handleCopyThemeHTML,
					onCopyThemeReact: handleCopyThemeReact,
					onTranslate: draftTranslation.handleTranslate,
					onSaveTranslation: draftTranslation.handleSaveTranslation,
					onShowOriginal: draftTranslation.handleShowOriginal,
					translating: draftTranslation.translating,
					savingTranslation: draftTranslation.savingTranslation,
					translationError: draftTranslation.translationError,
					translationSaved: draftTranslation.translationSaved,
					savedLangs: draftTranslation.savedLangs,
					creditEstimate: draftTranslation.creditEstimate,
					blogAudio: draftBlogAudio,
				}}
				exportThemes={{
					open: translationModalOpen,
					onClose: closeTranslationModal,
					editorRef,
					titleRef,
					draft,
					previewTheme,
					setPreviewTheme,
					translatedHTML,
					copiedTheme,
					setCopiedTheme,
					translationCopyOpen,
					setTranslationCopyOpen,
					translationCopyRef,
				}}
			/>

			<DeleteConfirmModal
				open={Boolean(deleteConfirm)}
				onClose={() => setDeleteConfirm(null)}
				onConfirm={confirmDelete}
			/>

		</div>
	);
}
