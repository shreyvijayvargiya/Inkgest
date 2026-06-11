import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, Icons, Icon } from "../draftPageLib";
import DraftSearchableSelect from "./DraftSearchableSelect";
import BlogAudioPlayer from "../../../lib/ui/BlogAudioPlayer";
import { requestBlogToAudio } from "../../../lib/api/blogToAudio";
import {
	BLOG_TO_AUDIO_DEFAULT_LANGUAGE,
	BLOG_TO_AUDIO_DEFAULT_VOICE,
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

function slugifyFilename(str) {
	return (
		String(str || "audio")
			.replace(/[^a-z0-9]+/gi, "-")
			.replace(/^-|-$/g, "")
			.toLowerCase() || "audio"
	);
}

function BlogToAudioPanel({
	language,
	setLanguage,
	voice,
	setVoice,
	hasContent,
	generating,
	error,
	audioUrl,
	trackName,
	languageLabel,
	handleGenerate,
	handleDownload,
	downloading,
	className = "",
}) {
	return (
		<div className={className}>
			<p className="m-0 mb-3 text-xs font-bold text-[#111111]">
				Convert blog to audio
			</p>

			<div className="mb-3 flex flex-col gap-2.5">
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
						minWidth={200}
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
						minWidth={200}
					/>
				</div>
			</div>

			<motion.button
				type="button"
				whileHover={hasContent && !generating ? { scale: 1.01 } : undefined}
				whileTap={hasContent && !generating ? { scale: 0.98 } : undefined}
				disabled={!hasContent || generating}
				onClick={handleGenerate}
				className={`mb-0 w-full rounded-[9px] border-none px-3.5 py-2.5 text-[13px] font-bold ${
					generating || !hasContent
						? "cursor-not-allowed bg-[#E2E2E2] text-[#888888]"
						: "cursor-pointer bg-[#111111] text-white"
				} ${error || audioUrl ? "mb-3" : ""}`}
			>
				{generating ? "Generating audio…" : "Generate audio"}
			</motion.button>

			{!hasContent ? (
				<p className="mt-2.5 text-[11px] leading-snug text-[#888888]">
					Add content to your blog before generating audio.
				</p>
			) : null}

			{error ? (
				<p className="mb-3 text-[11px] leading-snug text-[#B45309]">{error}</p>
			) : null}

			{audioUrl ? (
				<BlogAudioPlayer
					src={audioUrl}
					name={trackName}
					caption={`${languageLabel} · ${voice}`}
					onDownload={handleDownload}
					downloading={downloading}
				/>
			) : null}
		</div>
	);
}

export default function BlogToAudioDropdown({
	content,
	title = "Blog audio",
	isCompact = false,
	inline = false,
}) {
	const rootRef = useRef(null);
	const abortRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [language, setLanguage] = useState(BLOG_TO_AUDIO_DEFAULT_LANGUAGE);
	const [voice, setVoice] = useState(BLOG_TO_AUDIO_DEFAULT_VOICE);
	const [generating, setGenerating] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [error, setError] = useState("");
	const [audioUrl, setAudioUrl] = useState(null);

	const hasContent = Boolean(String(content || "").trim());
	const languageLabel =
		LANGUAGE_OPTIONS.find((o) => o.value === language)?.label || language;

	const trackName = useMemo(() => {
		const base = title?.trim() || "Blog audio";
		return `${base} — ${languageLabel} (${voice})`;
	}, [title, languageLabel, voice]);

	const downloadFilename = useMemo(() => {
		const langSlug = slugifyFilename(languageLabel);
		const voiceSlug = slugifyFilename(voice);
		const titleSlug = slugifyFilename(title);
		return `${titleSlug}-${langSlug}-${voiceSlug}.wav`;
	}, [title, languageLabel, voice]);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (!rootRef.current?.contains(e.target)) setOpen(false);
		};
		const onKey = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	useEffect(() => {
		return () => abortRef.current?.abort();
	}, []);

	useEffect(() => {
		setAudioUrl(null);
		setError("");
	}, [language, voice, content]);

	const handleGenerate = useCallback(async () => {
		if (!hasContent || generating) return;
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setGenerating(true);
		setError("");
		setAudioUrl(null);

		try {
			const { url } = await requestBlogToAudio({
				content,
				language,
				voiceOver: voice,
				signal: controller.signal,
			});
			setAudioUrl(url);
		} catch (err) {
			if (err?.name === "AbortError") return;
			setError(err?.message || "Could not generate audio");
		} finally {
			setGenerating(false);
		}
	}, [content, hasContent, generating, language, voice]);

	const handleDownload = useCallback(async () => {
		if (!audioUrl || downloading) return;
		setDownloading(true);
		try {
			const res = await fetch(audioUrl);
			const blob = await res.blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = blobUrl;
			a.download = downloadFilename;
			a.click();
			URL.revokeObjectURL(blobUrl);
		} catch {
			const a = document.createElement("a");
			a.href = audioUrl;
			a.download = downloadFilename;
			a.target = "_blank";
			a.rel = "noopener noreferrer";
			a.click();
		} finally {
			setDownloading(false);
		}
	}, [audioUrl, downloadFilename, downloading]);

	const panelProps = {
		language,
		setLanguage,
		voice,
		setVoice,
		hasContent,
		generating,
		error,
		audioUrl,
		trackName,
		languageLabel,
		handleGenerate,
		handleDownload,
		downloading,
	};

	if (inline) {
		return <BlogToAudioPanel {...panelProps} />;
	}

	return (
		<div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
			<motion.button
				type="button"
				whileHover={{ background: "#F0ECE5" }}
				whileTap={{ scale: 0.95 }}
				onClick={() => setOpen((o) => !o)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					background: open ? "#F0ECE5" : T.base,
					border: `1px solid ${T.border}`,
					borderRadius: 9,
					padding: isCompact ? "7px 10px" : "8px 14px",
					fontSize: isCompact ? 12 : 13,
					fontWeight: 600,
					color: T.accent,
					cursor: "pointer",
					flexShrink: 0,
					whiteSpace: "nowrap",
				}}
			>
				<svg
					width={13}
					height={13}
					viewBox="0 0 24 24"
					fill="none"
					stroke={T.accent}
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
					<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
					<line x1="12" y1="19" x2="12" y2="22" />
				</svg>
				{isCompact ? "Audio" : "Text to Audio"}
				<span
					style={{
						display: "inline-flex",
						transform: open ? "rotate(180deg)" : "none",
						transition: "transform 0.18s ease",
					}}
				>
					<Icon d={Icons.chevronD} size={14} stroke={T.accent} />
				</span>
			</motion.button>

			<AnimatePresence>
				{open ? (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
						className={`absolute right-0 top-full z-[410] mt-1.5 rounded-xl border border-[#E2E2E2] bg-white p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)] ${
							isCompact ? "w-[300px]" : "w-[340px]"
						} max-w-[calc(100vw-24px)]`}
					>
						<BlogToAudioPanel {...panelProps} />
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
