import { useSyncExternalStore } from "react";

/** Viewport narrower than Tailwind `md` — treat as phones / narrow tablets */
const QUERY = "(max-width: 767px)";

/**
 * Stable client-aware match for overlay nav / asset drawers.
 * Server snapshot assumes non-compact so first paint matches typical desktop SSR.
 */
export function useCompactAssetsNav() {
	const val = useSyncExternalStore(
		(onChange) => {
			if (typeof window === "undefined") return () => {};
			const mq = window.matchMedia(QUERY);
			mq.addEventListener("change", onChange);
			return () => mq.removeEventListener("change", onChange);
		},
		() => window.matchMedia(QUERY).matches,
		() => false,
	);
	return val;
}
