import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Side effects for the draft editor page (kept out of DraftPage.jsx).
 * Behavior matches the previous inline useEffect / useLayoutEffect blocks.
 */
export function useDraftPageRuntime({
	router,
	draftId,
	tabsQuery,
	openTabs,
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
	themeExportOpen,
	themeExportRef,
	setThemeExportOpen,
	translationCopyOpen,
	translationCopyRef,
	setTranslationCopyOpen,
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
	setDragHandle,
	dateEditTargetRef,
	setDatePickerInitial,
	getSelectionLinkContext,
	isNodeInEditor,
	getDraftSlashFlatRows,
	handleSlashCommandRef,
}) {
	const routerReady = router.isReady;
	const hydratedDraftIdRef = useRef(null);

	/* URL tabs query sync */
	useEffect(() => {
		if (!draftId || !routerReady) return;
		const fromQuery =
			typeof tabsQuery === "string" ? tabsQuery.split(",").filter(Boolean) : [];
		if (fromQuery.length === 0 && openTabs.length > 0) {
			router.replace(`/app/${draftId}?tabs=${openTabs.join(",")}`, undefined, {
				shallow: true,
			});
		}
	}, [draftId, routerReady, tabsQuery, openTabs, router]);

	/* Sync publish fields and table editor state from loaded doc */
	useEffect(() => {
		if (draft) {
			setIsPublic(draft.isPublic ?? false);
			setSlugInput(draft.slug ?? "");
		}
	}, [draft?.id, draft?.isPublic, draft?.slug, setIsPublic, setSlugInput]);

	useEffect(() => {
		if (tableDoc) {
			setLocalTableData({
				title: tableDoc.title,
				description: tableDoc.description,
				columns: tableDoc.columns || [],
				rows: tableDoc.rows || [],
				sourceUrls: tableDoc.sourceUrls || [],
				prompt: tableDoc.prompt || "",
			});
		} else {
			setLocalTableData(null);
		}
	}, [draftId, tableDoc?.id, tableDoc, setLocalTableData]);

	/* Hydrate editor when draft document changes */
	useLayoutEffect(() => {
		const el = editorRef.current;
		if (!el || !draft?.id) return;
		if (hydratedDraftIdRef.current === draft.id) return;
		hydratedDraftIdRef.current = draft.id;
		el.innerHTML = formatBody(draft.body || "");
		normalizeTodoLists(el);
		migrateCalloutIconSelectors(el);
		countWords();
	}, [
		draft?.id,
		draft?.body,
		formatBody,
		normalizeTodoLists,
		migrateCalloutIconSelectors,
		countWords,
		editorRef,
	]);

	/* Compact assets nav top inset */
	useLayoutEffect(() => {
		const measure = () => {
			const el = draftNavHeaderStackRef.current;
			const n = el ? Math.round(el.getBoundingClientRect().bottom) : 56;
			setCompactNavTopInset(Math.max(n, 48));
		};
		measure();
		let ro;
		if (
			typeof ResizeObserver !== "undefined" &&
			draftNavHeaderStackRef.current
		) {
			ro = new ResizeObserver(measure);
			ro.observe(draftNavHeaderStackRef.current);
		}
		window.addEventListener("resize", measure);
		return () => {
			window.removeEventListener("resize", measure);
			ro?.disconnect();
		};
	}, [compactAssetsNav, draft?.id, draftId, draftNavHeaderStackRef, setCompactNavTopInset]);

	/* Unified outside-click dismiss for dropdowns / popovers */
	useEffect(() => {
		const handlers = [];
		/* icon picker dismisses on click (not mousedown) so chip onclick can open first */
		if (previewExportOpen) {
			handlers.push({
				isInside: (t) => previewExportRef.current?.contains(t),
				close: () => setPreviewExportOpen(false),
			});
		}
		if (themeExportOpen) {
			handlers.push({
				isInside: (t) => themeExportRef.current?.contains(t),
				close: () => setThemeExportOpen(false),
			});
		}
		if (translationCopyOpen) {
			handlers.push({
				isInside: (t) => translationCopyRef.current?.contains(t),
				close: () => setTranslationCopyOpen(false),
			});
		}
		if (publishDropOpen) {
			handlers.push({
				isInside: (t) => publishDropRef.current?.contains(t),
				close: () => setPublishDropOpen(false),
			});
		}
		if (exportDropOpen) {
			handlers.push({
				isInside: (t) => exportDropRef.current?.contains(t),
				close: () => setExportDropOpen(false),
			});
		}
		if (blocksMenuOpen) {
			handlers.push({
				isInside: (t) => blocksMenuRef.current?.contains(t),
				close: () => setBlocksMenuOpen(false),
			});
		}
		if (blockMenuOpen) {
			handlers.push({
				isInside: (t) => !!t.closest?.("[data-block-menu]"),
				close: () => setBlockMenuOpen(false),
			});
		}
		if (imageDropdownOpen) {
			handlers.push({
				isInside: (t) => !!t.closest?.("[data-image-dropdown]"),
				close: () => setImageDropdownOpen(false),
			});
		}
		const onDown = (e) => {
			const t = e.target;
			for (const h of handlers) {
				const inside = h.isInside(t);
				if (!inside) h.close();
			}
		};
		if (handlers.length) document.addEventListener("mousedown", onDown);

		if (!handlers.length) return undefined;

		return () => document.removeEventListener("mousedown", onDown);
	}, [
		previewExportOpen,
		themeExportOpen,
		translationCopyOpen,
		publishDropOpen,
		exportDropOpen,
		blocksMenuOpen,
		blockMenuOpen,
		imageDropdownOpen,
		previewExportRef,
		themeExportRef,
		translationCopyRef,
		publishDropRef,
		exportDropRef,
		blocksMenuRef,
		setPreviewExportOpen,
		setThemeExportOpen,
		setTranslationCopyOpen,
		setPublishDropOpen,
		setExportDropOpen,
		setBlocksMenuOpen,
		setBlockMenuOpen,
		setImageDropdownOpen,
	]);

	/* Editor DOM: delegation, drag handle, image popover close */
	useEffect(() => {
		const el = editorRef.current;
		const container = editorContainerRef.current;
		if (!el) return;

		const resolveTarget = (raw) =>
			raw && raw.nodeType === 1 ? raw : raw?.parentElement;

		const handleEditorPointerDown = (e) => {
			const target = resolveTarget(e.target);
			if (!target || !el.contains(target)) return;

			const dateChip = target.closest?.("[data-ink-date]");
			if (dateChip) {
				e.preventDefault();
				e.stopPropagation();
				const iso = dateChip.getAttribute("data-ink-date");
				const parsed = iso ? new Date(iso) : new Date();
				const rect = dateChip.getBoundingClientRect();
				dateEditTargetRef.current = dateChip;
				setDatePickerInitial(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
				setDraftSlashDatePickerPos({
					left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
					top: rect.bottom + 6,
				});
			}
		};

		const handleClick = (e) => {
			const raw = e.target;
			const target =
				raw && raw.nodeType === 1 ? raw : raw?.parentElement;
			const copyBtn = target?.closest?.('[data-action="copy-code"]');
			if (copyBtn) {
				e.preventDefault();
				const block = copyBtn.closest('[data-block="code"]');
				const code = block?.querySelector("code");
				if (code) {
					navigator.clipboard.writeText(code.innerText).catch(() => {});
					const btn = copyBtn;
					const prev = btn.textContent;
					btn.textContent = "Copied!";
					btn.style.color = "#10B981";
					btn.style.borderColor = "#10B981";
					setTimeout(() => {
						btn.textContent = prev;
						btn.style.color = "";
						btn.style.borderColor = "";
					}, 1800);
				}
				return;
			}
			const fitBtn = target?.closest?.("[data-draft-img-fit]");
			if (fitBtn) {
				e.preventDefault();
				e.stopPropagation();
				const fig = fitBtn.closest("[data-draft-image-wrap]");
				const img = fig?.querySelector("img[data-draft-img]");
				const v = fitBtn.getAttribute("data-draft-img-fit");
				if (img && v) {
					img.style.objectFit = v;
					if (v === "cover" || v === "fill") img.style.minHeight = "260px";
					else img.style.minHeight = "";
				}
				fitBtn.closest("details")?.removeAttribute("open");
				return;
			}
			const sizeBtn = target?.closest?.("[data-draft-img-size]");
			if (sizeBtn) {
				e.preventDefault();
				e.stopPropagation();
				const fig = sizeBtn.closest("[data-draft-image-wrap]");
				const frame = fig?.querySelector("[data-draft-image-frame]");
				const v = sizeBtn.getAttribute("data-draft-img-size");
				if (frame && v) {
					frame.style.width = `${v}%`;
					frame.style.maxWidth = "100%";
					frame.style.marginLeft = "auto";
					frame.style.marginRight = "auto";
				}
				sizeBtn.closest("details")?.removeAttribute("open");
				return;
			}
			const draftTabBtn = target?.closest?.('[data-action="draft-tab"]');
			if (draftTabBtn) {
				e.preventDefault();
				const wrap = draftTabBtn.closest('[data-block="tabs"]');
				if (!wrap) return;
				const idx = draftTabBtn.getAttribute("data-tab-idx");
				wrap.querySelectorAll("[data-draft-panel]").forEach((p) => {
					p.style.display =
						p.getAttribute("data-draft-panel") === idx ? "block" : "none";
				});
				wrap.querySelectorAll("[data-action='draft-tab']").forEach((b) => {
					const on = b.getAttribute("data-tab-idx") === idx;
					b.style.background = on ? "#fff" : "transparent";
					b.style.boxShadow = on ? "0 1px 2px rgba(0,0,0,0.06)" : "none";
					b.style.fontWeight = on ? "600" : "500";
					b.style.color = on ? "#37352F" : "#7A7570";
				});
				return;
			}
			const cgTabBtn = target?.closest?.('[data-action="cg-tab"]');
			if (cgTabBtn) {
				e.preventDefault();
				const wrap = cgTabBtn.closest('[data-block="code-group"]');
				if (!wrap) return;
				const idx = cgTabBtn.getAttribute("data-cg-idx");
				wrap.querySelectorAll("[data-cg-panel]").forEach((p) => {
					p.style.display =
						p.getAttribute("data-cg-panel") === idx ? "block" : "none";
				});
				wrap.querySelectorAll("[data-action='cg-tab']").forEach((b) => {
					const on = b.getAttribute("data-cg-idx") === idx;
					b.style.background = on ? "#fff" : "transparent";
					b.style.fontWeight = on ? "700" : "600";
					b.style.color = on ? "#37352F" : "#6B6560";
				});
				return;
			}
		};

		const handleChange = () => {};

		const onDocMouseDown = (ev) => {
			if (ev.target.closest?.("details[data-draft-img-popover]")) return;
			el.querySelectorAll("details[data-draft-img-popover][open]").forEach((d) => {
				d.removeAttribute("open");
			});
		};

		const handleMouseMove = (e) => {
			if (dragSrcRef.current) return;
			const editorEl = editorRef.current;
			const containerEl = editorContainerRef.current;
			if (!editorEl || !containerEl) return;
			let node = e.target;
			if (node.nodeType === 3) node = node.parentElement;
			while (node && node.parentElement !== editorEl) node = node.parentElement;
			if (!node || !editorEl.contains(node)) {
				setDragHandle(null);
				return;
			}
			const tag = node.nodeName.toLowerCase();
			if (["br", "span", "a", "strong", "em", "code", "input"].includes(tag)) {
				setDragHandle(null);
				return;
			}
			const containerRect = containerEl.getBoundingClientRect();
			const editorRect = editorEl.getBoundingClientRect();
			const nodeRect = node.getBoundingClientRect();
			const top = nodeRect.top - containerRect.top + containerEl.scrollTop;
			const handleLeft = editorRect.left - containerRect.left - 28;
			setDragHandle({
				top,
				handleLeft: Math.max(2, handleLeft),
				block: node,
				height: nodeRect.height,
			});
		};

		const handleMouseLeave = () => {
			if (!dragSrcRef.current) setDragHandle(null);
		};

		document.addEventListener("mousedown", onDocMouseDown);
		container?.addEventListener("mousedown", handleEditorPointerDown, true);
		el.addEventListener("click", handleClick);
		el.addEventListener("change", handleChange);
		el.addEventListener("mousemove", handleMouseMove);
		el.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			document.removeEventListener("mousedown", onDocMouseDown);
			container?.removeEventListener("mousedown", handleEditorPointerDown, true);
			el.removeEventListener("click", handleClick);
			el.removeEventListener("change", handleChange);
			el.removeEventListener("mousemove", handleMouseMove);
			el.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [
		draft?.id,
		dateEditTargetRef,
		editorContainerRef,
		editorRef,
		setDatePickerInitial,
		setDraftSlashDatePickerPos,
	]);

	/* Selection toolbar on mouseup */
	useEffect(() => {
		const handleMouseUp = (e) => {
			if (e?.target?.closest?.("[data-selection-dropdown]")) return;
			const ed = editorRef.current;
			if (!ed) return;
			const sel = window.getSelection();
			if (!sel || sel.rangeCount === 0) {
				setSelectionDropdown(null);
				return;
			}
			const { href: linkHref, anchor: linkAnchor, collapsed } =
				getSelectionLinkContext(sel);
			const textTrim = sel.toString().trim();
			const collapsedInLink = collapsed && linkAnchor;
			if (!textTrim && !collapsedInLink) {
				setSelectionDropdown(null);
				return;
			}
			const inEditor =
				isNodeInEditor(sel.anchorNode, ed) || isNodeInEditor(sel.focusNode, ed);
			if (!inEditor) {
				setSelectionDropdown(null);
				return;
			}
			try {
				const range = sel.getRangeAt(0);
				const rect = range.getBoundingClientRect();
				if (rect.width === 0 && rect.height === 0 && !collapsedInLink) return;
				selectionSavedRangeRef.current = range.cloneRange();
				setSelectionSubtool(null);
				setSelectionLinkUrl(linkHref);
				const toolbarText =
					textTrim || (linkAnchor ? (linkAnchor.textContent || "").trim() : "");
				setSelectionDropdown({
					text: toolbarText,
					x: Math.max(
						8,
						Math.min(rect.left + rect.width / 2 - 200, window.innerWidth - 420),
					),
					top: rect.top - 48,
				});
			} catch {
				setSelectionDropdown(null);
			}
		};
		document.addEventListener("mouseup", handleMouseUp);
		return () => document.removeEventListener("mouseup", handleMouseUp);
	}, [
		editorRef,
		getSelectionLinkContext,
		isNodeInEditor,
		selectionSavedRangeRef,
		setSelectionDropdown,
		setSelectionLinkUrl,
		setSelectionSubtool,
	]);

	useEffect(() => {
		if (!selectionDropdown) return;
		const close = (e) => {
			if (!e.target.closest("[data-selection-dropdown]"))
				setSelectionDropdown(null);
		};
		const t = setTimeout(() => document.addEventListener("mousedown", close), 50);
		return () => {
			clearTimeout(t);
			document.removeEventListener("mousedown", close);
		};
	}, [selectionDropdown, setSelectionDropdown]);

	useLayoutEffect(() => {
		if (selectionSubtool !== "link") return;
		const id = requestAnimationFrame(() => {
			selectionLinkInputRef.current?.focus();
		});
		return () => cancelAnimationFrame(id);
	}, [selectionSubtool, selectionLinkInputRef]);

	useEffect(() => {
		if (!slashCommand) return;
		slashListIndexRef.current = 0;
		setSlashListIndex(0);
	}, [slashCommand?.query, slashCommand, slashListIndexRef, setSlashListIndex]);

	useLayoutEffect(() => {
		if (!slashCommand) return;
		const el = document.querySelector("[data-slash-active='true']");
		el?.scrollIntoView({ block: "nearest" });
	}, [slashCommand, slashListIndex]);

	useEffect(() => {
		if (!slashCommand) return;
		const onKey = (e) => {
			const cmd = slashCommandRef.current;
			if (!cmd) return;
			if (e.key === "Escape") {
				setSlashCommand(null);
				return;
			}
			const rows = getDraftSlashFlatRows(cmd.query);
			if (!rows.length) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				const next = (slashListIndexRef.current + 1) % rows.length;
				slashListIndexRef.current = next;
				setSlashListIndex(next);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				const next =
					(slashListIndexRef.current - 1 + rows.length) % rows.length;
				slashListIndexRef.current = next;
				setSlashListIndex(next);
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				const row = rows[slashListIndexRef.current];
				if (row) handleSlashCommandRef.current?.(row.id);
			}
		};
		const onDown = (e) => {
			if (e.target.closest?.("[data-slash-menu]")) return;
			setSlashCommand(null);
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onDown);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onDown);
		};
	}, [
		slashCommand,
		slashCommandRef,
		slashListIndexRef,
		setSlashCommand,
		setSlashListIndex,
		getDraftSlashFlatRows,
		handleSlashCommandRef,
	]);

	useEffect(() => {
		if (!draftSlashDatePickerPos) return;
		const onKey = (e) => {
			if (e.key === "Escape") setDraftSlashDatePickerPos(null);
		};
		const onDown = (e) => {
			if (e.target.closest?.("[data-draft-date-picker]")) return;
			setDraftSlashDatePickerPos(null);
		};
		document.addEventListener("keydown", onKey);
		const t = setTimeout(
			() => document.addEventListener("mousedown", onDown),
			0,
		);
		return () => {
			document.removeEventListener("keydown", onKey);
			clearTimeout(t);
			document.removeEventListener("mousedown", onDown);
		};
	}, [draftSlashDatePickerPos, setDraftSlashDatePickerPos]);

	useEffect(() => {
		if (!draftImageModalOpen) return;
		const onKey = (e) => {
			if (e.key === "Escape") {
				setDraftImageModalOpen(false);
				setDraftImageModalUrl("");
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [draftImageModalOpen, setDraftImageModalOpen, setDraftImageModalUrl]);
}
