import { useEffect } from "react";

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
			try {
				const nodes = Array.from(
					root.querySelectorAll("pre.mermaid"),
				).filter((n) => n instanceof HTMLElement);
				if (!nodes.length) return;
				const mermaid = (await import("mermaid")).default;
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: "strict",
					theme: "neutral",
				});
				if (cancelled) return;
				await mermaid.run({ nodes });
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
