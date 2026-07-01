import { motion, AnimatePresence } from "framer-motion";
import { T } from "../draftPageLib";

export default function DeleteConfirmModal({ open, onClose, onConfirm }) {
	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						style={{
							position: "fixed",
							inset: 0,
							background: "rgba(0,0,0,0.35)",
							zIndex: 200,
							backdropFilter: "blur(3px)",
						}}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.92, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.92, y: 12 }}
						transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
						style={{
							position: "fixed",
							top: "50%",
							left: "50%",
							transform: "translate(-40%,-40%)",
							background: T.surface,
							border: `1px solid ${T.border}`,
							borderRadius: 16,
							padding: "28px 28px",
							width: 360,
							zIndex: 201,
							boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
						}}
					>
						<p
							style={{
								fontSize: 18,
								fontWeight: 700,
								color: T.accent,
								marginBottom: 8,
							}}
						>
							Delete this draft?
						</p>
						<p
							style={{
								fontSize: 14,
								color: T.muted,
								lineHeight: 1.6,
								marginBottom: 22,
							}}
						>
							This action can&apos;t be undone. The draft will be permanently
							deleted from your account.
						</p>
						<div style={{ display: "flex", gap: 10 }}>
							<motion.button
								whileHover={{ background: "#F0ECE5" }}
								whileTap={{ scale: 0.97 }}
								onClick={onClose}
								style={{
									flex: 1,
									background: T.base,
									border: `1.5px solid ${T.border}`,
									borderRadius: 9,
									padding: "10px",
									fontSize: 14,
									fontWeight: 600,
									color: T.accent,
									cursor: "pointer",
								}}
							>
								Cancel
							</motion.button>
							<motion.button
								whileHover={{ background: "#DC2626" }}
								whileTap={{ scale: 0.97 }}
								onClick={onConfirm}
								style={{
									flex: 1,
									background: "#EF4444",
									border: "none",
									borderRadius: 9,
									padding: "10px",
									fontSize: 14,
									fontWeight: 700,
									color: "white",
									cursor: "pointer",
								}}
							>
								Delete draft
							</motion.button>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
