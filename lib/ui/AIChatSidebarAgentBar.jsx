/**
 * AIChatSidebarAgentBar — Ask vs Agent mode selector (next to model picker).
 * Decoupled from main sidebar; only handles mode UI + labels.
 */

import { motion, AnimatePresence } from "framer-motion";

export const CHAT_MODE_ASK = "ask";
export const CHAT_MODE_AGENT = "agent";

export const CHAT_MODE_OPTIONS = [
	{
		id: CHAT_MODE_ASK,
		label: "Ask",
		sub: "Chat & edit help",
		dot: "#7A7570",
	},
	{
		id: CHAT_MODE_AGENT,
		label: "Agent",
		sub: "Search drafts · create with approval",
		dot: "#C17B2F",
	},
];

const IcChevron = ({ open }) => (
	<motion.span
		animate={{ rotate: open ? 180 : 0 }}
		transition={{ duration: 0.18 }}
		style={{ display: "flex" }}
	>
		<svg
			width={11}
			height={11}
			viewBox="0 0 24 24"
			fill="none"
			stroke="#7A7570"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	</motion.span>
);

export function AIChatSidebarAgentBar({
	mode,
	onModeChange,
	modeOpen,
	onModeOpenChange,
	disabled = false,
}) {
	const current =
		CHAT_MODE_OPTIONS.find((o) => o.id === mode) || CHAT_MODE_OPTIONS[0];

	return (
		<div style={{ position: "relative" }}>
			<motion.button
				type="button"
				onClick={() => !disabled && onModeOpenChange((v) => !v)}
				whileHover={disabled ? {} : { background: "#F0ECE5" }}
				whileTap={disabled ? {} : { scale: 0.95 }}
				title="Chat mode"
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					background: modeOpen ? "#F0ECE5" : "#F7F5F0",
					border: "1px solid #E8E4DC",
					borderRadius: 7,
					padding: "4px 8px",
					fontSize: 11,
					fontWeight: 600,
					color: "#5A5550",
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? 0.55 : 1,
					transition: "all 0.14s",
				}}
			>
				<span
					style={{
						width: 6,
						height: 6,
						borderRadius: "50%",
						background: current.dot,
						flexShrink: 0,
					}}
				/>
				{current.label}
				<IcChevron open={modeOpen} />
			</motion.button>

			<AnimatePresence>
				{modeOpen && !disabled && (
					<motion.div
						initial={{ opacity: 0, y: 6, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.95 }}
						transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
						style={{
							position: "absolute",
							bottom: "calc(100% + 6px)",
							right: 0,
							background: "#FFFFFF",
							border: "1px solid #E8E4DC",
							borderRadius: 12,
							boxShadow:
								"0 8px 28px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
							overflow: "hidden",
							minWidth: 200,
							zIndex: 22,
						}}
					>
						{CHAT_MODE_OPTIONS.map((o, i) => (
							<motion.button
								key={o.id}
								type="button"
								onClick={() => {
									onModeChange(o.id);
									onModeOpenChange(false);
								}}
								whileHover={{ background: "#F7F5F0" }}
								style={{
									width: "100%",
									display: "flex",
									alignItems: "center",
									gap: 10,
									background: mode === o.id ? "#F7F5F0" : "#FFFFFF",
									border: "none",
									borderBottom:
										i < CHAT_MODE_OPTIONS.length - 1
											? "1px solid #F0ECE5"
											: "none",
									padding: "10px 13px",
									cursor: "pointer",
									textAlign: "left",
									transition: "background 0.12s",
								}}
							>
								<span
									style={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										background: o.dot,
										flexShrink: 0,
									}}
								/>
								<div style={{ flex: 1 }}>
									<p
										style={{
											fontSize: 12,
											fontWeight: 700,
											color: "#1A1A1A",
											margin: 0,
											lineHeight: 1.2,
										}}
									>
										{o.label}
									</p>
									<p
										style={{
											fontSize: 10.5,
											color: "#A8A29C",
											margin: 0,
										}}
									>
										{o.sub}
									</p>
								</div>
								{mode === o.id && (
									<svg
										width={12}
										height={12}
										viewBox="0 0 24 24"
										fill="none"
										stroke="#C17B2F"
										strokeWidth={2.5}
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M20 6 9 17l-5-5" />
									</svg>
								)}
							</motion.button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
