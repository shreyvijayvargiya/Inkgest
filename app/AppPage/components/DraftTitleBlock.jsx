import { T } from "../draftPageLib";

export default function DraftTitleBlock({
	editorVariant,
	editorFont,
	editorRef,
	titleRef,
	draftTitleHtml,
}) {
	const variantBg =
		editorVariant === "terminal"
			? "#0D1117"
			: editorVariant === "typewriter"
				? "#EDE3CC"
				: editorVariant === "paper"
					? "#FEFDF4"
					: editorVariant === "minimal"
						? "#FAFAF8"
						: T.surface;
	const variantColor = editorVariant === "terminal" ? "#A8FF78" : T.accent;
	const variantFont =
		editorVariant === "typewriter"
			? "'Courier New', Courier, monospace"
			: editorVariant === "minimal"
				? "Georgia, 'Times New Roman', serif"
				: editorFont === "Georgia"
					? "Georgia, serif"
					: editorFont === "system-ui"
						? "system-ui, sans-serif"
						: "'Comic', sans-serif";

	return (
		<div
			style={{
				padding: "36px 0 18px",
				background: variantBg,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) editorRef.current?.focus();
			}}
		>
			<div style={{ width: "100%", maxWidth: 720, padding: "0 48px" }}>
				<div
					ref={titleRef}
					contentEditable
					suppressContentEditableWarning
					data-placeholder="Untitled draft"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							editorRef.current?.focus();
							const sel = window.getSelection();
							const el = editorRef.current;
							if (sel && el) {
								const range = document.createRange();
								range.setStart(el, 0);
								range.collapse(true);
								sel.removeAllRanges();
								sel.addRange(range);
							}
						}
					}}
					style={{
						fontSize: "clamp(24px, 3.5vw, 34px)",
						color: variantColor,
						lineHeight: 1.2,
						letterSpacing: "-0.6px",
						outline: "none",
						fontWeight: 700,
						fontFamily: variantFont,
					}}
					dangerouslySetInnerHTML={{ __html: draftTitleHtml || "" }}
				/>
			</div>
		</div>
	);
}
