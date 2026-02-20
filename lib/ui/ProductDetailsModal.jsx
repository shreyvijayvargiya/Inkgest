import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Image as ImageIcon } from "lucide-react";

const ProductDetailsModal = ({ isOpen, onClose, product }) => {
	if (!product) return null;

	const formatDate = (date) => {
		if (!date) return "";
		const d = new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatPrice = (product) => {
		if (!product.prices || product.prices.length === 0) return "$0";
		const price = product.prices[0];
		// Handle both Polar format (price_amount in cents) and direct amount
		const amount = price.price_amount
			? price.price_amount / 100
			: price.amount || price.price || 0;
		const currency =
			price.price_currency?.toUpperCase() ||
			price.currency?.toUpperCase() ||
			"USD";
		const interval = price.recurring_interval || price.interval || "one_time";

		const intervalLabel =
			{
				one_time: "",
				month: "/month",
				year: "/year",
			}[interval] || "";

		return (
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currency.toLowerCase(),
			}).format(amount) + intervalLabel
		);
	};

	const getBillingInterval = (product) => {
		if (!product.prices || product.prices.length === 0) return "";
		const interval =
			product.prices[0].recurring_interval ||
			product.prices[0].interval ||
			"one_time";
		const labels = {
			one_time: "One-time",
			month: "Monthly",
			year: "Yearly",
		};
		return labels[interval] || interval;
	};

	const getPriceType = (product) => {
		if (!product.prices || product.prices.length === 0) return "";
		const priceType = product.prices[0].amount_type || "fixed";
		return priceType === "fixed" ? "Fixed Price" : "Pay What You Want";
	};

	// Get banner images - support multiple formats
	const getBannerImages = (product) => {
		// Support multiple formats: bannerImages array, bannerImageUrl, banner_url, image_url
		if (product.bannerImages && Array.isArray(product.bannerImages)) {
			return product.bannerImages
				.map((img) => {
					// Handle both object format and URL string format
					if (typeof img === "string") {
						return img;
					}
					return img.previewUrl || img.base64 || img.url || null;
				})
				.filter(Boolean);
		}

		// Legacy single image support
		const singleImage =
			product.bannerImageUrl || product.banner_url || product.image_url;
		return singleImage ? [singleImage] : [];
	};

	const bannerImages = getBannerImages(product);

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
						className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
					>
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-zinc-200">
							<h3 className="text-xl font-bold text-zinc-900">
								Product Details
							</h3>
							<button
								onClick={onClose}
								className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors rounded-xl hover:bg-zinc-100"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						{/* Body */}
						<div className="flex-1 overflow-y-auto p-6">
							<div className="space-y-6">
								{/* Product Name */}
								<div>
									<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
										Product Name
									</label>
									<p className="text-lg font-semibold text-zinc-900">
										{product.name || "Unnamed Product"}
									</p>
								</div>

								{/* Product ID */}
								<div>
									<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
										Product ID
									</label>
									<p className="text-sm font-mono text-zinc-700 bg-zinc-50 px-3 py-2 rounded-xl">
										{product.id || ""}
									</p>
								</div>

								{/* Description */}
								<div>
									<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
										Description
									</label>
									<p className="text-sm text-zinc-700 whitespace-pre-wrap">
										{product.description || "No description provided"}
									</p>
								</div>

								{/* Banner Images */}
								{bannerImages.length > 0 && (
									<div>
										<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
											Banner Images {bannerImages.length > 1 && `(${bannerImages.length})`}
										</label>
										<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
											{bannerImages.map((imgUrl, index) => (
												<div
													key={index}
													className="relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 aspect-video"
												>
													<img
														src={imgUrl}
														alt={`Banner ${index + 1}`}
														className="w-full h-full object-cover"
														onError={(e) => {
															e.target.style.display = "none";
															const parent = e.target.parentElement;
															if (parent) {
																const placeholder = parent.querySelector(".error-placeholder");
																if (placeholder) {
																	placeholder.style.display = "flex";
																}
															}
														}}
													/>
													{/* Fallback icon - hidden by default */}
													<div className="absolute inset-0 hidden items-center justify-center bg-zinc-100 error-placeholder">
														<ImageIcon className="w-6 h-6 text-zinc-400" />
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Price Information */}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
											Price Type
										</label>
										<p className="text-sm font-medium text-zinc-900">
											{getPriceType(product)}
										</p>
									</div>
									<div>
										<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
											Price
										</label>
										<p className="text-sm font-medium text-zinc-900">
											{formatPrice(product)}
										</p>
									</div>
									<div>
										<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
											Billing Interval
										</label>
										<p className="text-sm font-medium text-zinc-900">
											{getBillingInterval(product)}
										</p>
									</div>
									{product.prices && product.prices[0] && (
										<div>
											<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
												Currency
											</label>
											<p className="text-sm font-medium text-zinc-900">
												{(
													product.prices[0].price_currency ||
													product.prices[0].currency ||
													"USD"
												).toUpperCase()}
											</p>
										</div>
									)}
								</div>

								{/* Checkout Link */}
								<div>
									<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
										Checkout Link
									</label>
									{product.checkoutLink ? (
										<a
											href={product.checkoutLink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
										>
											<span>{product.checkoutLink}</span>
											<ExternalLink className="w-4 h-4 flex-shrink-0" />
										</a>
									) : (
										<p className="text-sm text-zinc-400">
											No checkout link available
										</p>
									)}
								</div>

								{/* Created Date */}
								<div>
									<label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
										Created At
									</label>
									<p className="text-sm text-zinc-700">
										{formatDate(
											product.createdAt?.toDate
												? product.createdAt.toDate()
												: product.createdAt
										)}
									</p>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200">
							<button
								onClick={onClose}
								className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								Close
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default ProductDetailsModal;
