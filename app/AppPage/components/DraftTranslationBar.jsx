import { motion } from "framer-motion";
import { T } from "../draftPageLib";
import { isSourceLanguage } from "../../../lib/utils/translateLanguage";
import TranslationLanguageSelect from "./TranslationLanguageSelect";

export default function DraftTranslationBar({
	compact = false,
	translationLang,
	setTranslationLang,
	onTranslate,
	onSaveTranslation,
	onShowOriginal,
	translating,
	savingTranslation,
	translationError,
	translationSaved,
	savedLangs = [],
	creditEstimate,
	hasTranslatedPreview,
}) {
	const showSave =
		!isSourceLanguage(translationLang) && hasTranslatedPreview;
	const showOriginal =
		hasTranslatedPreview && !isSourceLanguage(translationLang);

	return (
		<div
			style={{
				gap: compact ? 6 : 8,
				width: compact ? "max-content" : undefined,
				minWidth: compact ? "100%" : undefined,
			}}
			className="space-y-2 h-full"
		>
			<div style={{ flex: compact ? "1 1 140px" : undefined, minWidth: compact ? 120 : undefined, maxWidth: compact ? 200 : undefined }}>
				<TranslationLanguageSelect
					value={translationLang}
					onChange={setTranslationLang}
					zIndex={450}
				/>
			</div>

			<motion.button
				type="button"
				whileHover={{ background: "#F0ECE5" }}
				whileTap={{ scale: 0.97 }}
				disabled={translating || isSourceLanguage(translationLang)}
				onClick={onTranslate}
				title={`Uses ${creditEstimate} credit per translation`}
				style={{
					padding: "6px 12px",
					borderRadius: 8,
					border: "none",
					background: translating ? T.border : T.warm,
					color: translating ? T.muted : "#fff",
					fontSize: 12,
					fontWeight: 700,
					cursor:
						translating || isSourceLanguage(translationLang)
							? "not-allowed"
							: "pointer",
					whiteSpace: "nowrap",
					flexShrink: 0,
				}}
			>
				{translating ? "Translating…" : "Translate"}
			</motion.button>

			{showSave ? (
				<motion.button
					type="button"
					whileHover={{ background: "#EFF6EE" }}
					whileTap={{ scale: 0.97 }}
					disabled={savingTranslation}
					onClick={onSaveTranslation}
					style={{
						padding: "6px 12px",
						borderRadius: 8,
						border: `1px solid ${translationSaved ? "#8BC57E" : T.border}`,
						background: translationSaved ? "#EFF6EE" : T.surface,
						color: translationSaved ? "#3D7A35" : T.accent,
						fontSize: 12,
						fontWeight: 600,
						cursor: savingTranslation ? "wait" : "pointer",
						whiteSpace: "nowrap",
						flexShrink: 0,
					}}
				>
					{savingTranslation
						? "Saving…"
						: translationSaved
							? "Saved!"
							: "Save"}
				</motion.button>
			) : null}

			{showOriginal ? (
				<button
					type="button"
					onClick={onShowOriginal}
					style={{
						padding: "6px 10px",
						borderRadius: 8,
						border: `1px solid ${T.border}`,
						background: T.surface,
						color: T.muted,
						fontSize: 12,
						fontWeight: 600,
						cursor: "pointer",
						whiteSpace: "nowrap",
						flexShrink: 0,
					}}
				>
					Original
				</button>
			) : null}

			{savedLangs.length > 0 ? (
				<span
					style={{
						fontSize: 10,
						color: T.muted,
						whiteSpace: "nowrap",
						flexShrink: 0,
						maxWidth: compact ? 72 : 100,
						overflow: "hidden",
						textOverflow: "ellipsis",
						marginLeft: compact ? "auto" : undefined,
					}}
					title={`Saved: ${savedLangs.join(", ")}`}
				>
					{savedLangs.length} saved
				</span>
			) : null}

			{/* Inline errors only when not shown in modal strip (e.g. standalone use) */}
			{translationError ? (
				<span
					style={{
						fontSize: 11,
						color: "#B45309",
						maxWidth: 160,
						lineHeight: 1.3,
						flexShrink: 1,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
					title={translationError}
				>
					{translationError}
				</span>
			) : null}
		</div>
	);
}
