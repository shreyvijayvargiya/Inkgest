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

function TabGroupView({ node, editor, getPos, updateAttributes }) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [editingIndex, setEditingIndex] = useState(null);
	const menuRef = useRef(null);
	const panelsRootRef = useRef(null);

	const childCount = node.childCount;
	const rawActive = node.attrs.activeIndex ?? 0;
	const activeIdx = Math.min(
		Math.max(0, rawActive),
		Math.max(0, childCount - 1),
	);

	useEffect(() => {
		if (rawActive !== activeIdx && childCount > 0) {
			updateAttributes({ activeIndex: activeIdx });
		}
	}, [rawActive, activeIdx, childCount, updateAttributes]);

	useEffect(() => {
		const root = panelsRootRef.current;
		if (!root) return;
		const panels = root.querySelectorAll('[data-type="tab-panel"]');
		panels.forEach((el, i) => {
			el.style.display = i === activeIdx ? "block" : "none";
		});
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
		setEditingIndex(null);
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
		updateAttributes({ activeIndex: childCount });
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
		updateAttributes({ activeIndex: Math.max(0, nextActive) });
		setMenuOpen(false);
	};

	return (
		<NodeViewWrapper
			className="my-6 border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm"
			data-node-type="tabGroup"
			style={{ position: "relative" }}
		>
			<div className="flex items-stretch border-b border-zinc-200 bg-zinc-50 min-h-[40px]">
				<div className="flex flex-1 min-w-0 overflow-x-auto">
					{Array.from({ length: childCount }, (_, i) => {
						const title = node.child(i).attrs.title || `Tab ${i + 1}`;
						const isActive = i === activeIdx;
						if (editingIndex === i) {
							return (
								<input
									key={i}
									autoFocus
									defaultValue={title}
									className="shrink-0 px-3 py-2 text-xs font-medium text-zinc-900 bg-white border-r border-zinc-200 outline-none min-w-[80px]"
									onMouseDown={(e) => e.stopPropagation()}
									onBlur={(e) => setTabTitle(i, e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") e.currentTarget.blur();
										if (e.key === "Escape") setEditingIndex(null);
									}}
								/>
							);
						}
						return (
							<button
								key={i}
								type="button"
								className={`shrink-0 px-3 py-2 text-xs font-medium border-r border-zinc-200 transition-colors truncate max-w-[160px] ${
									isActive
										? "bg-white text-zinc-900 border-b-2 border-b-amber-500 -mb-px"
										: "text-zinc-600 hover:bg-zinc-100/80"
								}`}
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => updateAttributes({ activeIndex: i })}
								onDoubleClick={(e) => {
									e.preventDefault();
									setEditingIndex(i);
								}}
								title="Double-click to rename"
							>
								{title}
							</button>
						);
					})}
				</div>
				<div className="relative flex items-center pr-1 pl-0.5" ref={menuRef}>
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
		return ReactNodeViewRenderer(TabGroupView);
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
