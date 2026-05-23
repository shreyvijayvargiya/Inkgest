import { motion } from "framer-motion";
import { THEMES } from "../../../lib/blogExportThemes";
import { T, parseCSSProp } from "../draftPageLib";

const STRIP_TILE_WIDTH = 76;

/**
 * @param {"sidebar" | "strip"} layout — vertical list (desktop) or horizontal scroll (mobile)
 */
export default function PreviewExportThemeList({
	layout = "sidebar",
	previewTheme,
	setPreviewTheme,
	isPublic,
	getPublicUrl,
	toSlug,
	slugInput,
	draft,
	copiedPubThemeRow,
	setCopiedPubThemeRow,
}) {
	const isStrip = layout === "strip";
	const themeEntries = Object.entries(THEMES);

	return (
		<div
			style={
				isStrip
					? {
							flexShrink: 0,
							borderTop: `1px solid ${T.border}`,
							background: T.base,
							paddingTop: 8,
							paddingBottom:
								"calc(10px + env(safe-area-inset-bottom, 0px))",
						}
					: {
							width: 210,
							borderRight: `1px solid ${T.border}`,
							overflowY: "auto",
							flexShrink: 0,
							background: T.base,
							padding: "12px 10px",
							display: "flex",
							flexDirection: "column",
							gap: 3,
						}
			}
		>
			{isStrip ? (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 8,
						paddingLeft: 12,
						paddingRight: 12,
						marginBottom: 6,
						flexShrink: 0,
					}}
				>
					<p
						style={{
							fontSize: 10,
							fontWeight: 700,
							color: T.muted,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							margin: 0,
						}}
					>
						Themes
					</p>
					<span
						style={{
							fontSize: 10,
							color: T.muted,
							whiteSpace: "nowrap",
						}}
					>
						{themeEntries.findIndex(([k]) => k === previewTheme) + 1}/
						{themeEntries.length}
					</span>
				</div>
			) : (
				<p
					style={{
						fontSize: 10,
						fontWeight: 700,
						color: T.muted,
						textTransform: "uppercase",
						letterSpacing: "0.08em",
						marginBottom: 8,
						paddingLeft: 4,
					}}
				>
					Themes
				</p>
			)}

			<div
				className={isStrip ? "hidescrollbar" : undefined}
				style={
					isStrip
						? {
								display: "flex",
								flexDirection: "row",
								flexWrap: "nowrap",
								alignItems: "stretch",
								gap: 8,
								overflowX: "auto",
								overflowY: "hidden",
								paddingLeft: 12,
								paddingRight:
									"calc(12px + env(safe-area-inset-right, 0px) + 48px)",
								paddingBottom: 4,
								WebkitOverflowScrolling: "touch",
								scrollSnapType: "x proximity",
								scrollbarWidth: "thin",
							}
						: {
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
								gap: 3,
							}
				}
			>
				{themeEntries.map(([key, theme]) => {
					const isActive = previewTheme === key;
					const hColor = parseCSSProp(theme.h1, "color") || theme.text;

					return (
						<motion.div
							key={key}
							role="button"
							tabIndex={0}
							whileTap={{ scale: 0.97 }}
							onClick={() => setPreviewTheme(key)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setPreviewTheme(key);
								}
							}}
							style={{
								background: isActive ? T.surface : "rgba(255,255,255,0.6)",
								border: `2px solid ${isActive ? T.accent : "transparent"}`,
								borderRadius: isStrip ? 12 : 10,
								padding: isStrip ? "8px 6px 10px" : "10px 8px 10px 12px",
								cursor: "pointer",
								display: "flex",
								alignItems: isStrip ? "center" : "center",
								flexDirection: isStrip ? "column" : "row",
								gap: isStrip ? 6 : 10,
								textAlign: isStrip ? "center" : "left",
								boxShadow: isActive
									? "0 2px 8px rgba(0,0,0,0.08)"
									: "none",
								outline: "none",
								flexShrink: 0,
								width: isStrip ? STRIP_TILE_WIDTH : undefined,
								minWidth: isStrip ? STRIP_TILE_WIDTH : undefined,
								scrollSnapAlign: isStrip ? "start" : undefined,
							}}
						>
							<div
								style={{
									width: isStrip ? 32 : 28,
									height: isStrip ? 32 : 28,
									borderRadius: 8,
									background: theme.bg,
									border: "1px solid rgba(0,0,0,0.1)",
									flexShrink: 0,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									overflow: "hidden",
								}}
							>
								<div
									style={{
										width: 10,
										height: 10,
										borderRadius: "50%",
										background: hColor,
									}}
								/>
							</div>

							<p
								style={{
									fontSize: isStrip ? 10 : 12,
									fontWeight: isActive ? 700 : 500,
									color: isActive ? T.accent : "#555",
									lineHeight: 1.2,
									margin: 0,
									width: "100%",
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{theme.name}
							</p>

							{!isStrip ? (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 6,
										flexShrink: 0,
										marginLeft: "auto",
									}}
								>
									{isPublic ? (
										<button
											type="button"
											title="Copy public URL with this theme"
											onClick={(e) => {
												e.stopPropagation();
												navigator.clipboard
													.writeText(
														getPublicUrl(
															draft?.slug ||
																toSlug(slugInput) ||
																undefined,
															key,
														),
													)
													.catch(() => {});
												setCopiedPubThemeRow(key);
												setTimeout(
													() => setCopiedPubThemeRow(null),
													1600,
												);
											}}
											style={{
												width: 28,
												height: 28,
												borderRadius: 7,
												border: `1px solid ${T.border}`,
												background:
													copiedPubThemeRow === key
														? "#EFF6EE"
														: T.surface,
												cursor: "pointer",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												padding: 0,
												flexShrink: 0,
											}}
										>
											{copiedPubThemeRow === key ? (
												<svg
													width={12}
													height={12}
													viewBox="0 0 24 24"
													fill="none"
													stroke="#3D7A35"
													strokeWidth={2.5}
													strokeLinecap="round"
												>
													<polyline points="20 6 9 17 4 12" />
												</svg>
											) : (
												<svg
													width={12}
													height={12}
													viewBox="0 0 24 24"
													fill="none"
													stroke={T.muted}
													strokeWidth={2}
													strokeLinecap="round"
												>
													<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
													<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
												</svg>
											)}
										</button>
									) : null}
									{isActive && (
										<div
											style={{
												width: 6,
												height: 6,
												borderRadius: "50%",
												background: T.warm,
												flexShrink: 0,
											}}
										/>
									)}
								</div>
							) : null}
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}
