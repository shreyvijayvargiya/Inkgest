/**
 * Convert HTML to Markdown
 * Custom implementation without external packages
 * @param {string} html - HTML string to convert
 * @returns {string} Markdown string
 */
export const htmlToMarkdown = (html) => {
	if (!html) return "";

	// Create a temporary DOM element to parse HTML
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const body = doc.body;

	// Helper function to process a node
	const processNode = (node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent || "";
		}

		if (node.nodeType !== Node.ELEMENT_NODE) {
			return "";
		}

		const tagName = node.tagName.toLowerCase();
		const children = Array.from(node.childNodes)
			.map(processNode)
			.join("")
			.trim();

		switch (tagName) {
			case "details": {
				if (node.getAttribute("data-block") === "draft-toggle") {
					const summary = node.querySelector("summary");
					let toggleTitle = "Toggle";
					if (summary) {
						const spans = summary.querySelectorAll("span");
						for (const sp of spans) {
							const st = sp.getAttribute("style") || "";
							if (st.includes("flex:1") || st.includes("flex: 1")) {
								toggleTitle = (sp.textContent || "").trim() || toggleTitle;
								break;
							}
						}
					}
					const bodyWrap = summary?.nextElementSibling;
					const bodyMd = bodyWrap
						? Array.from(bodyWrap.childNodes).map(processNode).join("").trim()
						: "";
					return `### ${toggleTitle}\n\n${bodyMd}\n\n`;
				}
				return children;
			}
			case "iframe": {
				const src = node.getAttribute("src") || "";
				return src ? `\n\n<iframe src="${src}"></iframe>\n\n` : "";
			}
			case "video": {
				const src = node.getAttribute("src") || "";
				return src ? `\n\n<video src="${src}"></video>\n\n` : "";
			}
			case "table":
				return `\n\n${node.outerHTML}\n\n`;
			case "h1":
				return `# ${children}\n\n`;
			case "h2":
				return `## ${children}\n\n`;
			case "h3":
				return `### ${children}\n\n`;
			case "h4":
				return `#### ${children}\n\n`;
			case "h5":
				return `##### ${children}\n\n`;
			case "h6":
				return `###### ${children}\n\n`;
			case "p":
				return `${children}\n\n`;
			case "br":
				return "\n";
			case "strong":
			case "b":
				return `**${children}**`;
			case "em":
			case "i":
				return `*${children}*`;
			case "code":
				return `\`${children}\``;
			case "pre":
				return `\`\`\`\n${children}\n\`\`\`\n\n`;
			case "a":
				const href = node.getAttribute("href") || "";
				return href ? `[${children}](${href})` : children;
			case "img":
				const src = node.getAttribute("src") || "";
				const alt = node.getAttribute("alt") || "";
				return src ? `![${alt}](${src})` : "";
			case "ul":
				const ulItems = Array.from(node.querySelectorAll(":scope > li"))
					.map((li) => {
						const liContent = Array.from(li.childNodes)
							.map(processNode)
							.join("")
							.trim();
						return `- ${liContent}`;
					})
					.join("\n");
				return `${ulItems}\n\n`;
			case "ol":
				const olItems = Array.from(node.querySelectorAll(":scope > li"))
					.map((li, index) => {
						const liContent = Array.from(li.childNodes)
							.map(processNode)
							.join("")
							.trim();
						return `${index + 1}. ${liContent}`;
					})
					.join("\n");
				return `${olItems}\n\n`;
			case "li":
				// Handle nested lists
				const liChildren = Array.from(node.childNodes)
					.map(processNode)
					.join("")
					.trim();
				return liChildren;
			case "blockquote":
				const lines = children.split("\n").filter((line) => line.trim());
				return lines.map((line) => `> ${line}`).join("\n") + "\n\n";
			case "hr":
				return "---\n\n";
			case "div": {
				const db = node.getAttribute("data-block");
				if (db?.startsWith("callout-")) {
					const type = db.replace("callout-", "");
					const col = node.children[1];
					const contentDiv = col?.children?.[1];
					const innerMd = contentDiv
						? Array.from(contentDiv.childNodes)
								.map(processNode)
								.join("")
								.trim()
						: children;
					const label =
						col?.querySelector("p")?.textContent?.trim() || type;
					const body = innerMd.replace(/\n+/g, "\n").trim();
					const quoted = body
						? body
								.split("\n")
								.map((line) => `> ${line}`)
								.join("\n")
						: "> ";
					return `> **${label}** (${type})\n${quoted}\n\n`;
				}
				if (db === "tabs") {
					const buttons = Array.from(
						node.querySelectorAll("[data-action='draft-tab']"),
					);
					let out = "";
					for (const btn of buttons) {
						const idx = btn.getAttribute("data-tab-idx") ?? "0";
						const label =
							(btn.textContent || "").trim() || `Tab ${idx}`;
						const panel = node.querySelector(
							`[data-draft-panel="${idx}"]`,
						);
						const bodyMd = panel
							? Array.from(panel.childNodes)
									.map(processNode)
									.join("")
									.trim()
							: "";
						out += `#### ${label}\n\n${bodyMd}\n\n`;
					}
					return out;
				}
				if (db === "code-group") {
					const buttons = Array.from(
						node.querySelectorAll("[data-action='cg-tab']"),
					);
					let out = "";
					for (const btn of buttons) {
						const idx = btn.getAttribute("data-cg-idx") ?? "0";
						const label =
							(btn.textContent || "").trim() || `Snippet ${idx}`;
						const panel = node.querySelector(`[data-cg-panel="${idx}"]`);
						const code = panel?.querySelector("pre")?.textContent ?? "";
						const trimmed = code.replace(/\n+$/, "");
						out += `\`\`\`text\n/* ${label} */\n${trimmed}\n\`\`\`\n\n`;
					}
					return out;
				}
				if (db === "code") {
					const sel = node.querySelector("select[data-action='change-lang']");
					const lang = (sel?.value || "text").toLowerCase();
					const codeEl = node.querySelector("code");
					const code = (codeEl?.textContent ?? "").replace(/\n+$/, "");
					return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
				}
				return children;
			}
			case "span":
				return children;
			default:
				return children;
		}
	};

	// Process all child nodes
	const markdown = Array.from(body.childNodes)
		.map(processNode)
		.join("")
		.trim();

	// Clean up multiple newlines
	return markdown.replace(/\n{3,}/g, "\n\n");
};

