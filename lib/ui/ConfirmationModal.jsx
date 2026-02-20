import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

const ConfirmationModal = ({
	isOpen,
	onClose,
	onConfirm,
	title = "Confirm Action",
	message = "Are you sure you want to proceed?",
	confirmText = "Confirm",
	cancelText = "Cancel",
	variant = "danger", // 'danger', 'warning', 'info'
}) => {
	if (!isOpen) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						onClick={(e) => e.stopPropagation()}
						className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-zinc-200">
							<div className="flex items-center gap-3">
								<div
									className={
										variant === "danger"
											? "p-2 rounded-full bg-red-100 text-red-600"
											: variant === "warning"
												? "p-2 rounded-full bg-yellow-100 text-yellow-600"
												: "p-2 rounded-full bg-zinc-100 text-zinc-600"
									}
								>
									<AlertTriangle className="w-5 h-5" />
								</div>
								<h3 className="text-lg text-zinc-900">{title}</h3>
							</div>
							<button
								onClick={onClose}
								className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Body */}
						<div className="p-6">
							<p className="text-zinc-700">{message}</p>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200 bg-zinc-50">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={onClose}
								className="px-4 py-2 text-sm text-zinc-700 bg-white hover:bg-zinc-100 rounded-xl font-medium transition-colors border border-zinc-300"
							>
								{cancelText}
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => {
									onConfirm();
									onClose();
								}}
								className={
									variant === "danger"
										? "px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors bg-red-600 hover:bg-red-700"
										: variant === "warning"
											? "px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors bg-yellow-600 hover:bg-yellow-700"
											: "px-4 py-2 text-sm text-white rounded-xl font-medium transition-colors bg-zinc-600 hover:bg-zinc-700"
								}
							>
								{confirmText}
							</motion.button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default ConfirmationModal;
