import React, { useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Settings, Plus, Trash2, X } from "lucide-react";

/**
 * Single tab panel — holds normal block content (paragraphs, lists, headings, images, etc.).
 * Only valid inside `tabGroup` (schema content: tabPanel+).
 */
export const TabPanel = Node.create({
	name: "tabPanel",
	group: "tabPanel",
	content: "block+",
	defining: true,
	isolating: true,
	attrs: {
		title: { default: "Tab" },
	},
	parseHTML() {
		return [{ tag: 'div[data-type="tab-panel"]' }];
	},
	renderHTML({ HTMLAttributes, node }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, {
				"data-type": "tab-panel",
				"data-tab-title": node.attrs.title,
				class: "tiptap-tab-panel min-h-[3.5rem]",
			}),
			0,
		];
	},
});

function applyTabPanelVisibility(root, activeIdx) {
	if (!root) return;
	const panels = root.querySelectorAll(
		'[data-type="tab-panel"], .tiptap-tab-panel',
	);
	const list = panels.length > 0 ? panels : root.children;
	Array.from(list).forEach((el, i) => {
		el.style.display = i === activeIdx ? "block" : "none";
	});
}

function TabGroupView({ node, editor, getPos, updateAttributes }) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);
	const panelsRootRef = useRef(null);

	const childCount = node.childCount;
	const rawActive = node.attrs.activeIndex ?? 0;
	const activeIdx = Math.min(
		Math.max(0, rawActive),
		Math.max(0, childCount - 1),
	);

	const selectTab = (index) => {
		const next = Math.min(Math.max(0, index), Math.max(0, childCount - 1));
		const pos = typeof getPos === "function" ? getPos() : null;
		if (pos != null) {
			editor.commands.command(({ tr }) => {
				const current = tr.doc.nodeAt(pos);
				if (!current || current.type.name !== "tabGroup") return false;
				tr.setNodeMarkup(pos, undefined, {
					...current.attrs,
					activeIndex: next,
				});
				return true;
			});
		} else {
			updateAttributes({ activeIndex: next });
		}
		applyTabPanelVisibility(panelsRootRef.current, next);
	};

	useEffect(() => {
		if (rawActive !== activeIdx && childCount > 0) {
			updateAttributes({ activeIndex: activeIdx });
		}
	}, [rawActive, activeIdx, childCount, updateAttributes]);

	useEffect(() => {
		applyTabPanelVisibility(panelsRootRef.current, activeIdx);
	}, [activeIdx, childCount, node.content.size]);

	useEffect(() => {
		if (!menuOpen) return;
		const onDown = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [menuOpen]);

	const setTabTitle = (tabIndex, title) => {
		const base = typeof getPos === "function" ? getPos() : null;
		if (base == null) return;
		let childPos = base + 1;
		for (let i = 0; i < tabIndex; i++) {
			childPos += node.child(i).nodeSize;
		}
		const panel = node.child(tabIndex);
		const next = (title || "").trim() || `Tab ${tabIndex + 1}`;
		const tr = editor.state.tr.setNodeMarkup(childPos, undefined, {
			...panel.attrs,
			title: next,
		});
		editor.view.dispatch(tr);
	};

	const deleteGroup = () => {
		const pos = typeof getPos === "function" ? getPos() : null;
		if (pos == null) return;
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.run();
	};

	const addTab = () => {
		const pos = typeof getPos === "function" ? getPos() : null;
		if (pos == null) return;
		const insertAt = pos + node.nodeSize - 1;
		const nextTitle = `Tab ${childCount + 1}`;
		editor
			.chain()
			.focus()
			.insertContentAt(insertAt, {
				type: "tabPanel",
				attrs: { title: nextTitle },
				content: [{ type: "paragraph" }],
			})
			.run();
		selectTab(childCount);
		setMenuOpen(false);
	};

	const removeTabAt = (index) => {
		if (childCount <= 1) {
			deleteGroup();
			return;
		}
		const pos = typeof getPos === "function" ? getPos() : null;
		if (pos == null) return;
		let from = pos + 1;
		for (let i = 0; i < index; i++) {
			from += node.child(i).nodeSize;
		}
		const to = from + node.child(index).nodeSize;
		let nextActive = activeIdx;
		if (index < activeIdx) nextActive = activeIdx - 1;
		else if (index === activeIdx) nextActive = Math.min(activeIdx, childCount - 2);
		editor.chain().focus().deleteRange({ from, to }).run();
		selectTab(Math.max(0, nextActive));
		setMenuOpen(false);
	};

	return (
		<NodeViewWrapper
			className="my-6 border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm"
			data-node-type="tabGroup"
			style={{ position: "relative" }}
		>
			<div
				className="flex items-stretch border-b border-zinc-200 bg-zinc-50 min-h-[40px]"
				data-ink-tab-chrome
				contentEditable={false}
			>
				<div className="flex flex-1 min-w-0 overflow-x-auto">
					{Array.from({ length: childCount }, (_, i) => {
						const title = node.child(i).attrs.title || `Tab ${i + 1}`;
						const isActive = i === activeIdx;
						return (
							<div
								key={i}
								role="tab"
								aria-selected={isActive}
								className={`shrink-0 flex items-center border-r border-zinc-200 min-w-[88px] max-w-[200px] ${
									isActive
										? "bg-white border-b-2 border-b-zinc-500 -mb-px"
										: "bg-transparent hover:bg-zinc-100/80"
								}`}
								onPointerDown={(e) => {
									if (e.target.closest("input, button")) return;
									e.preventDefault();
									e.stopPropagation();
									selectTab(i);
								}}
							>
								<input
									type="text"
									key={`tab-label-${i}-${title}`}
									defaultValue={title}
									onBlur={(e) => setTabTitle(i, e.target.value)}
									onPointerDown={(e) => e.stopPropagation()}
									onMouseDown={(e) => e.stopPropagation()}
									onClick={(e) => {
										e.stopPropagation();
										if (!isActive) selectTab(i);
									}}
									onFocus={() => {
										if (!isActive) selectTab(i);
									}}
									className={`w-full px-3 py-2 text-xs font-medium bg-transparent border-none outline-none min-w-0 ${
										isActive ? "text-zinc-900" : "text-zinc-600"
									}`}
									aria-label={`Tab ${i + 1} name`}
								/>
							</div>
						);
					})}
				</div>
				<div className="relative flex items-center shrink-0 pr-1 gap-0.5" ref={menuRef}>
					<button
						type="button"
						className="p-1.5 rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
						title="Remove tab group"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => deleteGroup()}
					>
						<Trash2 className="w-3.5 h-3.5" />
					</button>
					<button
						type="button"
						className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-200/80 transition-colors"
						title="Tab group options"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => setMenuOpen(!menuOpen)}
					>
						<Settings className="w-3.5 h-3.5" />
					</button>
					{menuOpen && (
						<div
							className="absolute top-full right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg min-w-[200px] py-1 z-[1002]"
							onMouseDown={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-zinc-50"
								onClick={addTab}
							>
								<Plus className="w-3.5 h-3.5 text-zinc-600" />
								Add tab
							</button>
							<button
								type="button"
								className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-zinc-50 disabled:opacity-40"
								disabled={childCount <= 1}
								onClick={() => removeTabAt(activeIdx)}
							>
								<X className="w-3.5 h-3.5 text-zinc-600" />
								Remove current tab
							</button>
							<div className="border-t border-zinc-100 my-1" />
							<button
								type="button"
								className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-red-50 text-red-600"
								onClick={() => {
									deleteGroup();
									setMenuOpen(false);
								}}
							>
								<Trash2 className="w-3.5 h-3.5" />
								Delete tab group
							</button>
						</div>
					)}
				</div>
			</div>
			<div
				ref={panelsRootRef}
				className="px-4 py-3 bg-[#FAFAF8] [&_.tiptap-tab-panel]:rounded-xl [&_.tiptap-tab-panel]:bg-white [&_.tiptap-tab-panel]:border [&_.tiptap-tab-panel]:border-zinc-100 [&_.tiptap-tab-panel]:px-3 [&_.tiptap-tab-panel]:py-2"
			>
				<NodeViewContent className="tiptap-tab-panels-root space-y-0" />
			</div>
		</NodeViewWrapper>
	);
}

export const TabGroup = Node.create({
	name: "tabGroup",
	group: "block",
	content: "tabPanel+",
	attrs: {
		activeIndex: { default: 0 },
	},
	parseHTML() {
		return [{ tag: 'div[data-type="tab-group"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-type": "tab-group" }),
			0,
		];
	},
	addNodeView() {
		return ReactNodeViewRenderer(TabGroupView, {
			stopEvent: (event) => {
				const t = event.target;
				return Boolean(
					t &&
						typeof t.closest === "function" &&
						t.closest("[data-ink-tab-chrome]"),
				);
			},
		});
	},
	addCommands() {
		return {
			insertTabGroup:
				() =>
				({ commands }) => {
					return commands.insertContent({
						type: "tabGroup",
						attrs: { activeIndex: 0 },
						content: [
							{
								type: "tabPanel",
								attrs: { title: "Tab 1" },
								content: [{ type: "paragraph" }],
							},
							{
								type: "tabPanel",
								attrs: { title: "Tab 2" },
								content: [{ type: "paragraph" }],
							},
						],
					});
				},
		};
	},
});
