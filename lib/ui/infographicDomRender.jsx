"use client";

/**
 * Static HTML for one infographic spec — client-only (React → DOM snapshot).
 */

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { InfographicCard } from "./InfographicsModal";

/** Inner HTML fragment (no outer wrapper) suitable for iframe srcDoc body. */
export function renderInfographicCardInnerHtml(spec) {
	if (typeof document === "undefined") return "";
	const host = document.createElement("div");
	host.style.visibility = "hidden";
	host.style.position = "fixed";
	host.style.pointerEvents = "none";
	host.style.left = "-9999px";
	host.style.top = "0";
	document.body.appendChild(host);
	let out = "";
	try {
		const root = createRoot(host);
		flushSync(() => root.render(<InfographicCard ig={spec} />));
		out = host.innerHTML || "";
		root.unmount();
	} catch {
		out = "";
	} finally {
		host.remove();
	}
	return out;
}
