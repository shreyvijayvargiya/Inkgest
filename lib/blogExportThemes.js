/**
 * Export / public blog themes — shared by draft editor and /p/[slug].
 * Theme HTML builders require browser DOM for parsing fragments (computeThemedBodyInnerHTML / buildThemedHTML).
 */

export function escapeAttr(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}

/** Escape text for raw insertion inside HTML elements (not attributes). */
export function escapePcdata(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export const THEMES = {
	ink: {
		name: "Ink",
		label: "Warm editorial · Sans",
		palette: ["#F7F5F0", "#1A1A1A", "#C17B2F", "#7A7570"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Comic:wght@300;400;500;600;700&display=swap",
		bodyFont: "'Comic', sans-serif",
		bg: "#F7F5F0",
		text: "#3A3530",
		container:
			"max-width:720px;margin:0 auto;padding:48px 56px;background:#F7F5F0;font-family:'Comic',sans-serif;",
		h1: "font-family:'Comic',sans-serif;font-size:34px;color:#1A1A1A;line-height:1.2;margin:0 0 16px;font-weight:400;",
		h2: "font-family:'Comic',sans-serif;font-size:24px;color:#1A1A1A;line-height:1.3;margin:32px 0 12px;font-weight:400;",
		h3: "font-family:'Comic',sans-serif;font-size:19px;color:#3A3530;margin:22px 0 8px;font-weight:400;",
		p: "font-size:16px;line-height:1.85;color:#3A3530;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #C17B2F;padding:4px 0 4px 20px;color:#7A7570;font-style:italic;margin:20px 0;",
		code: "background:#EDE9E2;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#1A1A1A;font-weight:700;",
		a: "color:#C17B2F;",
		li: "font-size:16px;line-height:1.8;color:#3A3530;margin:4px 0;",
		hr: "border:none;border-top:1px solid #E8E4DC;margin:32px 0;",
	},
	midnight: {
		name: "Midnight",
		label: "Dark minimal · Sans",
		palette: ["#0D0D0D", "#E8E8E8", "#7C7CFF", "#444444"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Comic:wght@300;400;500;600;700&display=swap",
		bodyFont: "'Comic', sans-serif",
		bg: "#0D0D0D",
		text: "#A8A8A8",
		container:
			"max-width:720px;margin:0 auto;padding:48px 56px;background:#0D0D0D;font-family:'Comic',sans-serif;",
		h1: "font-family:'Comic',sans-serif;font-size:30px;color:#FFFFFF;line-height:1.2;margin:0 0 16px;font-weight:600;",
		h2: "font-family:'Comic',sans-serif;font-size:20px;color:#D4D4D4;line-height:1.3;margin:32px 0 12px;font-weight:500;border-bottom:1px solid #222222;padding-bottom:8px;",
		h3: "font-family:'Comic',sans-serif;font-size:14px;color:#888888;margin:22px 0 8px;font-weight:500;text-transform:;letter-spacing:0.06em;",
		p: "font-size:15px;line-height:1.9;color:#A8A8A8;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #7C7CFF;padding:4px 0 4px 20px;color:#666666;font-style:italic;margin:20px 0;",
		code: "background:#1E1E1E;color:#7FDBCA;border-radius:4px;padding:2px 8px;font-family:'Courier New',monospace;font-size:13px;",
		strong: "color:#FFFFFF;font-weight:600;",
		a: "color:#7C7CFF;",
		li: "font-size:15px;line-height:1.8;color:#A8A8A8;margin:4px 0;",
		hr: "border:none;border-top:1px solid #222222;margin:32px 0;",
	},
	paper: {
		name: "Paper",
		label: "Classic editorial · Lora",
		palette: ["#FFFEF9", "#1A1A2E", "#2A5298", "#888888"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;600&display=swap",
		bodyFont: "'Source Sans 3', sans-serif",
		bg: "#FFFEF9",
		text: "#3C3C3C",
		container:
			"max-width:680px;margin:0 auto;padding:52px 48px;background:#FFFEF9;font-family:'Source Sans 3',sans-serif;",
		h1: "font-family:'Lora',serif;font-size:36px;color:#1A1A2E;line-height:1.15;margin:0 0 20px;font-weight:600;",
		h2: "font-family:'Lora',serif;font-size:24px;color:#1A1A2E;line-height:1.3;margin:36px 0 14px;font-weight:400;",
		h3: "font-family:'Lora',serif;font-size:19px;color:#1A1A2E;margin:24px 0 10px;font-weight:400;",
		p: "font-size:17px;line-height:1.8;color:#3C3C3C;margin:0 0 16px;",
		blockquote:
			"border-left:4px solid #2A5298;padding:8px 0 8px 24px;color:#666666;font-style:italic;margin:24px 0;font-family:'Lora',serif;font-size:18px;",
		code: "background:#F0F0F0;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#1A1A2E;font-weight:600;",
		a: "color:#2A5298;",
		li: "font-size:17px;line-height:1.8;color:#3C3C3C;margin:5px 0;",
		hr: "border:none;border-top:2px solid #E0DDD5;margin:36px 0;",
	},
	forest: {
		name: "Forest",
		label: "Earthy & natural · Merriweather",
		palette: ["#F0F4F0", "#1B2E1B", "#2D6A4F", "#6B8F6B"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap",
		bodyFont: "'DM Sans', sans-serif",
		bg: "#F0F4F0",
		text: "#2C3E2C",
		container:
			"max-width:720px;margin:0 auto;padding:48px 52px;background:#F0F4F0;font-family:'DM Sans',sans-serif;",
		h1: "font-family:'Merriweather',serif;font-size:32px;color:#1B2E1B;line-height:1.2;margin:0 0 16px;font-weight:700;",
		h2: "font-family:'Merriweather',serif;font-size:21px;color:#2D6A4F;line-height:1.35;margin:32px 0 12px;font-weight:700;",
		h3: "font-family:'Merriweather',serif;font-size:17px;color:#1B2E1B;margin:22px 0 8px;font-weight:400;",
		p: "font-size:16px;line-height:1.85;color:#2C3E2C;margin:0 0 14px;",
		blockquote:
			"border-left:4px solid #2D6A4F;background:#E8F0E8;padding:12px 20px;color:#4A6A4A;font-style:italic;margin:24px 0;border-radius:0 8px 8px 0;",
		code: "background:#D8E8D8;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;color:#1B2E1B;",
		strong: "color:#1B2E1B;font-weight:700;",
		a: "color:#2D6A4F;",
		li: "font-size:16px;line-height:1.8;color:#2C3E2C;margin:5px 0;",
		hr: "border:none;border-top:2px solid #C8D8C8;margin:32px 0;",
	},
	rose: {
		name: "Rose",
		label: "Soft feminine · Cormorant",
		palette: ["#FDF0F3", "#3D1A24", "#D4617A", "#B08090"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Nunito:wght@300;400;500;600&display=swap",
		bodyFont: "'Nunito', sans-serif",
		bg: "#FDF0F3",
		text: "#4A2530",
		container:
			"max-width:700px;margin:0 auto;padding:48px 52px;background:#FDF0F3;font-family:'Nunito',sans-serif;",
		h1: "font-family:'Cormorant Garamond',serif;font-size:40px;color:#3D1A24;line-height:1.15;margin:0 0 18px;font-weight:600;font-style:italic;",
		h2: "font-family:'Cormorant Garamond',serif;font-size:26px;color:#D4617A;line-height:1.3;margin:32px 0 12px;font-weight:600;",
		h3: "font-family:'Cormorant Garamond',serif;font-size:20px;color:#3D1A24;margin:22px 0 8px;font-weight:400;",
		p: "font-size:16px;line-height:1.9;color:#4A2530;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #D4617A;padding:4px 0 4px 20px;color:#B08090;font-style:italic;margin:20px 0;font-family:'Cormorant Garamond',serif;font-size:18px;",
		code: "background:#F5E0E5;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#3D1A24;font-weight:700;",
		a: "color:#D4617A;",
		li: "font-size:16px;line-height:1.8;color:#4A2530;margin:4px 0;",
		hr: "border:none;border-top:1px solid #F0C8D0;margin:32px 0;",
	},
	slate: {
		name: "Slate",
		label: "Corporate clean · IBM Plex",
		palette: ["#F8F9FA", "#1A1F2E", "#3B82F6", "#6B7280"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap",
		bodyFont: "'IBM Plex Sans', sans-serif",
		bg: "#F8F9FA",
		text: "#374151",
		container:
			"max-width:740px;margin:0 auto;padding:48px 56px;background:#F8F9FA;font-family:'IBM Plex Sans',sans-serif;",
		h1: "font-family:'IBM Plex Serif',serif;font-size:32px;color:#1A1F2E;line-height:1.2;margin:0 0 16px;font-weight:600;",
		h2: "font-family:'IBM Plex Serif',serif;font-size:21px;color:#1A1F2E;line-height:1.35;margin:32px 0 12px;font-weight:600;border-bottom:2px solid #E5E7EB;padding-bottom:8px;",
		h3: "font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#1A1F2E;margin:22px 0 8px;font-weight:600;text-transform:;letter-spacing:0.05em;",
		p: "font-size:16px;line-height:1.8;color:#374151;margin:0 0 14px;",
		blockquote:
			"border-left:4px solid #3B82F6;background:#EFF6FF;padding:12px 20px;color:#1D4ED8;margin:24px 0;font-style:italic;",
		code: "background:#F3F4F6;border:1px solid #E5E7EB;border-radius:4px;padding:2px 6px;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#1A1F2E;",
		strong: "color:#1A1F2E;font-weight:600;",
		a: "color:#3B82F6;",
		li: "font-size:16px;line-height:1.8;color:#374151;margin:4px 0;",
		hr: "border:none;border-top:1px solid #E5E7EB;margin:32px 0;",
	},
	obsidian: {
		name: "Obsidian",
		label: "Terminal · JetBrains Mono",
		palette: ["#0F0F0F", "#00FF88", "#CCCCCC", "#444444"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;1,400&display=swap",
		bodyFont: "'JetBrains Mono', monospace",
		bg: "#0F0F0F",
		text: "#CCCCCC",
		container:
			"max-width:740px;margin:0 auto;padding:48px 52px;background:#0F0F0F;font-family:'JetBrains Mono',monospace;",
		h1: "font-family:'JetBrains Mono',monospace;font-size:24px;color:#00FF88;line-height:1.2;margin:0 0 16px;font-weight:500;",
		h2: "font-family:'JetBrains Mono',monospace;font-size:18px;color:#00FF88;line-height:1.3;margin:32px 0 12px;font-weight:400;",
		h3: "font-family:'JetBrains Mono',monospace;font-size:14px;color:#AAAAAA;margin:22px 0 8px;font-weight:400;",
		p: "font-size:14px;line-height:1.9;color:#CCCCCC;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #00FF88;padding:4px 0 4px 16px;color:#888888;font-style:italic;margin:20px 0;",
		code: "background:#1A1A1A;border:1px solid #333333;color:#00FF88;border-radius:3px;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:13px;",
		strong: "color:#FFFFFF;font-weight:500;",
		a: "color:#00FF88;",
		li: "font-size:14px;line-height:1.8;color:#CCCCCC;margin:4px 0;",
		hr: "border:none;border-top:1px solid #222222;margin:32px 0;",
	},
	cream: {
		name: "Cream",
		label: "Newsletter · Georgia",
		palette: ["#FFF8EE", "#1A1A1A", "#EA580C", "#888888"],
		fontUrl: "",
		bodyFont: "Georgia, 'Times New Roman', serif",
		bg: "#FFF8EE",
		text: "#3A3A3A",
		container:
			"max-width:620px;margin:0 auto;padding:52px 48px;background:#FFF8EE;font-family:Georgia,'Times New Roman',serif;",
		h1: "font-family:Georgia,'Times New Roman',serif;font-size:34px;color:#1A1A1A;line-height:1.2;margin:0 0 18px;font-weight:normal;",
		h2: "font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1A1A1A;line-height:1.3;margin:32px 0 12px;font-weight:normal;",
		h3: "font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#1A1A1A;margin:22px 0 8px;",
		p: "font-size:17px;line-height:1.8;color:#3A3A3A;margin:0 0 16px;",
		blockquote:
			"border-left:4px solid #EA580C;padding:8px 0 8px 20px;color:#888888;font-style:italic;margin:24px 0;",
		code: "background:#F5EDD8;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#1A1A1A;",
		a: "color:#EA580C;",
		li: "font-size:17px;line-height:1.8;color:#3A3A3A;margin:5px 0;",
		hr: "border:none;border-top:2px solid #E8D8C0;margin:36px 0;",
	},
	nordic: {
		name: "Nordic",
		label: "Minimal white · Playfair",
		palette: ["#FFFFFF", "#1D3461", "#1D3461", "#8899AA"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Figtree:wght@300;400;500;600&display=swap",
		bodyFont: "'Figtree', sans-serif",
		bg: "#FFFFFF",
		text: "#444B58",
		container:
			"max-width:720px;margin:0 auto;padding:56px 60px;background:#FFFFFF;font-family:'Figtree',sans-serif;",
		h1: "font-family:'Playfair Display',serif;font-size:38px;color:#1D3461;line-height:1.15;margin:0 0 18px;font-weight:700;",
		h2: "font-family:'Playfair Display',serif;font-size:24px;color:#1D3461;line-height:1.3;margin:36px 0 14px;font-weight:400;",
		h3: "font-family:'Figtree',sans-serif;font-size:12px;color:#8899AA;margin:24px 0 8px;font-weight:600;letter-spacing:0.08em;text-transform:;",
		p: "font-size:16px;line-height:1.9;color:#444B58;margin:0 0 16px;",
		blockquote:
			"border-left:4px solid #1D3461;padding:8px 0 8px 24px;color:#8899AA;font-family:'Playfair Display',serif;font-style:italic;font-size:18px;margin:28px 0;",
		code: "background:#F4F5F8;border-radius:4px;padding:2px 8px;font-family:monospace;font-size:13px;color:#1D3461;",
		strong: "color:#1D3461;font-weight:600;",
		a: "color:#1D3461;border-bottom:1px solid #1D3461;text-decoration:none;",
		li: "font-size:16px;line-height:1.8;color:#444B58;margin:5px 0;",
		hr: "border:none;border-top:1px solid #E8ECF0;margin:40px 0;",
	},
	dusk: {
		name: "Dusk",
		label: "Dark purple · DM Serif",
		palette: ["#1E1B2E", "#F0EEFF", "#C084FC", "#7C6FA0"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap",
		bodyFont: "'DM Sans', sans-serif",
		bg: "#1E1B2E",
		text: "#C5BEDC",
		container:
			"max-width:720px;margin:0 auto;padding:48px 56px;background:#1E1B2E;font-family:'DM Sans',sans-serif;",
		h1: "font-family:'DM Serif Display',serif;font-size:36px;color:#F0EEFF;line-height:1.2;margin:0 0 16px;font-weight:400;",
		h2: "font-family:'DM Serif Display',serif;font-size:24px;color:#C084FC;line-height:1.3;margin:32px 0 12px;font-weight:400;",
		h3: "font-family:'DM Sans',sans-serif;font-size:14px;color:#9B8DC0;margin:22px 0 8px;font-weight:500;",
		p: "font-size:16px;line-height:1.9;color:#C5BEDC;margin:0 0 14px;",
		blockquote:
			"border-left:3px solid #C084FC;padding:4px 0 4px 20px;color:#7C6FA0;font-style:italic;margin:20px 0;",
		code: "background:#2A2540;color:#C084FC;border-radius:4px;padding:2px 8px;font-family:monospace;font-size:13px;",
		strong: "color:#F0EEFF;font-weight:500;",
		a: "color:#C084FC;",
		li: "font-size:16px;line-height:1.8;color:#C5BEDC;margin:4px 0;",
		hr: "border:none;border-top:1px solid #2E2A42;margin:32px 0;",
	},
	sand: {
		name: "Sand",
		label: "Notion-like · Jakarta Sans",
		palette: ["#FAF9F7", "#37352F", "#0078D4", "#9B9B9B"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap",
		bodyFont: "'Plus Jakarta Sans', sans-serif",
		bg: "#FAF9F7",
		text: "#37352F",
		container:
			"max-width:740px;margin:0 auto;padding:44px 48px;background:#FAF9F7;font-family:'Plus Jakarta Sans',sans-serif;",
		h1: "font-family:'Plus Jakarta Sans',sans-serif;font-size:30px;color:#37352F;line-height:1.2;margin:0 0 16px;font-weight:700;",
		h2: "font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;color:#37352F;line-height:1.35;margin:28px 0 10px;font-weight:600;",
		h3: "font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;color:#37352F;margin:20px 0 8px;font-weight:600;",
		p: "font-size:16px;line-height:1.75;color:#37352F;margin:0 0 8px;",
		blockquote:
			"border-left:3px solid #BDBDBD;padding:4px 0 4px 14px;color:#9B9B9B;margin:16px 0;",
		code: "background:#F1F0EE;border-radius:4px;padding:2px 6px;font-family:monospace;font-size:13px;color:#EB5757;",
		strong: "color:#37352F;font-weight:700;",
		a: "color:#0078D4;text-decoration:underline;",
		li: "font-size:16px;line-height:1.75;color:#37352F;margin:2px 0;",
		hr: "background:#E8E7E4;border:none;height:1px;margin:28px 0;",
	},
	bold: {
		name: "Bold",
		label: "Magazine editorial · Bebas",
		palette: ["#F5F5F5", "#111111", "#DC2626", "#666666"],
		fontUrl:
			"https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Roboto:ital,wght@0,400;0,500;1,400&display=swap",
		bodyFont: "'Roboto', sans-serif",
		bg: "#F5F5F5",
		text: "#333333",
		container:
			"max-width:740px;margin:0 auto;padding:48px 56px;background:#F5F5F5;font-family:'Roboto',sans-serif;",
		h1: "font-family:'Bebas Neue',sans-serif;font-size:56px;color:#111111;line-height:1.0;margin:0 0 20px;letter-spacing:0.03em;",
		h2: "font-family:'Bebas Neue',sans-serif;font-size:30px;color:#DC2626;line-height:1.1;margin:32px 0 14px;letter-spacing:0.05em;",
		h3: "font-family:'Roboto',sans-serif;font-size:12px;color:#111111;margin:22px 0 8px;font-weight:500;text-transform:;letter-spacing:0.1em;",
		p: "font-size:16px;line-height:1.8;color:#333333;margin:0 0 14px;",
		blockquote:
			"border-left:6px solid #DC2626;padding:12px 24px;background:#FFFFFF;color:#666666;font-size:20px;font-style:italic;margin:24px 0;",
		code: "background:#EBEBEB;border-radius:3px;padding:2px 6px;font-family:monospace;font-size:13px;",
		strong: "color:#111111;font-weight:700;",
		a: "color:#DC2626;",
		li: "font-size:16px;line-height:1.8;color:#333333;margin:4px 0;",
		hr: "border:none;border-top:3px solid #111111;margin:32px 0;",
	},
};

/* ─── Inline markdown → HTML (links, images, bold, italic, code) ─── */
export function parseInlineMarkdown(text = "") {
	return text
		/* images before links so ![...](...) doesn't match as a link */
		.replace(
			/!\[([^\]]*)\]\(([^)\s>]+)\)/g,
			(_, alt, src) =>
				`<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border-radius:6px;margin:10px 0;display:block;"/>`,
		)
		/* links */
		.replace(
			/\[([^\]]+)\]\(([^)\s>]+)\)/g,
			(_, linkText, href) =>
				`<a href="${href}" target="_blank" rel="noopener">${linkText}</a>`,
		)
		/* bold **…** and __…__ */
		.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
		.replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
		/* italic *…* (single asterisk only — skip _…_ to avoid false-positives in URLs/CSS) */
		.replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
		/* inline code */
		.replace(/`([^`\n]+)`/g, "<code>$1</code>")
		/* strikethrough ~~…~~ */
		.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
}

/** Strip editor-only attributes; keep markup for preview iframe. */
function cloneBlockHtmlForPreview(node) {
	if (!node?.cloneNode) return "";
	const el = node.cloneNode(true);
	el.querySelectorAll("[contenteditable]").forEach((n) =>
		n.removeAttribute("contenteditable"),
	);
	el.querySelectorAll("[data-draft-del]").forEach((n) => n.remove());
	return el.outerHTML;
}

export const PREVIEW_INTERACTION_SCRIPT = `(function(){
document.addEventListener("click",function(e){
  var raw=e.target;
  if(!raw)return;
  var t=raw.nodeType===1?raw:raw.parentElement;
  if(!t||!t.closest)return;
  var copyBtn=t.closest("[data-action=\\"copy-code\\"]");
  if(copyBtn){
    e.preventDefault();
    var block=copyBtn.closest('[data-block="code"]');
    var code=block&&block.querySelector("code");
    if(code){
      var txt=code.innerText||"";
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).catch(function(){});
      }
      var prev=copyBtn.textContent;
      copyBtn.textContent="Copied!";
      copyBtn.style.color="#10B981";
      copyBtn.style.borderColor="#10B981";
      setTimeout(function(){
        copyBtn.textContent=prev;
        copyBtn.style.color="";
        copyBtn.style.borderColor="";
      },1800);
    }
    return;
  }
  var draftTab=t.closest("[data-action=\\"draft-tab\\"]");
  if(draftTab){
    e.preventDefault();
    var w=draftTab.closest('[data-block="tabs"]');
    if(!w)return;
    var idx=draftTab.getAttribute("data-tab-idx");
    w.querySelectorAll("[data-draft-panel]").forEach(function(p){
      p.style.display=p.getAttribute("data-draft-panel")===idx?"block":"none";
    });
    w.querySelectorAll("[data-action=\\"draft-tab\\"]").forEach(function(b){
      var on=b.getAttribute("data-tab-idx")===idx;
      b.style.background=on?"#fff":"transparent";
      b.style.boxShadow=on?"0 1px 2px rgba(0,0,0,0.06)":"none";
      b.style.fontWeight=on?"600":"500";
      b.style.color=on?"#37352F":"#7A7570";
    });
    return;
  }
  var cgTab=t.closest("[data-action=\\"cg-tab\\"]");
  if(cgTab){
    e.preventDefault();
    var cg=cgTab.closest('[data-block="code-group"]');
    if(!cg)return;
    var ci=cgTab.getAttribute("data-cg-idx");
    cg.querySelectorAll("[data-cg-panel]").forEach(function(p){
      p.style.display=p.getAttribute("data-cg-panel")===ci?"block":"none";
    });
    cg.querySelectorAll("[data-action=\\"cg-tab\\"]").forEach(function(b){
      var on=b.getAttribute("data-cg-idx")===ci;
      b.style.background=on?"#fff":"transparent";
      b.style.fontWeight=on?"700":"600";
      b.style.color=on?"#37352F":"#6B6560";
    });
  }
});
})();`;

/** Runs Mermaid inside preview/export iframes (srcDoc). Requires allow-scripts on iframe. */
export const MERMAID_PREVIEW_BOOTSTRAP_MODULE = `
try {
  const sel = ".ink-themed-post-root pre.mermaid:not([data-ink-mermaid-rendered]), .ink-themed-post-root pre[data-ink-mermaid]:not([data-ink-mermaid-rendered])";
  const nodes = Array.from(document.querySelectorAll(sel)).filter((pre) => !pre.querySelector("svg"));
  if (!nodes.length) return;
  const { default: mermaid } = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", fontFamily: "inherit" });
  let seq = 0;
  for (const pre of nodes) {
    const source = (pre.getAttribute("data-ink-mermaid-source") || pre.textContent || "").trim();
    if (!source) continue;
    try {
      const id = "ink_exp_" + (++seq) + "_" + Math.random().toString(36).slice(2, 9);
      const { svg } = await mermaid.render(id, source);
      pre.innerHTML = svg;
      pre.setAttribute("data-ink-mermaid-rendered", "1");
    } catch (e) {
      console.warn("[ink export mermaid]", e);
    }
  }
} catch (e) {
  console.warn("[ink preview mermaid]", e);
}
`;

function readMermaidSourceForExport(node, pre) {
	const fromWrap = node?.getAttribute?.("data-ink-mermaid-source");
	if (fromWrap?.trim() && looksLikeMermaidSource(fromWrap)) return fromWrap.trim();
	const fromPre = pre?.getAttribute("data-ink-mermaid-source");
	if (fromPre?.trim() && looksLikeMermaidSource(fromPre)) return fromPre.trim();
	if (pre?.querySelector?.("svg")) return "";
	const raw = (pre?.textContent || "").trim();
	return looksLikeMermaidSource(raw) ? raw : "";
}

function looksLikeMermaidSource(text) {
	const t = String(text || "").trim();
	if (!t) return false;
	if (/^#mermaid-\d+\{/i.test(t)) return false;
	return /\b(flowchart|graph\b|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie\b|mindmap|timeline|gitGraph)\b/i.test(
		t,
	);
}

const PREVIEW_TOGGLE_CSS = `
    details[data-block="draft-toggle"] summary::-webkit-details-marker { display: none; }
    details[data-block="draft-toggle"] summary { list-style: none; }
    details[data-block="draft-toggle"] summary::marker { display: none; }
    details[data-block="draft-toggle"] [data-toggle-chevron] {
      flex-shrink: 0; width: 22px; height: 22px; border-radius: 5px;
      background: rgba(193,123,47,0.12); display: inline-flex;
      align-items: center; justify-content: center;
      transform: rotate(0deg); transition: transform 0.18s ease;
    }
    details[data-block="draft-toggle"] [data-toggle-chevron]::before {
      content: ""; display: block; width: 0; height: 0;
      border-style: solid; border-width: 5px 0 5px 7px;
      border-color: transparent transparent transparent #6B6560;
      margin-left: 2px;
    }
    details[data-block="draft-toggle"][open] [data-toggle-chevron] { transform: rotate(90deg); }
    details[data-block="draft-toggle"] [data-toggle-grip] {
      flex-shrink: 0; min-width: 22px; height: 22px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    details[data-block="draft-toggle"] [data-toggle-grip]::before {
      content: "\\2026"; font-weight: 700; color: #A8A29E;
      font-size: 15px; line-height: 1; letter-spacing: 0.02em;
    }`;

/* ─── Themed inner HTML (blocks with inline styles). Browser-only. ─── */
export function computeThemedBodyInnerHTML(currentHTML = "", theme) {
	if (!currentHTML.trim()) return "";

	const getInner = (node) =>
		parseInlineMarkdown(node.innerHTML || node.textContent || "");

	let body = "";
	try {
		const tmp = document.createElement("div");
		tmp.innerHTML = currentHTML;

		const processNode = (node) => {
			const tag = node.nodeName?.toLowerCase();
			if (!tag || tag === "#text") {
				const t = (node.textContent || "").trim();
				return t ? parseInlineMarkdown(t) : "";
			}
			const inner = getInner(node);
			const text = (node.textContent || "").trim();

			if (tag === "h1") return `<h1 style="${theme.h1}">${inner}</h1>\n`;
			if (tag === "h2") return `<h2 style="${theme.h2}">${inner}</h2>\n`;
			if (tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6")
				return `<h3 style="${theme.h3}">${inner}</h3>\n`;
			if (tag === "blockquote") {
				if (node.getAttribute("data-block") === "quote")
					return `${cloneBlockHtmlForPreview(node)}\n`;
				return `<blockquote style="${theme.blockquote}">${inner}</blockquote>\n`;
			}
			if (tag === "ul" || tag === "ol") {
				const isTask =
					node.getAttribute("data-todo") === "true" ||
					node.getAttribute("data-type") === "taskList";
				const items = Array.from(node.children)
					.filter((n) => n.nodeName?.toLowerCase() === "li")
					.map((li) => {
						if (isTask) {
							const cb = li.querySelector('input[type="checkbox"]');
							const checked = cb?.hasAttribute("checked") || cb?.checked;
							const clone = li.cloneNode(true);
							const rm = clone.querySelectorAll("input");
							rm.forEach((n) => n.remove());
							const innerLi = parseInlineMarkdown(clone.innerHTML || "");
							const box = checked
								? `<input type="checkbox" checked disabled style="margin:4px 8px 0 0;flex-shrink:0"/>`
								: `<input type="checkbox" disabled style="margin:4px 8px 0 0;flex-shrink:0"/>`;
							return `<li style="${theme.li};list-style:none;display:flex;align-items:flex-start;padding-left:0">${box}<span style="flex:1">${innerLi}</span></li>`;
						}
						return `<li style="${theme.li}">${parseInlineMarkdown(li.innerHTML || "")}</li>`;
					})
					.join("\n");
				const listStyle = isTask
					? "list-style:none;padding-left:0;margin:0 0 14px;"
					: "padding-left:24px;margin:0 0 14px;";
				return `<${tag} style="${listStyle}">${items}</${tag}>\n`;
			}
			if (
				tag === "pre" &&
				node.classList?.contains?.("mermaid")
			) {
				const raw = readMermaidSourceForExport(node.parentElement || node, node);
				if (!raw.trim()) return "";
				return `<div data-ink-mermaid-wrap="" class="ink-mermaid-slot" style="margin:20px auto;max-width:100%;overflow-x:auto;text-align:center"><pre class="mermaid" data-ink-mermaid="1" data-ink-mermaid-source="${escapeAttr(raw)}">${escapePcdata(raw)}</pre></div>\n`;
			}
			if (tag === "pre")
				return `<pre style="background:rgba(0,0,0,0.06);padding:16px 20px;border-radius:6px;overflow:auto;margin:0 0 16px;font-family:monospace;font-size:13px;line-height:1.6;">${node.textContent || ""}</pre>\n`;
			/* Date chip — strip editor-only attrs, keep visual style */
			if (tag === "span" && node.getAttribute("data-ink-date") != null) {
				const label = (node.textContent || "").trim();
				return `<span style="display:inline-flex;align-items:center;gap:5px;background:#FEF3E2;border:1px solid #F6D9A8;border-radius:6px;padding:2px 9px 2px 7px;color:#92400E;font-weight:600;font-size:0.92em;white-space:nowrap;vertical-align:middle;line-height:1.7"><svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='#C17B2F' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' style='flex-shrink:0'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg>${label}</span>`;
			}
			if (tag === "hr") {
				const dtype = node.getAttribute("data-divider-type") || "solid";
				const borderMap = { solid: "1.5px solid #C8C4BC", dashed: "1.5px dashed #C8C4BC", dotted: "2px dotted #C8C4BC" };
				const border = borderMap[dtype] || borderMap.solid;
				return `<hr style="border:none;border-top:${border};margin:28px 0"/>\n`;
			}
			if (
				tag === "figure" &&
				node.getAttribute("data-draft-image-wrap") != null
			) {
				const img =
					node.querySelector("img[data-draft-img]") ||
					node.querySelector("img");
				if (!img) return "";
				const src = img.getAttribute("src") || "";
				const alt = img.getAttribute("alt") || "";
				const capEl = node.querySelector("[data-draft-caption]");
				const captionHtml = capEl?.innerHTML?.trim()
					? parseInlineMarkdown(capEl.innerHTML.trim())
					: "";
				const allowedFit = new Set([
					"contain",
					"cover",
					"fill",
					"scale-down",
				]);
				const fitRaw = (img.style.objectFit || "contain")
					.trim()
					.toLowerCase();
				const fit = allowedFit.has(fitRaw) ? fitRaw : "contain";
				const frame = node.querySelector("[data-draft-image-frame]");
				let wPart = "width:100%;max-width:100%";
				if (frame?.style?.width) {
					wPart = `width:${frame.style.width};max-width:100%`;
				}
				let imgStyle = `width:100%;height:auto;display:block;border-radius:8px;object-fit:${fit};object-position:center`;
				const minH = (img.style.minHeight || "").trim();
				if (minH) imgStyle += `;min-height:${minH}`;
				else if (fit === "cover") imgStyle += ";min-height:240px";
				const capBlock = captionHtml
					? `<figcaption style="margin-top:10px;font-size:12px;line-height:1.5;color:#7A7570;text-align:center;max-width:520px;margin-left:auto;margin-right:auto">${captionHtml}</figcaption>`
					: "";
				return `<figure style="margin:20px auto;text-align:center;max-width:100%"><div style="${wPart};margin-left:auto;margin-right:auto;border-radius:8px;overflow:hidden;line-height:0"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="${imgStyle}"/></div>${capBlock}</figure>\n`;
			}
			if (tag === "figure") {
				return Array.from(node.childNodes).map(processNode).join("");
			}
			if (tag === "img")
				return `<img src="${node.getAttribute("src") || ""}" alt="${node.getAttribute("alt") || ""}" style="max-width:100%;height:auto;border-radius:6px;margin:12px 0;display:block;"/>\n`;
			if (tag === "video") {
				const src = node.getAttribute("src") || "";
				return `<p style="margin:16px 0"><video src="${src}" controls style="max-width:100%;border-radius:8px;display:block;"></video></p>\n`;
			}
			if (tag === "iframe") {
				const srcdoc = node.getAttribute("srcdoc");
				const isInk = node.getAttribute("data-ink-infographic") === "1";
				if (isInk && srcdoc != null && String(srcdoc).trim() !== "") {
					const tit = node.getAttribute("title") || "Infographic";
					return `<div data-ink-infographic-wrap="" class="ink-infographic-slot" style="margin:22px auto;max-width:560px;width:100%"><iframe srcdoc="${escapeAttr(srcdoc)}" title="${escapeAttr(tit)}" data-ink-infographic="1" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" loading="lazy" referrerpolicy="no-referrer" style="width:100%;min-height:440px;border:0;border-radius:12px;display:block"></iframe></div>\n`;
				}
				const src = node.getAttribute("src") || "";
				return `<p style="${theme.p}"><iframe src="${escapeAttr(src)}" title="Embedded content" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="" style="max-width:100%;aspect-ratio:16/9;height:auto;min-height:200px;border:0;border-radius:8px;width:100%"></iframe></p>\n`;
			}
			if (tag === "table") return `${node.outerHTML}\n`;
			if (tag === "figure" && node.getAttribute("data-block") === "audio-block") {
				const audioEl = node.querySelector("audio[data-audio-src]");
				const nameEl = node.querySelector("[data-audio-name]");
				const capEl = node.querySelector("[data-audio-caption]");
				const iconEl = node.querySelector("[data-icon-selector]");
				const src = audioEl?.getAttribute("src") || "";
				const name = nameEl?.textContent?.trim() || "Audio track";
				const caption = capEl?.innerHTML?.trim() ? parseInlineMarkdown(capEl.innerHTML.trim()) : "";
				const iconHtml = iconEl?.innerHTML?.trim() || "🎵";
				const safeSrc = src.replace(/"/g, "&quot;");
				const capBlock = caption ? `<figcaption style="padding:8px 16px 12px;font-size:12px;color:#7A7570;line-height:1.5;border-top:1px solid #F0ECE5">${caption}</figcaption>` : "";
				const waveGray = `repeating-linear-gradient(90deg,#C8C4BC 0,#C8C4BC 2px,transparent 2px,transparent 8px)`;
				const waveAmberE = `repeating-linear-gradient(90deg,#C17B2F 0,#C17B2F 2px,transparent 2px,transparent 8px)`;
				/* Export uses the same [data-pi]/[data-qi] toggle pattern — no innerHTML, no double quotes */
				const fmtFn = `function(s){var m=Math.floor(s/60)|0;var sc=Math.floor(s%60);return m+':'+(sc<10?'0':'')+sc;}`;
				const playJs = `(function(btn){var fig=btn.closest('figure');var aud=fig&&fig.querySelector('audio');if(!aud)return;var fmt=${fmtFn};var prog=fig.querySelector('[data-ap]');var curEl=fig.querySelector('[data-cur]');var durEl=fig.querySelector('[data-dur]');var pi=btn.querySelector('[data-pi]');var qi=btn.querySelector('[data-qi]');if(aud.paused){aud.play();if(pi)pi.style.display='none';if(qi)qi.style.display='';aud.onloadedmetadata=function(){if(durEl)durEl.textContent=fmt(aud.duration);};if(aud.duration&&durEl)durEl.textContent=fmt(aud.duration);aud.ontimeupdate=function(){if(curEl)curEl.textContent=fmt(aud.currentTime);if(prog&&aud.duration)prog.style.width=(aud.currentTime/aud.duration*100)+'%';};aud.onended=function(){if(pi)pi.style.display='';if(qi)qi.style.display='none';if(curEl)curEl.textContent='0:00';if(prog)prog.style.width='0%';};}else{aud.pause();if(pi)pi.style.display='';if(qi)qi.style.display='none';}})(this)`;
				const seekJs = `(function(bar,e){var fig=bar.closest('figure');var aud=fig&&fig.querySelector('audio');if(!aud)return;var rect=bar.getBoundingClientRect();var ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));if(aud.duration)aud.currentTime=ratio*aud.duration;var prog=fig.querySelector('[data-ap]');if(prog)prog.style.width=(ratio*100)+'%';})(this,event)`;
				return `<figure style="margin:18px 0;border:1px solid #E8E4DC;border-radius:14px;overflow:hidden;background:#FAFAF8;font-family:inherit">` +
					`<div style="padding:14px 16px 12px;display:flex;flex-direction:column;gap:10px">` +
						`<div style="display:flex;align-items:center;gap:10px">` +
							`<div style="width:34px;height:34px;border-radius:8px;background:#FEF3E2;border:1px solid #F6D9A8;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px;line-height:1">${iconHtml}</div>` +
							`<div><div style="font-size:13px;font-weight:600;color:#37352F">${name}</div></div>` +
						`</div>` +
						`<div style="background:#37352F;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:12px">` +
							`<audio src="${safeSrc}" preload="metadata" style="display:none"></audio>` +
							`<button type="button" onclick="${playJs}" style="width:34px;height:34px;border-radius:50%;background:#555250;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0">` +
								`<svg data-pi width="14" height="14" viewBox="0 0 24 24" style="display:block"><polygon points="5,3 19,12 5,21" fill="white" stroke="none"/></svg>` +
								`<svg data-qi width="14" height="14" viewBox="0 0 24 24" style="display:none"><rect x="5" y="3" width="4" height="18" fill="white" rx="1"/><rect x="15" y="3" width="4" height="18" fill="white" rx="1"/></svg>` +
							`</button>` +
							`<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">` +
								`<div onclick="${seekJs}" style="position:relative;height:20px;cursor:pointer;display:flex;align-items:center">` +
									`<div style="position:absolute;inset:0;display:flex;align-items:center;pointer-events:none"><div style="width:100%;height:3px;background:${waveGray};border-radius:2px;opacity:0.5"></div></div>` +
									`<div data-ap style="position:absolute;left:0;top:0;height:100%;width:0%;overflow:hidden;pointer-events:none"><div style="position:absolute;inset:0;display:flex;align-items:center"><div style="width:9999px;height:3px;background:${waveAmberE};border-radius:2px"></div></div></div>` +
								`</div>` +
								`<div style="display:flex;justify-content:space-between;align-items:center">` +
									`<span data-cur style="font-size:10px;color:#9A9490;font-variant-numeric:tabular-nums">0:00</span>` +
									`<span style="font-size:10px;color:#6B6560;font-weight:600;letter-spacing:0.06em">&#127911; NOW PLAYING</span>` +
									`<span data-dur style="font-size:10px;color:#9A9490;font-variant-numeric:tabular-nums">0:00</span>` +
								`</div>` +
							`</div>` +
						`</div>` +
					`</div>` +
					`${capBlock}</figure>\n`;
			}
			if (tag === "div" && node.getAttribute("data-block") === "toggle-group") {
				/* Render as clean FAQ section */
				const label = node.querySelector("[data-toggle-group-label]")?.textContent?.trim() || "FAQ";
				const items = Array.from(node.querySelectorAll("details[data-block='draft-toggle']")).map((d) => {
					const q = d.querySelector("summary span[contenteditable]")?.innerHTML?.trim() || d.querySelector("summary")?.textContent?.trim() || "";
					const a = d.querySelector("div[contenteditable]")?.innerHTML?.trim() || "";
					return `<details style="border-bottom:1px solid #E8E4DC"><summary style="padding:12px 14px;cursor:pointer;font-size:14px;font-weight:600;color:#37352F;list-style:none">${parseInlineMarkdown(q)}</summary><div style="padding:10px 14px 14px 24px;font-size:14px;color:#6B6560;line-height:1.7">${parseInlineMarkdown(a)}</div></details>`;
				}).join("");
				return `<div style="margin:18px 0;border:1px solid #E8E4DC;border-radius:12px;overflow:hidden;background:#FAFAF8"><div style="padding:8px 14px;border-bottom:1px solid #E8E4DC;background:#F3EFE8"><span style="font-size:11px;font-weight:700;color:#9A9490;text-transform:uppercase;letter-spacing:0.07em">${label}</span></div>${items}</div>\n`;
			}
			if (tag === "div" && node.getAttribute("data-ink-infographic-wrap") != null) {
				const iframe =
					node.querySelector("iframe[data-ink-infographic='1']") ||
					node.querySelector("iframe");
				if (!iframe) return "";
				const sd = iframe.getAttribute("srcdoc");
				if (sd == null || String(sd).trim() === "") return "";
				const tit = iframe.getAttribute("title") || "Infographic";
				return `<div data-ink-infographic-wrap="" class="ink-infographic-slot" style="margin:22px auto;max-width:560px;width:100%"><iframe srcdoc="${escapeAttr(sd)}" title="${escapeAttr(tit)}" data-ink-infographic="1" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" loading="lazy" referrerpolicy="no-referrer" style="width:100%;min-height:440px;border:0;border-radius:12px;display:block"></iframe></div>\n`;
			}
			if (tag === "div" && node.getAttribute("data-ink-mermaid-wrap") != null) {
				const pre =
					node.querySelector("pre.mermaid") ||
					node.querySelector("pre[data-ink-mermaid]");
				const raw = readMermaidSourceForExport(node, pre);
				if (!raw.trim()) return "";
				const cap = node.getAttribute("data-caption") || "";
				const capPart = cap
					? `<p style="font-size:12px;color:#7A7570;margin:0 0 10px;text-align:center">${escapePcdata(cap)}</p>`
					: "";
				return `<div data-ink-mermaid-wrap="" class="ink-mermaid-slot" style="margin:22px auto;max-width:100%;overflow-x:auto">${capPart}<pre class="mermaid" data-ink-mermaid="1" data-ink-mermaid-source="${escapeAttr(raw)}">${escapePcdata(raw)}</pre></div>\n`;
			}
			if (tag === "div" && node.getAttribute("data-block") === "card") {
				const iconEl = node.querySelector("[data-card-icon]");
				const headingEl = node.querySelector("[data-card-heading]");
				const descEl = node.querySelector("[data-card-desc]");
				const iconHtml = iconEl?.innerHTML?.trim() || "🎯";
				const heading = parseInlineMarkdown(headingEl?.innerHTML?.trim() || "Card heading");
				const desc = parseInlineMarkdown(descEl?.innerHTML?.trim() || "");
				return `<div style="margin:16px 0;border:1.5px solid #E8E4DC;border-radius:14px;padding:20px 22px;background:#FAFAF8;display:flex;gap:14px;align-items:flex-start"><div style="font-size:28px;line-height:1;flex-shrink:0">${iconHtml}</div><div style="flex:1"><div style="font-size:16px;font-weight:700;color:#37352F;margin-bottom:6px;line-height:1.3">${heading}</div><div style="font-size:14px;color:#6B6560;line-height:1.7">${desc}</div></div></div>\n`;
			}
			if (tag === "span" && node.getAttribute("data-icon-selector") != null) {
				/* Inline icon chip — strip editor-only attrs */
				const inner = node.innerHTML || "";
				return `<span style="display:inline-flex;align-items:center;justify-content:center;vertical-align:middle">${inner}</span>`;
			}
			if (tag === "div" && node.getAttribute("data-block"))
				return `${cloneBlockHtmlForPreview(node)}\n`;
			if (tag === "details" && node.getAttribute("data-block") === "draft-toggle")
				return `${cloneBlockHtmlForPreview(node)}\n`;
			if (tag === "p") {
				const rawInner = node.innerHTML || "";
				if (/<iframe\b/i.test(rawInner) || /<video\b/i.test(rawInner))
					return `<p style="${theme.p}">${rawInner}</p>\n`;
				return `<p style="${theme.p}">${inner}</p>\n`;
			}
			if (tag === "div") {
				const frag = Array.from(node.childNodes).map(processNode).join("");
				if (frag.trim()) return frag;
				if (!text) return "";
				return `<p style="${theme.p}">${inner}</p>\n`;
			}
			if (tag === "section" || tag === "article") {
				return Array.from(node.childNodes).map(processNode).join("");
			}
			if (tag === "br") return `<br/>\n`;
			if (!text) return "";
			return `<p style="${theme.p}">${inner}</p>\n`;
		};

		tmp.childNodes.forEach((node) => {
			body += processNode(node);
		});
	} catch {
		body = `<p style="${theme.p}">${parseInlineMarkdown(currentHTML.replace(/<[^>]+>/g, ""))}</p>`;
	}

	return body;
}

/** Scoped CSS for embedding themed article HTML directly in the page (no iframe). */
export function buildThemedScopedCss(theme) {
	const R = ".ink-themed-post-root";
	return `
${R} {
  background: ${theme.bg};
  color: ${theme.text};
  font-family: ${theme.bodyFont};
  -webkit-font-smoothing: antialiased;
}
${R} *, ${R} *::before, ${R} *::after { box-sizing: border-box; }
${R} a { ${theme.a} }
${R} strong, ${R} b { ${theme.strong} }
${R} em, ${R} i { font-style: italic; }
${R} code { ${theme.code} }
${R} img, ${R} video { max-width: 100%; height: auto; border-radius: 6px; }
${R} ul, ${R} ol { padding-left: 24px; margin: 0 0 14px; }
${R} li { ${theme.li} }
${R} hr { ${theme.hr} }
${R} blockquote { ${theme.blockquote} }
${R} pre { background: rgba(0,0,0,0.06); padding: 16px 20px; border-radius: 6px; overflow: auto; margin: 0 0 16px; font-family: monospace; font-size: 13px; line-height: 1.6; }
${R} iframe { display: block; max-width: 100%; border: 0; border-radius: 8px; }
${R} iframe[data-ink-infographic="1"] { min-height: 440px; width: 100%; aspect-ratio: auto; height: auto; border-radius: 12px; }
${R} .ink-mermaid-slot { margin: 22px auto; max-width: 100%; overflow-x: auto; text-align: center; }
${R} .ink-mermaid-slot pre.mermaid {
  margin: 0 auto;
  display: inline-block;
  max-width: 100%;
  text-align: left;
  background: transparent;
  color: inherit;
  padding: 0;
  border: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.45;
}
${R} .ink-mermaid-slot svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
${R} table { border-collapse: collapse; width: 100%; margin: 16px 0; }
${R} details[data-block="draft-toggle"] summary::-webkit-details-marker { display: none; }
${R} details[data-block="draft-toggle"] summary { list-style: none; }
${R} details[data-block="draft-toggle"] summary::marker { display: none; }
${R} details[data-block="draft-toggle"] [data-toggle-chevron] {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 5px;
  background: rgba(193,123,47,0.12); display: inline-flex;
  align-items: center; justify-content: center;
  transform: rotate(0deg); transition: transform 0.18s ease;
}
${R} details[data-block="draft-toggle"] [data-toggle-chevron]::before {
  content: ""; display: block; width: 0; height: 0;
  border-style: solid; border-width: 5px 0 5px 7px;
  border-color: transparent transparent transparent #6B6560;
  margin-left: 2px;
}
${R} details[data-block="draft-toggle"][open] [data-toggle-chevron] { transform: rotate(90deg); }
${R} details[data-block="draft-toggle"] [data-toggle-grip] {
  flex-shrink: 0; min-width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
}
${R} details[data-block="draft-toggle"] [data-toggle-grip]::before {
  content: "\\2026"; font-weight: 700; color: #A8A29E;
  font-size: 15px; line-height: 1; letter-spacing: 0.02em;
}
`;
}

/** Wrapped fragment + scoped styles for public pages (inline, not iframe). */
export function buildThemedArticleFragment(html, theme) {
	if (!theme || !String(html || "").trim()) return null;
	try {
		const body = computeThemedBodyInnerHTML(html, theme);
		if (!String(body).trim()) return null;
		return {
			fragmentHtml: `<div style="${escapeAttr(theme.container)}">${body}</div>`,
			scopedCss: buildThemedScopedCss(theme),
		};
	} catch {
		return null;
	}
}

/* ─── Build a complete standalone HTML document with theme applied ─── */
export function buildThemedHTML(currentHTML = "", theme, title = "") {
	if (!currentHTML.trim()) return "";

	const body = computeThemedBodyInnerHTML(currentHTML, theme);

	const fontLink = theme.fontUrl
		? `<link href="${theme.fontUrl}" rel="stylesheet"/>`
		: "";

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title || "Draft"}</title>
  ${fontLink}
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{background:${theme.bg};color:${theme.text};font-family:${theme.bodyFont};-webkit-font-smoothing:antialiased;}
    a{${theme.a}}
    strong,b{${theme.strong}}
    em,i{font-style:italic;}
    code{${theme.code}}
    img,video{max-width:100%;height:auto;border-radius:6px;}
    ul,ol{padding-left:24px;margin:0 0 14px;}
    li{${theme.li}}
    hr{${theme.hr}}
    blockquote{${theme.blockquote}}
    pre{background:rgba(0,0,0,0.06);padding:16px 20px;border-radius:6px;overflow:auto;margin:0 0 16px;font-family:monospace;font-size:13px;line-height:1.6;}
    iframe{display:block;max-width:100%;border:0;border-radius:8px;}
    iframe[data-ink-infographic="1"]{min-height:440px;width:100%;aspect-ratio:auto;height:auto;border-radius:12px;}
    .ink-mermaid-slot{margin:22px auto;max-width:100%;overflow-x:auto;text-align:center;}
    .ink-mermaid-slot pre.mermaid{margin:0 auto;display:inline-block;max-width:100%;text-align:left;background:transparent;padding:0;border:none;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.45;}
    .ink-mermaid-slot pre.mermaid[data-ink-mermaid-rendered="1"],
    .ink-mermaid-slot pre.mermaid.ink-mermaid-rendered{font-family:inherit;white-space:normal;}
    .ink-mermaid-slot svg{max-width:100%;height:auto;display:block;margin:0 auto;}
    table{border-collapse:collapse;width:100%;margin:16px 0;}
    ${PREVIEW_TOGGLE_CSS}
  </style>
</head>
<body>
  <div class="ink-themed-post-root" style="${theme.container}">
    ${title ? `<h1 style="${theme.h1}">${title}</h1>` : ""}
    ${body}
  </div>
  <script>${PREVIEW_INTERACTION_SCRIPT}</script>
  <script type="module">${MERMAID_PREVIEW_BOOTSTRAP_MODULE}</script>
</body>
</html>`;
}

export function resolvePublicThemeId(raw) {
	if (!raw || typeof raw !== "string") return null;
	const k = raw.trim().toLowerCase();
	return Object.prototype.hasOwnProperty.call(THEMES, k) ? k : null;
}

export const PUBLIC_THEME_IDS = Object.freeze(Object.keys(THEMES));
