import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

const TOGGLE_BLOCK = {
	type: "details",
	attrs: { open: true },
	content: [
		{
			type: "detailsSummary",
			content: [{ type: "text", text: "Toggle" }],
		},
		{
			type: "detailsContent",
			content: [{ type: "paragraph" }],
		},
	],
};

export function inkInsertToggleBlock(editor) {
	if (!editor) return false;

	const { state } = editor;
	const { $from, $to } = state.selection;
	const range = $from.blockRange($to);

	let ok = false;
	if (!range) {
		ok = editor.chain().focus().insertContent(TOGGLE_BLOCK).run();
	} else {
		const slice = state.doc.slice(range.start, range.end);
		const match = state.schema.nodes.detailsContent.contentMatch.matchFragment(
			slice.content,
		);
		const inner =
			match && slice.content.size > 0
				? slice.toJSON()?.content || [{ type: "paragraph" }]
				: [{ type: "paragraph" }];
		ok = editor
			.chain()
			.focus()
			.insertContentAt(
				{ from: range.start, to: range.end },
				{
					...TOGGLE_BLOCK,
					content: [
						TOGGLE_BLOCK.content[0],
						{ type: "detailsContent", content: inner },
					],
				},
			)
			.run();
	}

	if (!ok) return false;
	inkEnsureParagraphAfterBlock(editor, "details");
	inkFocusDetailsContent(editor);
	return true;
}

function inkFocusDetailsContent(editor) {
	const { state } = editor;
	const { $from } = state.selection;
	let contentPos = null;
	let nearest = -1;
	state.doc.descendants((node, pos) => {
		if (node.type.name !== "detailsContent") return true;
		if (pos <= $from.pos && pos >= nearest) {
			nearest = pos;
			contentPos = pos + 1;
		}
		return true;
	});
	if (contentPos == null) return false;
	return editor.chain().focus().setTextSelection(contentPos + 1).run();
}

/** Insert a paragraph after the details node at `pos` when it is the last block. */
export function inkEnsureParagraphAfterBlock(editor, blockTypeName) {
	const { state } = editor;
	let detailsPos = null;
	let detailsNode = null;

	state.doc.descendants((node, pos) => {
		if (node.type.name !== blockTypeName) return true;
		detailsPos = pos;
		detailsNode = node;
		return true;
	});

	if (detailsPos == null || !detailsNode) return;

	const after = detailsPos + detailsNode.nodeSize;
	if (after >= state.doc.content.size) {
		editor.chain().focus().insertContentAt(after, { type: "paragraph" }).run();
	}
}

function inkFindTaskItemDepth($from) {
	for (let d = $from.depth; d >= 0; d--) {
		if ($from.node(d).type.name === "taskItem") return d;
	}
	return null;
}

export function inkFocusTaskItemText(editor) {
	const { state } = editor;
	const { $from } = state.selection;
	let taskPos = null;
	let taskNode = null;

	state.doc.descendants((node, pos) => {
		if (node.type.name !== "taskItem") return true;
		const end = pos + node.nodeSize;
		if ($from.pos >= pos && $from.pos <= end) {
			taskPos = pos;
			taskNode = node;
			return false;
		}
		return true;
	});

	if (taskPos == null || !taskNode?.firstChild?.isTextblock) return false;

	const textPos = taskPos + 1;
	return editor
		.chain()
		.focus()
		.setTextSelection(textPos + 1)
		.run();
}

function inkClosestTaskLiFromCheckbox(checkboxEl) {
	if (!checkboxEl?.closest) return null;
	return checkboxEl.closest('li[data-type="taskItem"]');
}

function inkTaskItemDocPos(editor, taskLiDom) {
	if (!editor?.view || !taskLiDom) return null;
	let hit = null;
	editor.state.doc.descendants((node, pos) => {
		if (node.type.name !== "taskItem") return true;
		const dom = editor.view.nodeDOM(pos);
		if (dom === taskLiDom) {
			hit = pos;
			return false;
		}
		return true;
	});
	return hit;
}

function inkDeleteTaskRow(editor, checkboxEl) {
	const root = editor?.view?.dom;
	if (!(root instanceof HTMLElement) || !root.contains(checkboxEl)) return false;

	const liDom = inkClosestTaskLiFromCheckbox(checkboxEl);
	if (!liDom) return false;
	const nodePos = inkTaskItemDocPos(editor, liDom);
	if (nodePos == null) return false;
	const row = editor.state.doc.nodeAt(nodePos);
	if (!row || row.type.name !== "taskItem") return false;

	return editor
		.chain()
		.focus(undefined, { scrollIntoView: true })
		.deleteRange({ from: nodePos, to: nodePos + row.nodeSize })
		.run();
}

