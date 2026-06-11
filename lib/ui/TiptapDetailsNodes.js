import { Node, mergeAttributes, findParentNode, defaultBlockAt } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";

/**
 * DetailsSummary + DetailsContent nodes required by @tiptap/extension-details.
 * Must match upstream (hidden toggle on detailsContent, Enter to exit below block).
 */
export const DetailsSummary = Node.create({
	name: "detailsSummary",
	content: "text*",
	defining: true,
	selectable: false,
	isolating: true,
	parseHTML() {
		return [{ tag: "summary" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["summary", mergeAttributes(HTMLAttributes), 0];
	},
});

export const DetailsContent = Node.create({
	name: "detailsContent",
	content: "block+",
	defining: true,
	selectable: false,
	parseHTML() {
		return [{ tag: 'div[data-type="detailsContent"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-type": "detailsContent" }),
			0,
		];
	},
	addNodeView() {
		return ({ HTMLAttributes }) => {
			const dom = document.createElement("div");
			const attributes = mergeAttributes(HTMLAttributes, {
				"data-type": "detailsContent",
				hidden: "hidden",
			});
			Object.entries(attributes).forEach(([key, value]) =>
				dom.setAttribute(key, value),
			);
			dom.addEventListener("toggleDetailsContent", () => {
				dom.toggleAttribute("hidden");
			});
			return {
				dom,
				contentDOM: dom,
				ignoreMutation(mutation) {
					if (mutation.type === "selection") return false;
					return !dom.contains(mutation.target) || dom === mutation.target;
				},
				update: (updatedNode) => updatedNode.type.name === "detailsContent",
			};
		};
	},
	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) => {
				const { state, view } = editor;
				const { selection } = state;
				const { $from, empty } = selection;
				const detailsContent = findParentNode(
					(node) => node.type.name === "detailsContent",
				)(selection);

				if (!empty || !detailsContent || !detailsContent.node.childCount) {
					return false;
				}

				const fromIndex = $from.index(detailsContent.depth);
				const { childCount } = detailsContent.node;
				const isAtEnd = childCount === fromIndex + 1;
				if (!isAtEnd) return false;

				const defaultChildType =
					detailsContent.node.type.contentMatch.defaultType;
				const defaultChildNode = defaultChildType?.createAndFill();
				if (!defaultChildNode) return false;

				const $childPos = state.doc.resolve(detailsContent.pos + 1);
				const lastChildIndex = childCount - 1;
				const lastChildNode = detailsContent.node.child(lastChildIndex);
				const lastChildPos = $childPos.posAtIndex(
					lastChildIndex,
					detailsContent.depth,
				);
				const lastChildNodeIsEmpty = lastChildNode.eq(defaultChildNode);
				if (!lastChildNodeIsEmpty) return false;

				const above = $from.node(-3);
				if (!above) return false;

				const after = $from.indexAfter(-3);
				const type = defaultBlockAt(above.contentMatchAt(after));
				if (!type || !above.canReplaceWith(after, after, type)) {
					return false;
				}

				const node = type.createAndFill();
				if (!node) return false;

				const { tr } = state;
				const pos = $from.after(-2);
				tr.replaceWith(pos, pos, node);
				const $pos = tr.doc.resolve(pos);
				tr.setSelection(Selection.near($pos, 1));
				tr.delete(lastChildPos, lastChildPos + lastChildNode.nodeSize);
				tr.scrollIntoView();
				view.dispatch(tr);
				return true;
			},
		};
	},
});
