import { useState, useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "inkgest.workspaceSidebarWidth";
const SYNC_EVENT = "inkgest:workspace-sidebar-width";

export const WORKSPACE_SIDEBAR_WIDTH_DEFAULT = 280;
export const WORKSPACE_SIDEBAR_WIDTH_MIN = 260;
export const WORKSPACE_SIDEBAR_WIDTH_MAX = 420;

function clampWidth(n) {
	return Math.min(
		WORKSPACE_SIDEBAR_WIDTH_MAX,
		Math.max(WORKSPACE_SIDEBAR_WIDTH_MIN, n),
	);
}

function readStoredWidth() {
	if (typeof window === "undefined") return WORKSPACE_SIDEBAR_WIDTH_DEFAULT;
	const n = Number(localStorage.getItem(STORAGE_KEY));
	if (!Number.isFinite(n)) return WORKSPACE_SIDEBAR_WIDTH_DEFAULT;
	return clampWidth(n);
}

function persistWidth(w) {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, String(w));
	window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: w }));
}

/** Shared resizable workspace sidebar width (persisted + synced across instances). */
export function useWorkspaceSidebarWidth() {
	const [width, setWidth] = useState(WORKSPACE_SIDEBAR_WIDTH_DEFAULT);
	const widthRef = useRef(WORKSPACE_SIDEBAR_WIDTH_DEFAULT);
	const resizingRef = useRef(false);
	const startXRef = useRef(0);
	const startWRef = useRef(0);

	useEffect(() => {
		const initial = readStoredWidth();
		widthRef.current = initial;
		setWidth(initial);

		const onSync = (e) => {
			const next =
				typeof e.detail === "number" ? clampWidth(e.detail) : readStoredWidth();
			widthRef.current = next;
			setWidth(next);
		};
		window.addEventListener(SYNC_EVENT, onSync);
		return () => window.removeEventListener(SYNC_EVENT, onSync);
	}, []);

	const onResizePointerDown = useCallback((e) => {
		e.preventDefault();
		e.stopPropagation();
		resizingRef.current = true;
		startXRef.current = e.clientX;
		startWRef.current = widthRef.current;

		document.body.classList.add("select-none", "cursor-col-resize");

		const onMove = (ev) => {
			if (!resizingRef.current) return;
			const delta = ev.clientX - startXRef.current;
			const next = clampWidth(startWRef.current + delta);
			widthRef.current = next;
			setWidth(next);
		};

		const onUp = () => {
			resizingRef.current = false;
			document.body.classList.remove("select-none", "cursor-col-resize");
			persistWidth(widthRef.current);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	}, []);

	return { width, onResizePointerDown };
}
