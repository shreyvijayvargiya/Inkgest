/**
 * ImageGalleryAssetView — renders image gallery from backend data
 * Asset type: "image_gallery". Data: { images: [{ url, caption?, alt? }], title }
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
};

export default function ImageGalleryAssetView({ doc }) {
	const raw = doc?.images ?? doc?.result?.images ?? [];
	const images = Array.isArray(raw) ? raw : [];
	const title = doc?.title || "Image Gallery";
	const [selectedIndex, setSelectedIndex] = useState(null);

	if (images.length === 0) {
		return (
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					padding: 48,
					background: T.base,
				}}
			>
				<p style={{ fontSize: 32, marginBottom: 12 }}>🖼️</p>
				<p style={{ fontSize: 16, fontWeight: 600, color: T.accent, marginBottom: 8 }}>
					No images
				</p>
				<p style={{ fontSize: 13, color: T.muted }}>
					This gallery has no images yet.
				</p>
			</div>
		);
	}

	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				background: T.base,
				padding: "24px 20px",
			}}
		>
			<div style={{ maxWidth: 1000, margin: "0 auto" }}>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
						gap: 16,
					}}
				>
					{images.map((img, i) => {
						const imgUrl = img?.url ?? img?.src ?? img;
						if (!imgUrl || typeof imgUrl !== "string") return null;
						return (
						<motion.div
							key={i}
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: i * 0.04, duration: 0.3 }}
							onClick={() => setSelectedIndex(i)}
							style={{
								cursor: "pointer",
								borderRadius: 12,
								overflow: "hidden",
								background: T.surface,
								border: `1px solid ${T.border}`,
								boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
								transition: "box-shadow 0.2s",
							}}
							whileHover={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
						>
							<div
								style={{
									aspectRatio: "4/3",
									overflow: "hidden",
									background: T.border,
								}}
							>
								<img
									src={imgUrl}
									alt={img?.alt || img?.caption || `Image ${i + 1}`}
									style={{
										width: "100%",
										height: "100%",
										objectFit: "cover",
										display: "block",
									}}
								/>
							</div>
							{(img?.caption || img?.alt) && (
								<p
									style={{
										padding: "10px 12px",
										fontSize: 12,
										color: T.muted,
										lineHeight: 1.4,
										margin: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										display: "-webkit-box",
										WebkitLineClamp: 2,
										WebkitBoxOrient: "vertical",
									}}
								>
									{img.caption || img.alt}
								</p>
							)}
						</motion.div>
					);
					})}
				</div>
			</div>

			{/* Lightbox */}
			<AnimatePresence>
				{selectedIndex !== null && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setSelectedIndex(null)}
							style={{
								position: "fixed",
								inset: 0,
								background: "rgba(0,0,0,0.85)",
								zIndex: 200,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: 24,
							}}
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							style={{
								position: "fixed",
								inset: 0,
								zIndex: 201,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								padding: 48,
								pointerEvents: "none",
							}}
						>
							<div
								style={{
									pointerEvents: "auto",
									maxWidth: "90vw",
									maxHeight: "90vh",
									borderRadius: 12,
									overflow: "hidden",
									boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
								}}
							>
								<img
									src={images[selectedIndex]?.url ?? images[selectedIndex]?.src}
									alt={images[selectedIndex]?.caption || images[selectedIndex]?.alt || ""}
									style={{
										maxWidth: "90vw",
										maxHeight: "90vh",
										objectFit: "contain",
										display: "block",
									}}
									onClick={(e) => e.stopPropagation()}
								/>
								{images[selectedIndex]?.caption && (
									<p
										style={{
											padding: "12px 16px",
											background: T.surface,
											margin: 0,
											fontSize: 14,
											color: T.accent,
										}}
									>
										{images[selectedIndex].caption}
									</p>
								)}
							</div>
							<button
								onClick={() => setSelectedIndex(null)}
								style={{
									position: "absolute",
									top: 24,
									right: 24,
									background: "rgba(255,255,255,0.2)",
									border: "none",
									borderRadius: 8,
									width: 40,
									height: 40,
									color: "white",
									fontSize: 20,
									cursor: "pointer",
									pointerEvents: "auto",
								}}
							>
								✕
							</button>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}
