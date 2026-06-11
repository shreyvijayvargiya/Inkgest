import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const WAVE_GRAY =
	"repeating-linear-gradient(90deg,#9A9490 0,#9A9490 2px,transparent 2px,transparent 8px)";
const WAVE_AMBER =
	"repeating-linear-gradient(90deg,#C17B2F 0,#C17B2F 2px,transparent 2px,transparent 8px)";

function fmtTime(s) {
	if (!Number.isFinite(s) || s < 0) return "0:00";
	const m = Math.floor(s / 60);
	const sc = Math.floor(s % 60);
	return `${m}:${sc < 10 ? "0" : ""}${sc}`;
}

export default function BlogAudioPlayer({
	src,
	name = "Audio track",
	caption = "",
	onDownload,
	downloading = false,
	showDownload = true,
}) {
	const audioRef = useRef(null);
	const [playing, setPlaying] = useState(false);
	const [current, setCurrent] = useState(0);
	const [duration, setDuration] = useState(0);
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		setPlaying(false);
		setCurrent(0);
		setDuration(0);
		setProgress(0);
	}, [src]);

	const togglePlay = useCallback(() => {
		const aud = audioRef.current;
		if (!aud) return;
		if (aud.paused) {
			aud.play().catch(() => {});
		} else {
			aud.pause();
		}
	}, []);

	const handleSeek = useCallback((e) => {
		const aud = audioRef.current;
		if (!aud || !aud.duration) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		aud.currentTime = ratio * aud.duration;
	}, []);

	return (
		<figure
			style={{
				margin: 0,
				border: "1px solid #E8E4DC",
				borderRadius: 14,
				overflow: "hidden",
				background: "#FAFAF8",
				position: "relative",
			}}
		>
			<div
				style={{
					padding: "14px 16px 12px",
					display: "flex",
					flexDirection: "column",
					gap: 10,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 10,
						paddingRight: showDownload ? 0 : 0,
					}}
				>
					<div
						style={{
							width: 34,
							height: 34,
							borderRadius: 8,
							background: "#FEF3E2",
							border: "1px solid #F6D9A8",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							fontSize: 18,
							lineHeight: 1,
						}}
					>
						🎵
					</div>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontSize: 13,
								fontWeight: 600,
								color: "#37352F",
								lineHeight: 1.4,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{name}
						</div>
					</div>
					{showDownload && onDownload ? (
						<motion.button
							type="button"
							whileHover={{ background: "#F0ECE5" }}
							whileTap={{ scale: 0.95 }}
							disabled={downloading}
							onClick={onDownload}
							title="Download audio"
							style={{
								flexShrink: 0,
								display: "flex",
								alignItems: "center",
								gap: 5,
								padding: "5px 10px",
								borderRadius: 8,
								border: "1px solid #E8E4DC",
								background: "#fff",
								color: "#37352F",
								fontSize: 11,
								fontWeight: 600,
								cursor: downloading ? "wait" : "pointer",
								opacity: downloading ? 0.7 : 1,
							}}
						>
							<svg
								width={12}
								height={12}
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
							{downloading ? "…" : "Download"}
						</motion.button>
					) : null}
				</div>

				<div
					style={{
						background: "#37352F",
						borderRadius: 10,
						padding: "10px 14px",
						display: "flex",
						alignItems: "center",
						gap: 12,
					}}
				>
					<audio
						ref={audioRef}
						src={src}
						preload="metadata"
						style={{ display: "none" }}
						onLoadedMetadata={(e) => {
							const d = e.currentTarget.duration;
							if (Number.isFinite(d)) setDuration(d);
						}}
						onTimeUpdate={(e) => {
							const aud = e.currentTarget;
							setCurrent(aud.currentTime);
							if (aud.duration) {
								setProgress((aud.currentTime / aud.duration) * 100);
							}
						}}
						onPlay={() => setPlaying(true)}
						onPause={() => setPlaying(false)}
						onEnded={() => {
							setPlaying(false);
							setCurrent(0);
							setProgress(0);
						}}
					/>
					<button
						type="button"
						onClick={togglePlay}
						style={{
							width: 34,
							height: 34,
							borderRadius: "50%",
							background: "#555250",
							border: "none",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							cursor: "pointer",
							flexShrink: 0,
							padding: 0,
						}}
					>
						{playing ? (
							<svg width="14" height="14" viewBox="0 0 24 24">
								<rect x="5" y="3" width="4" height="18" fill="white" rx="1" />
								<rect x="15" y="3" width="4" height="18" fill="white" rx="1" />
							</svg>
						) : (
							<svg width="14" height="14" viewBox="0 0 24 24">
								<polygon points="5,3 19,12 5,21" fill="white" stroke="none" />
							</svg>
						)}
					</button>

					<div
						style={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							gap: 5,
							minWidth: 0,
						}}
					>
						<div
							role="presentation"
							onClick={handleSeek}
							style={{
								position: "relative",
								height: 20,
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
							}}
						>
							<div
								style={{
									position: "absolute",
									inset: 0,
									display: "flex",
									alignItems: "center",
									pointerEvents: "none",
								}}
							>
								<div
									style={{
										width: "100%",
										height: 3,
										background: WAVE_GRAY,
										borderRadius: 2,
										opacity: 0.5,
									}}
								/>
							</div>
							<div
								style={{
									position: "absolute",
									left: 0,
									top: 0,
									height: "100%",
									width: `${progress}%`,
									overflow: "hidden",
									pointerEvents: "none",
								}}
							>
								<div
									style={{
										position: "absolute",
										inset: 0,
										display: "flex",
										alignItems: "center",
									}}
								>
									<div
										style={{
											width: 9999,
											height: 3,
											background: WAVE_AMBER,
											borderRadius: 2,
										}}
									/>
								</div>
							</div>
						</div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<span
								style={{
									fontSize: 10,
									color: "#9A9490",
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{fmtTime(current)}
							</span>
							<span
								style={{
									fontSize: 10,
									color: "#6B6560",
									fontWeight: 600,
									letterSpacing: "0.06em",
								}}
							>
								🎧 NOW PLAYING
							</span>
							<span
								style={{
									fontSize: 10,
									color: "#9A9490",
									fontVariantNumeric: "tabular-nums",
								}}
							>
								{fmtTime(duration)}
							</span>
						</div>
					</div>
				</div>
			</div>
			{caption ? (
				<figcaption
					style={{
						padding: "8px 16px 10px",
						fontSize: 12,
						color: "#7A7570",
						lineHeight: 1.5,
						borderTop: "1px solid #F0ECE5",
					}}
				>
					{caption}
				</figcaption>
			) : null}
		</figure>
	);
}
