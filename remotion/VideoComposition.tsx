import {
	AbsoluteFill,
	Audio,
	Img,
	Sequence,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
} from "remotion";

interface SlideshowProps {
	images: string[];
	title: string;
	audioUrl: string;
	perSlide: number; // seconds per slide
}

const TITLE_DURATION_S = 2.5;

const Slide: React.FC<{
	src: string;
	startFrame: number;
	durationFrames: number;
	index: number;
}> = ({ src, startFrame, durationFrames, index }) => {
	const frame = useCurrentFrame();
	const localFrame = frame - startFrame;

	// Ken Burns: alternate pan direction per slide
	const even = index % 2 === 0;
	const scale = interpolate(localFrame, [0, durationFrames], [1.05, 1.18], {
		easing: Easing.linear,
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const pan = interpolate(localFrame, [0, durationFrames], [0, even ? -3 : 3], {
		easing: Easing.linear,
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Fade in/out at edges
	const opacity = interpolate(
		localFrame,
		[0, 12, durationFrames - 12, durationFrames],
		[0, 1, 1, 0],
		{
			easing: Easing.ease,
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);

	return (
		<AbsoluteFill style={{ opacity }}>
			<Img
				src={src}
				style={{
					width: "100%",
					height: "100%",
					objectFit: "cover",
					transform: `scale(${scale}) translateX(${pan}%)`,
				}}
			/>
			{/* subtle dark vignette */}
			<AbsoluteFill
				style={{
					background:
						"radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
				}}
			/>
		</AbsoluteFill>
	);
};

export const VideoComposition: React.FC<SlideshowProps> = ({
	images,
	title,
	audioUrl,
	perSlide,
}) => {
	const { fps } = useVideoConfig();
	const frame = useCurrentFrame();
	const titleFrames = Math.round(TITLE_DURATION_S * fps);
	const slideFrames = Math.round(perSlide * fps);

	return (
		<AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
			{/* ── Background slides ── */}
			{images.map((src, i) => {
				const startFrame = titleFrames + i * slideFrames;
				return (
					<Sequence key={i} from={startFrame} durationInFrames={slideFrames}>
						<Slide
							src={src}
							startFrame={startFrame}
							durationFrames={slideFrames}
							index={i}
						/>
					</Sequence>
				);
			})}

			{/* ── Narration audio ── */}
			{audioUrl ? <Audio src={audioUrl} volume={1} /> : null}

			{/* ── Title card ── */}
			<Sequence from={0} durationInFrames={titleFrames + 15}>
				<AbsoluteFill
					style={{
						justifyContent: "center",
						alignItems: "center",
						background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)",
						opacity: interpolate(
							frame,
							[0, 10, titleFrames, titleFrames + 15],
							[0, 1, 1, 0],
							{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
						),
					}}
				>
					<div
						style={{
							textAlign: "center",
							padding: "0 60px",
							maxWidth: 900,
						}}
					>
						<p
							style={{
								fontSize: 14,
								letterSpacing: 6,
								color: "#7c7cff",
								textTransform: "uppercase",
								fontFamily: "sans-serif",
								marginBottom: 20,
								opacity: 0.8,
							}}
						>
							DEMO
						</p>
						<h1
							style={{
								fontSize: 56,
								fontWeight: 700,
								color: "#ffffff",
								fontFamily: "sans-serif",
								lineHeight: 1.2,
								margin: 0,
								textShadow: "0 4px 20px rgba(0,0,0,0.6)",
							}}
						>
							{title}
						</h1>
					</div>
				</AbsoluteFill>
			</Sequence>

			{/* ── Slide-level title overlay (bottom-left caption) ── */}
			{images.map((_, i) => {
				const startFrame = titleFrames + i * slideFrames;
				const localFrame = frame - startFrame;
				const opacity = interpolate(
					localFrame,
					[0, 15, slideFrames - 15, slideFrames],
					[0, 1, 1, 0],
					{
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
					},
				);
				return (
					<Sequence key={`cap-${i}`} from={startFrame} durationInFrames={slideFrames}>
						<AbsoluteFill
							style={{
								justifyContent: "flex-end",
								alignItems: "flex-start",
								padding: "40px 50px",
								opacity,
							}}
						>
							<div
								style={{
									display: "flex",
									gap: 6,
								}}
							>
								{images.map((_, j) => (
									<div
										key={j}
										style={{
											width: j === i ? 24 : 8,
											height: 4,
											borderRadius: 2,
											backgroundColor: j === i ? "#7c7cff" : "rgba(255,255,255,0.35)",
											transition: "width 0.3s",
										}}
									/>
								))}
							</div>
						</AbsoluteFill>
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};
