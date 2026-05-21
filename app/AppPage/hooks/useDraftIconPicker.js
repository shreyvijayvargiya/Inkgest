import { useCallback, useEffect } from "react";

/**
 * Opens the draft icon picker when clicking [data-icon-selector] chips in the editor.
 * Uses a bubble-phase click on the contenteditable root (no window globals / inline onclick).
 */
export function useDraftIconPicker({
	editorRef,
	draftId,
	draftBody,
	iconPickerRef,
	iconPickerTargetRef,
	setIconPicker,
	iconPicker,
}) {
	const openAtChip = useCallback(
		(chip) => {
			if (!chip) return;
			iconPickerTargetRef.current = chip;
			const rect = chip.getBoundingClientRect();
			setIconPicker({
				x: Math.min(rect.left, window.innerWidth - 310),
				y: Math.min(rect.bottom + 6, window.innerHeight - 390),
				mode: "block",
			});
		},
		[iconPickerTargetRef, setIconPicker],
	);

	const openAtPoint = useCallback(
		(x, y) => {
			iconPickerTargetRef.current = null;
			setIconPicker({
				x: Math.min(x, window.innerWidth - 310),
				y: Math.min(y, window.innerHeight - 390),
				mode: "inline",
			});
		},
		[iconPickerTargetRef, setIconPicker],
	);

	const close = useCallback(() => {
		setIconPicker(null);
		iconPickerTargetRef.current = null;
	}, [iconPickerTargetRef, setIconPicker]);

	/* Delegate clicks from icon chips inside the editor */
	useEffect(() => {
		const root = editorRef.current;
		if (!root || !draftId) return;

		const onEditorClick = (e) => {
			const chip = e.target?.closest?.("[data-icon-selector]");
			if (!chip || !root.contains(chip)) return;
			e.preventDefault();
			e.stopPropagation();
			openAtChip(chip);
		};

		root.addEventListener("click", onEditorClick);
		return () => root.removeEventListener("click", onEditorClick);
	}, [draftId, draftBody, editorRef, openAtChip]);

	/* Dismiss picker on outside pointerdown (deferred so opening click does not close) */
	useEffect(() => {
		if (!iconPicker) return;

		const onPointerDown = (e) => {
			const t = e.target;
			if (iconPickerRef.current?.contains(t)) return;
			if (iconPickerTargetRef.current?.contains?.(t)) return;
			if (t.closest?.("[data-icon-selector]")) return;
			close();
		};

		const id = setTimeout(() => {
			document.addEventListener("pointerdown", onPointerDown);
		}, 0);

		return () => {
			clearTimeout(id);
			document.removeEventListener("pointerdown", onPointerDown);
		};
	}, [iconPicker, iconPickerRef, iconPickerTargetRef, close]);

	return { openAtChip, openAtPoint, close };
}