function inkHandleTaskItemBackspace(editor) {
	if (!editor || editor.isDestroyed) return false;

	const { state } = editor;
	const { selection } = state;
	if (!(selection.empty && editor.isActive("taskItem"))) return false;

	const { $from } = selection;
	if (!$from.parent.isTextblock || $from.parentOffset !== 0) return false;

	const taskDepth = inkFindTaskItemDepth($from);
	if (taskDepth == null || $from.index(taskDepth) !== 0) return false;

	const isEmpty = $from.parent.content.size === 0;
	if (!isEmpty) {
		return (
			editor.commands.joinBackward() ||
			editor.commands.joinTextblockBackward()
		);
	}

	const taskPos = $from.before(taskDepth);
	const taskNode = $from.node(taskDepth);
	if (
		editor
			.chain()
			.focus(undefined, { scrollIntoView: true })
			.deleteRange({ from: taskPos, to: taskPos + taskNode.nodeSize })
			.run()
	) {
		return true;
	}

	if (editor.chain().focus().liftListItem("taskItem").run()) return true;
	if (editor.chain().focus().liftEmptyBlock().run()) return true;
	if (editor.chain().focus().toggleTaskList().run()) return true;
	return false;
}

export const InkTaskListKeyboardFix = Extension.create({
	name: "inkTaskListKeyboardFix",
	priority: 1200,

	addKeyboardShortcuts() {
		return {
			Backspace: ({ editor }) => inkHandleTaskItemBackspace(editor),
		};
	},

	addProseMirrorPlugins() {
		const extensionSelf = this;
		return [
			new Plugin({
				props: {
					handleClick(view, _pos, event) {
						const t = event.target;
						if (!(t instanceof Element)) return false;

						const li = t.closest('li[data-type="taskItem"]');
						if (!li || !view.dom.contains(li)) return false;

						if (t instanceof HTMLInputElement && t.type === "checkbox") {
							return false;
						}

						const contentDiv = li.querySelector(":scope > div");
						const inContent =
							contentDiv &&
							(t === contentDiv || contentDiv.contains(t));
						const inLabel = Boolean(t.closest("label"));
						if (!inContent && !inLabel) return false;

						const rect = contentDiv.getBoundingClientRect();
						const coords = view.posAtCoords({
							left: Math.max(rect.left + 8, event.clientX),
							top: event.clientY,
						});
						if (!coords) return false;

						const $pos = view.state.doc.resolve(coords.pos);
						const sel = TextSelection.near($pos, 1);
						view.dispatch(view.state.tr.setSelection(sel));
						view.focus();
						return true;
					},
					handleDOMEvents: {
						keydown(_view, event) {
							if (event.key !== "Backspace" && event.key !== "Delete") {
								return false;
							}
							const t = event.target;
							if (!(t instanceof HTMLInputElement) || t.type !== "checkbox") {
								return false;
							}
							const editor = extensionSelf.editor;
							const root = editor?.view?.dom;
							if (!(root instanceof HTMLElement)) return false;
							const li = inkClosestTaskLiFromCheckbox(t);
							if (!li || !root.contains(t)) return false;
							event.preventDefault();
							event.stopPropagation();
							return inkDeleteTaskRow(editor, t);
						},
					},
				},
			}),
		];
	},
});

export const InkDetailsTrailingFix = Extension.create({
	name: "inkDetailsTrailingFix",
	priority: 1100,

	addKeyboardShortcuts() {
		return {
			"Mod-Enter": ({ editor }) => {
				if (!editor.isActive("details")) return false;
				const { $from } = editor.state.selection;
				const depth = inkFindDetailsDepth($from);
				if (depth == null) return false;
				const detailsPos = $from.before(depth);
				const detailsNode = $from.node(depth);
				const after = detailsPos + detailsNode.nodeSize;
				return editor
					.chain()
					.focus()
					.insertContentAt(after, { type: "paragraph" })
					.setTextSelection(after + 1)
					.run();
			},
			ArrowDown: ({ editor }) => {
				if (!editor.isActive("details")) return false;
				const { state } = editor;
				const { $from } = state.selection;
				const depth = inkFindDetailsDepth($from);
				if (depth == null) return false;
				const detailsPos = $from.before(depth);
				const detailsNode = $from.node(depth);
				const after = detailsPos + detailsNode.nodeSize;
				if (after < state.doc.content.size) return false;
				return editor
					.chain()
					.focus()
					.insertContentAt(after, { type: "paragraph" })
					.setTextSelection(after + 1)
					.run();
			},
		};
	},
});

function inkFindDetailsDepth($from) {
	for (let d = $from.depth; d >= 0; d--) {
		if ($from.node(d).type.name === "details") return d;
	}
	return null;
}
