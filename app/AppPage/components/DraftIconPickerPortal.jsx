import { createPortal } from "react-dom";
import IconSelectorDropdown from "../../../lib/ui/IconSelectorDropdown.jsx";
import {
	applyIconToSelectorTarget,
	insertInlineIconAtSelection,
	makeIconBlockHtml,
} from "../draftPageLib";
import { lucideToSvgString } from "../../../lib/ui/IconSelectorDropdown.jsx";

export default function DraftIconPickerPortal({
	iconPicker,
	pickerRef,
	targetRef,
	onClose,
	onInlineInserted,
	editorRef,
	selectionSavedRangeRef,
	restoreEditorSelection,
	countWords,
}) {
	if (!iconPicker || typeof document === "undefined") return null;

	return createPortal(
		<div
			ref={pickerRef}
			data-icon-selector-portal
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
			style={{
				position: "fixed",
				left: iconPicker.x,
				top: iconPicker.y,
				zIndex: 250,
			}}
		>
			<IconSelectorDropdown
				onSelect={(pick) => {
					if (iconPicker.mode === "block" && targetRef.current) {
						applyIconToSelectorTarget(targetRef.current, pick);
					} else if (iconPicker.mode === "inline") {
						restoreEditorSelection();
						const html =
							pick.type === "emoji"
								? makeIconBlockHtml(pick.value, "emoji")
								: makeIconBlockHtml(
										lucideToSvgString(pick.icon, 18),
										"lucide",
									);
						insertInlineIconAtSelection(
							editorRef.current,
							html,
							selectionSavedRangeRef.current,
						);
						onInlineInserted?.();
					}
					onClose();
					countWords();
				}}
				onClose={onClose}
			/>
		</div>,
		document.body,
	);
}
