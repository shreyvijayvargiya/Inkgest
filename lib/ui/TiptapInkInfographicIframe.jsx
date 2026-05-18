import { Node, mergeAttributes } from "@tiptap/core";

export const InkInfographicIframe = Node.create({
	name: "inkInfographicIframe",

	group: "block",

	atom: true,

	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	addAttributes() {
		return {
			srcDoc: {
				default: "",
			},
			caption: {
				default: "Infographic",
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'iframe[data-ink-infographic="1"]',
				getAttrs(dom) {
					if (typeof dom === "string") return false;
					const el = /** @type {HTMLIFrameElement} */ (dom);
					return {
						srcDoc: el.getAttribute("srcdoc") || "",
						caption: el.getAttribute("title") || "Infographic",
					};
				},
			},
			{
				tag: "div[data-ink-infographic-wrap]",
				priority: 55,
				getAttrs(dom) {
					if (typeof dom === "string") return false;
					const el = /** @type {HTMLElement} */ (dom);
					const iframe =
						el.querySelector('iframe[data-ink-infographic="1"]');
					if (!(iframe instanceof HTMLIFrameElement))
						return {
							srcDoc: "",
							caption: "Infographic",
						};
					return {
						srcDoc: iframe.getAttribute("srcdoc") || "",
						caption: iframe.getAttribute("title") || "Infographic",
					};
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		const caption =
			(typeof HTMLAttributes.caption === "string" &&
				HTMLAttributes.caption.trim()) ||
			"Infographic";
		const srcDoc =
			(typeof HTMLAttributes.srcDoc === "string" &&
				HTMLAttributes.srcDoc) ||
			"";
		return [
			"div",
			mergeAttributes({ "data-ink-infographic-wrap": "" }),
			[
				"iframe",
				mergeAttributes(this.options.HTMLAttributes || {}, {
					"data-ink-infographic": "1",
					title: caption,
					sandbox:
						"allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
					loading: "lazy",
					referrerpolicy: "no-referrer",
					style:
						"width:100%;min-height:440px;border:0;border-radius:12px;display:block;margin:18px auto;max-width:560px;",
					srcdoc: srcDoc,
				}),
			],
		];
	},

	addCommands() {
		return {
			insertInkInfographicIframe:
				(attrs) =>
				({ commands }) =>
					commands.insertContent({
						type: this.name,
						attrs:
							typeof attrs === "object" && attrs
								? attrs
								: { srcDoc: "", caption: "Infographic" },
					}),
		};
	},
});
