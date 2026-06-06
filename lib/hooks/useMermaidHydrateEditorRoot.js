import { useEffect } from "react";
import { renderMermaidInRoot } from "../mermaid/renderMermaidInHtmlDoc";

/**
 * Keeps `pre.mermaid` blocks rendered inside a contenteditable editor root.
 */
export function useMermaidHydrateEditorRoot(rootRef, enabled = true) {
	useEffect(() => {
		if (!enabled || typeof window === "undefined") return undefined;
		const root = rootRef?.current;
		if (!(root instanceof HTMLElement)) return undefined;

		let cancelled = false;
		let timer;

		const run = async () => {
			if (cancelled) return;
			try {
				await renderMermaidInRoot(root);
			} catch (e) {
				console.warn("[mermaid editor hydrate]", e);
			}
		};

		const schedule = () => {
			clearTimeout(timer);
			timer = setTimeout(() => {
				run();
			}, 280);
		};

		schedule();
		const obs = new MutationObserver(schedule);
		obs.observe(root, { childList: true, subtree: true });

		return () => {
			cancelled = true;
			clearTimeout(timer);
			obs.disconnect();
		};
	}, [enabled, rootRef]);
}
