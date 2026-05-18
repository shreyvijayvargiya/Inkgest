/**
 * AIChatSidebarAgentBar — Ask vs Agent mode selector (next to model picker).
 * Decoupled from main sidebar; only handles mode UI + labels.
 */

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";

export const CHAT_MODE_ASK = "ask";
export const CHAT_MODE_AGENT = "agent";

export const CHAT_MODE_OPTIONS = [
	{
		id: CHAT_MODE_ASK,
		label: "Ask",
		sub: "Chat help",
		dot: "#7A7570",
	},
	{
		id: CHAT_MODE_AGENT,
		label: "Agent",
		sub: "AI can edit the content",
		dot: "#C17B2F",
	},
];


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
				className="flex items-center gap-2 p-1 rounded bg-zinc-50 text-xs font-medium"
			>
				<span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
				{current.label}
				<ChevronDownIcon className="w-3 h-3 text-zinc-500" />
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
							left: 0,
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
									className="text-xs font-medium"
									>
										{o.label}
									</p>
									<p
									className="text-xs text-zinc-500"
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
