"use client";

import { InfographicCard } from "./InfographicsModal";

/** Fixed design width — cards are authored at ~520px. */
export const INFOGRAPHIC_THUMB_DESIGN_WIDTH = 520;

/**
 * Scaled live React preview (not iframe/srcDoc) so framer-motion charts render fully.
 */
export default function InfographicThumbPreview({
	ig,
	height = 148,
	designWidth = INFOGRAPHIC_THUMB_DESIGN_WIDTH,
}) {
	const scale = height / designWidth;
	return (
		<div
			style={{
				height,
				overflow: "hidden",
				background: "#FAFAF8",
				position: "relative",
			}}
		>
			<div
				style={{
					width: designWidth,
					transform: `scale(${scale})`,
					transformOrigin: "top left",
					pointerEvents: "none",
				}}
			>
				<InfographicCard ig={ig} />
			</div>
		</div>
	);
}
