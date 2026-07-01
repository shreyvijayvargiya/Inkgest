import { useState } from "react";
import { motion } from "framer-motion";
import DraftSearchableSelect from "./DraftSearchableSelect";
import BlogAudioPlayer from "../../../lib/ui/BlogAudioPlayer";
import {
	BLOG_TO_AUDIO_LANGUAGES,
	BLOG_TO_AUDIO_VOICES,
} from "../../../lib/data/blogToAudioOptions";

const LANGUAGE_OPTIONS = BLOG_TO_AUDIO_LANGUAGES.map((l) => ({
	value: l.code,
	label: l.name,
	searchText: `${l.name} ${l.code}`,
}));

const VOICE_OPTIONS = BLOG_TO_AUDIO_VOICES.map((v) => ({
	value: v,
	label: v,
	searchText: v,
}));

function ActionButton({ children, onClick, disabled, active, title }) {
	return (
		<button
			type="button"
			title={title}
			disabled={disabled}
			onClick={onClick}
			className={`flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E2E2E2] bg-white px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
				active
					? "border-[#2D6A4F] bg-[rgba(45,106,79,0.1)] text-[#2D6A4F]"
					: "text-[#111111] hover:bg-[#F0ECE5]"
			} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
		>
			{children}
		</button>
	);
}

function SavedAudioRow({ entry, onCopyUrl, onDownload }) {
	const [copied, setCopied] = useState(false);
	const [playingUrl, setPlayingUrl] = useState(null);

	const label = entry.title || `${entry.languageName || entry.language} · ${entry.voice}`;
	const date = entry.createdAt
		? new Date(entry.createdAt).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "";

	return (
		<div className="rounded-xl border border-[#E2E2E2] bg-white p-3">
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p className="m-0 truncate text-[13px] font-semibold text-[#111111]">
						{label}
					</p>
					<p className="m-0 mt-0.5 text-[11px] text-[#888888]">
						{entry.languageName || entry.language} · {entry.voice}
						{date ? ` · ${date}` : ""}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<ActionButton
						title="Copy audio URL"
						active={copied}
						onClick={async () => {
							await onCopyUrl(entry.url);
							setCopied(true);
							setTimeout(() => setCopied(false), 2200);
						}}
					>
						{copied ? "Copied!" : "Copy URL"}
					</ActionButton>
					<ActionButton
						title="Download"
						onClick={() => onDownload(entry.url, `${entry.id}.wav`)}
					>
						Download
					</ActionButton>
				</div>
			</div>
			{playingUrl === entry.url ? (
				<BlogAudioPlayer
					src={entry.url}
					name={label}
					caption={`${entry.languageName || entry.language} · ${entry.voice}`}
					showDownload={false}
					showCopyUrl={false}
					showSave={false}
				/>
			) : (
				<button
					type="button"
					onClick={() => setPlayingUrl(entry.url)}
					className="w-full cursor-pointer rounded-xl border border-dashed border-[#E2E2E2] bg-[#FAFAF8] px-3 py-2 text-left text-[11px] font-semibold text-[#888888] hover:border-[#111111] hover:text-[#111111]"
				>
					▶ Play saved audio
				</button>
			)}
		</div>
	);
}

export default function PreviewExportAudioPanel({
	language,
	setLanguage,
	voice,
	setVoice,
	generating,
	saving,
	downloading,
	error,
	audioUrl,
	copiedUrl,
	savedFlash,
	hasContent,
	languageLabel,
	trackName,
	savedAudios,
	creditCost,
	handleGenerate,
	handleCopyUrl,
	handleDownload,
	handleSave,
}) {
	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFAF8]">
			<div className="shrink-0 border-b border-[#E2E2E2] bg-white px-4 py-4 md:px-6">
				<div className="mb-3 flex items-start justify-between gap-3">
					<div>
						<h3 className="m-0 text-sm font-bold text-[#111111] md:text-[15px]">
							Text to audio
						</h3>
						<p className="m-0 mt-1 text-[11px] text-[#888888]">
							Generate speech from your blog content · {creditCost} credit per
							job
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
					<div>
						<label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#888888]">
							Language
						</label>
						<DraftSearchableSelect
							value={language}
							onChange={setLanguage}
							options={LANGUAGE_OPTIONS}
							placeholder="Select language…"
							searchPlaceholder="Search languages…"
							zIndex={420}
							width="100%"
							minWidth={160}
						/>
					</div>
					<div>
						<label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#888888]">
							Voice
						</label>
						<DraftSearchableSelect
							value={voice}
							onChange={setVoice}
							options={VOICE_OPTIONS}
							placeholder="Select voice…"
							searchPlaceholder="Search voices…"
							zIndex={421}
							width="100%"
							minWidth={160}
						/>
					</div>
					<motion.button
						type="button"
						whileHover={hasContent && !generating ? { scale: 1.01 } : undefined}
						whileTap={hasContent && !generating ? { scale: 0.98 } : undefined}
						disabled={!hasContent || generating}
						onClick={handleGenerate}
						className={`h-[42px] w-full rounded-xl border-none px-5 text-[13px] font-bold md:w-auto ${
							generating || !hasContent
								? "cursor-not-allowed bg-[#E2E2E2] text-[#888888]"
								: "cursor-pointer bg-[#111111] text-white"
						}`}
					>
						{generating ? "Generating…" : "Generate audio"}
					</motion.button>
				</div>

				{!hasContent ? (
					<p className="m-0 mt-3 text-[11px] text-[#888888]">
						Add content to your blog before generating audio.
					</p>
				) : null}
				{error ? (
					<p className="m-0 mt-3 text-[11px] leading-snug text-[#B45309]">
						{error}
					</p>
				) : null}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
				{audioUrl ? (
					<div className="mb-6">
						<div className="mb-2 flex items-center justify-between gap-2">
							<p className="m-0 text-[10px] font-bold uppercase tracking-wider text-[#888888]">
								Current generation
							</p>
							<div className="flex items-center gap-1.5">
								<ActionButton
									title="Copy audio URL"
									active={copiedUrl}
									onClick={() => handleCopyUrl()}
								>
									{copiedUrl ? "URL copied!" : "Copy URL"}
								</ActionButton>
								<ActionButton
									title="Save to draft"
									active={savedFlash}
									disabled={saving}
									onClick={handleSave}
								>
									{saving ? "Saving…" : savedFlash ? "Saved!" : "Save"}
								</ActionButton>
								<ActionButton
									title="Download audio"
									disabled={downloading}
									onClick={() => handleDownload()}
								>
									{downloading ? "…" : "Download"}
								</ActionButton>
							</div>
						</div>
						<BlogAudioPlayer
							src={audioUrl}
							name={trackName}
							caption={`${languageLabel} · ${voice}`}
							showDownload={false}
							showCopyUrl={false}
							showSave={false}
						/>
					</div>
				) : null}

				<div>
					<p className="m-0 mb-3 text-[10px] font-bold uppercase tracking-wider text-[#888888]">
						Saved audio{savedAudios.length ? ` (${savedAudios.length})` : ""}
					</p>
					{savedAudios.length ? (
						<div className="flex flex-col gap-2.5">
							{savedAudios.map((entry) => (
								<SavedAudioRow
									key={entry.id}
									entry={entry}
									onCopyUrl={handleCopyUrl}
									onDownload={handleDownload}
								/>
							))}
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-[#E2E2E2] bg-white px-4 py-8 text-center">
							<p className="m-0 text-[13px] font-semibold text-[#111111]">
								No saved audio yet
							</p>
							<p className="m-0 mt-1 text-[11px] text-[#888888]">
								Generate audio, then use Save to keep it with this draft.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
