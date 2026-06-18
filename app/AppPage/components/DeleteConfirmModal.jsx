import { motion, AnimatePresence } from "framer-motion";

export default function DeleteConfirmModal({
	open,
	onClose,
	onConfirm,
	title = "Delete this draft?",
	message = "This action can't be undone. The draft will be permanently deleted from your account.",
	confirmLabel = "Delete draft",
}) {
	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.div
						key="delete-modal-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 z-[200] bg-black/35 backdrop-blur-[3px]"
					/>
					<div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
						<motion.div
							key="delete-modal-panel"
							initial={{ opacity: 0, scale: 0.92 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.92 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							className="w-full max-w-[360px] rounded-xl border border-[#E2E2E2] bg-white p-7 shadow-2xl pointer-events-auto"
						>
							<p className="text-lg font-bold mb-2 text-[#111111]">{title}</p>
							<p className="text-sm mb-5 text-[#888888] leading-relaxed">
								{message}
							</p>
							<div className="flex gap-2 justify-end">
								<motion.button
									type="button"
									whileTap={{ scale: 0.97 }}
									onClick={onClose}
									className="px-4 py-2 rounded-xl text-sm font-semibold text-[#888888] border border-[#E2E2E2] bg-[#F2F2F2] hover:bg-[#F0ECE5] cursor-pointer"
								>
									Cancel
								</motion.button>
								<motion.button
									type="button"
									whileTap={{ scale: 0.97 }}
									onClick={onConfirm}
									className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 cursor-pointer border-none"
								>
									{confirmLabel}
								</motion.button>
							</div>
						</motion.div>
					</div>
				</>
			)}
		</AnimatePresence>
	);
}
