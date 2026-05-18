import { useEffect, useRef } from "react";
import {
	stashInkMermaidSources,
	replaceInkMermaidRenderErrors,
} from "../utils/mermaidPublicErrorFallback";

/**
 * Runs Mermaid on `.mermaid` blocks inside public/preview prose roots after HTML mounts.
 * Failed diagrams are swapped for an editorial fallback (no bomb icon).
 */
export function useHydrateMermaid(enabled, depsKey) {
	const genRef = useRef(0);
	useEffect(() => {
		if (!enabled || typeof window === "undefined" || depsKey == null) return undefined;
		const runId = ++genRef.current;
		let cancelled = false;
		const run = async () => {
			try {
				const proseRoots = () =>
					document.querySelectorAll(".ink-prose, .ink-themed-post-root");

				const mermaid = (await import("mermaid")).default;
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: "strict",
					theme: "neutral",
				});
				if (cancelled || genRef.current !== runId) return;
				/** Stash immediately before run so nothing else can mutate `<pre>` first. */
				proseRoots().forEach((root) => stashInkMermaidSources(root));
				await mermaid.run({
					querySelector:
						".ink-prose pre.mermaid, .ink-themed-post-root pre.mermaid",
					suppressErrors: true,
				});
				if (cancelled || genRef.current !== runId) return;
				/** Let Mermaid flush error SVG / foreignObject text before scanning DOM. */
				await new Promise((resolve) =>
					requestAnimationFrame(() =>
						requestAnimationFrame(resolve),
					),
				);
				if (cancelled || genRef.current !== runId) return;
				proseRoots().forEach((root) => replaceInkMermaidRenderErrors(root));
			} catch (e) {
				console.warn("[mermaid hydrate]", e);
			}
		};
		run();
		return () => {
			cancelled = true;
		};
	}, [enabled, depsKey]);
}
