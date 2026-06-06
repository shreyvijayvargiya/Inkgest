import Highlight from "@tiptap/extension-highlight";
import { Extension } from "@tiptap/core";
import { createInkEmbedClipboardPlugin } from "./TiptapInkEmbedClipboard";

/**
 * Extra classes on textStyle so Tailwind / prose text colors don’t override picked colors.
 * Pairs with `.ink-notion-editor .ink-tip-fg--*` CSS (see TiptapEditor).
 */
export const TiptapInkTextFgExtension = Extension.create({
	name: "inkTextFg",

	addGlobalAttributes() {
		return [
			{
				types: ["textStyle"],
				attributes: {
					inkFgToken: {
						default: null,
						parseHTML: (element) =>
							element.getAttribute("data-ink-fg") || null,
						renderHTML: (attributes) => {
							if (!attributes.inkFgToken) {
								return {};
							}
							return {
								"data-ink-fg": attributes.inkFgToken,
								class: `ink-tip-fg ink-tip-fg--${attributes.inkFgToken}`,
							};
						},
					},
				},
			},
		];
	},
});

/** Copy/cut/paste for Mermaid + infographic atom blocks in TipTap. */
export const InkEmbedClipboard = Extension.create({
	name: "inkEmbedClipboard",

	addProseMirrorPlugins() {
		return [createInkEmbedClipboardPlugin()];
	},
});

/** Highlight backgrounds that win over prose / zinc utility colors. */
export const TiptapInkHighlight = Highlight.extend({
	addOptions() {
		return {
			...this.parent?.(),
			multicolor: true,
		};
	},

	addAttributes() {
		const parent = this.parent?.();
		const renderStrongBg = (attributes) => {
			if (!attributes.color) {
				return {};
			}
			return {
				"data-color": attributes.color,
				style: `background-color: ${attributes.color} !important; color: inherit`,
			};
		};
		if (!parent?.color) {
			return {
				color: {
					default: null,
					parseHTML: (element) =>
						element.getAttribute("data-color") ||
						element.style.backgroundColor,
					renderHTML: renderStrongBg,
				},
			};
		}
		return {
			...parent,
			color: {
				...parent.color,
				renderHTML: renderStrongBg,
			},
		};
	},
});
