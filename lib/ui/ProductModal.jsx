import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
	X,
	Save,
	Trash2,
	Upload,
	Loader2,
	ChevronDown,
	Info,
} from "lucide-react";
import { createProduct, updateProduct } from "../api/products";
import AnimatedDropdown from "./AnimatedDropdown";
import { toast } from "react-toastify";

const ProductModal = ({
	isOpen,
	onClose,
	productToEdit = null,
	queryClient,
}) => {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [bannerImages, setBannerImages] = useState([]); // Array of {base64: string, fileName: string, previewUrl: string}
	const [uploadingImages, setUploadingImages] = useState(false); // Track upload progress
	const [uploadingIndex, setUploadingIndex] = useState(null); // Track which image is uploading
	const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
	const fileInputRef = useRef(null);
	const [priceType, setPriceType] = useState("fixed"); // "fixed" or "custom" (pay what you want)
	const [priceAmount, setPriceAmount] = useState("");
	const [minAmount, setMinAmount] = useState("");
	const [maxAmount, setMaxAmount] = useState("");
	const [currency, setCurrency] = useState("usd");
	const [billingInterval, setBillingInterval] = useState("one_time");
	const [isSaving, setIsSaving] = useState(false);

	// Load product data when editing
	useEffect(() => {
		if (productToEdit) {
			setName(productToEdit.name || "");
			setDescription(productToEdit.description || "");

			// Handle banner images - support both new format (objects) and legacy format (URLs)
			if (
				productToEdit.bannerImages &&
				Array.isArray(productToEdit.bannerImages)
			) {
				// Check if it's new format (objects with base64) or legacy format (URLs)
				if (
					productToEdit.bannerImages.length > 0 &&
					typeof productToEdit.bannerImages[0] === "object" &&
					productToEdit.bannerImages[0].base64
				) {
					setBannerImages(productToEdit.bannerImages);
				} else {
					// Legacy format: convert URLs to objects with preview URLs
					setBannerImages(
						productToEdit.bannerImages.map((url) => ({
							base64: null, // Will need to be re-uploaded if editing
							fileName: `image-${Date.now()}.png`,
							previewUrl: url,
						}))
					);
				}
			} else if (productToEdit.bannerImageUrl) {
				setBannerImages([
					{
						base64: null,
						fileName: `image-${Date.now()}.png`,
						previewUrl: productToEdit.bannerImageUrl,
					},
				]);
			} else if (productToEdit.banner_url) {
				setBannerImages([
					{
						base64: null,
						fileName: `image-${Date.now()}.png`,
						previewUrl: productToEdit.banner_url,
					},
				]);
			} else if (productToEdit.image_url) {
				setBannerImages([
					{
						base64: null,
						fileName: `image-${Date.now()}.png`,
						previewUrl: productToEdit.image_url,
					},
				]);
			} else {
				setBannerImages([]);
			}

			// Extract price from product prices array
			if (productToEdit.prices && productToEdit.prices.length > 0) {
				const firstPrice = productToEdit.prices[0];
				const amountType = firstPrice.amount_type || "fixed";
				setPriceType(amountType);

				if (amountType === "fixed") {
					// Handle both Polar format (price_amount in cents) and direct amount
					const amount = firstPrice.price_amount
						? (firstPrice.price_amount / 100).toString()
						: (firstPrice.amount || firstPrice.price || "").toString();
					setPriceAmount(amount);
				} else {
					setPriceAmount("");
					setMinAmount(
						firstPrice.min_amount
							? (firstPrice.min_amount / 100).toString()
							: ""
					);
					setMaxAmount(
						firstPrice.max_amount
							? (firstPrice.max_amount / 100).toString()
							: ""
					);
				}
				setCurrency(firstPrice.price_currency || firstPrice.currency || "usd");
				setBillingInterval(
					firstPrice.recurring_interval || firstPrice.interval || "one_time"
				);
			} else {
				setPriceType("fixed");
				setPriceAmount("");
				setMinAmount("");
				setMaxAmount("");
				setCurrency("usd");
				setBillingInterval("one_time");
			}
		} else {
			// Reset form for new product
			setName("");
			setDescription("");
			setBannerImages([]);
			setPriceType("fixed");
			setPriceAmount("");
			setMinAmount("");
			setMaxAmount("");
			setCurrency("usd");
			setBillingInterval("one_time");
		}
	}, [productToEdit]);

	// Reset form when modal closes
	useEffect(() => {
		if (!isOpen) {
			setName("");
			setDescription("");
			setBannerImages([]);
			setUploadingImages(false);
			setUploadingIndex(null);
			setIsImageDropdownOpen(false);
			setPriceType("fixed");
			setPriceAmount("");
			setMinAmount("");
			setMaxAmount("");
			setCurrency("usd");
			setBillingInterval("one_time");
		}
	}, [isOpen]);

	// Convert file to base64
	const fileToBase64 = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	};

	// Handle file upload - convert to base64 instead of uploading to Firebase
	const handleFileUpload = async (files) => {
		if (!files || files.length === 0) return;

		setUploadingImages(true);
		const newImages = [];

		try {
			for (let i = 0; i < files.length; i++) {
				const file = files[i];

				// Validate file type
				if (!file.type.startsWith("image/")) {
					toast.error(`${file.name} is not an image file`);
					continue;
				}

				// Validate file size (max 10MB for Polar)
				if (file.size > 10 * 1024 * 1024) {
					toast.error(`${file.name} is too large. Maximum size is 10MB`);
					continue;
				}

				setUploadingIndex(i);

				// Convert file to base64
				const base64String = await fileToBase64(file);

				// Create preview URL for display
				const previewUrl = base64String;

				newImages.push({
					base64: base64String,
					fileName: file.name,
					previewUrl: previewUrl,
				});
			}

			// Add all converted images to banner images
			if (newImages.length > 0) {
				setBannerImages([...bannerImages, ...newImages]);
				toast.success(`Successfully added ${newImages.length} image(s)`);
			}
		} catch (error) {
			console.error("Error processing images:", error);
			toast.error("Failed to process images. Please try again.");
		} finally {
			setUploadingImages(false);
			setUploadingIndex(null);
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	// Handle file input change
	const handleFileInputChange = (e) => {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			handleFileUpload(files);
		}
	};

	// Handle image selection from dropdown
	const handleImageSelect = (value) => {
		if (value === "upload") {
			fileInputRef.current?.click();
		}
	};

	// Handle save
	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Please enter a product name");
			return;
		}

		if (priceType === "fixed") {
			if (!priceAmount || parseFloat(priceAmount) <= 0) {
				toast.error("Please enter a valid price");
				return;
			}
		} else {
			// For custom/pay-what-you-want, min_amount is recommended
			if (minAmount && parseFloat(minAmount) < 0) {
				toast.error("Minimum amount cannot be negative");
				return;
			}
			if (
				maxAmount &&
				minAmount &&
				parseFloat(maxAmount) < parseFloat(minAmount)
			) {
				toast.error("Maximum amount must be greater than minimum amount");
				return;
			}
		}

		setIsSaving(true);
		try {
			// Build price object based on price type
			let priceObj = {
				amount_type: priceType,
				price_currency: currency.toLowerCase(),
			};

			// Only include recurring_interval for new products (Polar doesn't allow changing it on update)
			if (!productToEdit) {
				priceObj.recurring_interval = billingInterval;
			} else {
				// For updates, we don't send recurring_interval as Polar doesn't allow changing it
				// The existing recurring_interval will remain unchanged
			}

			if (priceType === "fixed") {
				// Convert price to cents (Polar uses cents)
				const priceAmountCents = Math.round(parseFloat(priceAmount) * 100);
				priceObj.price_amount = priceAmountCents;
			} else {
				// For custom/pay-what-you-want
				if (minAmount) {
					priceObj.min_amount = Math.round(parseFloat(minAmount) * 100);
				}
				if (maxAmount) {
					priceObj.max_amount = Math.round(parseFloat(maxAmount) * 100);
				}
			}

			// Prepare banner images - only send images that have base64 data
			// Filter out legacy URLs that don't have base64 (they need to be re-uploaded)
			const validBannerImages = bannerImages
				.filter((img) => {
					if (typeof img === "string") {
						// Legacy format: skip URLs that aren't base64
						return img.startsWith("data:");
					}
					return img.base64; // New format: must have base64
				})
				.map((img) => {
					if (typeof img === "string") {
						// Legacy format: convert to new format
						return {
							base64: img,
							fileName: `image-${Date.now()}.png`,
						};
					}
					// New format: return base64 and fileName
					return {
						base64: img.base64,
						fileName: img.fileName || `image-${Date.now()}.png`,
					};
				});

			const productData = {
				name: name.trim(),
				description: description.trim() || undefined,
				bannerImages: validBannerImages,
				prices: [priceObj],
			};

			if (productToEdit) {
				await updateProduct(productToEdit.id, productData);
				toast.success("Product updated successfully");
			} else {
				await createProduct(productData);
				toast.success("Product created successfully");
			}

			// Invalidate products query to refresh the list
			if (queryClient) {
				queryClient.invalidateQueries({ queryKey: ["products"] });
			}

			onClose();
		} catch (error) {
			console.error("Error saving product:", error);
			toast.error(error.message || "Failed to save product. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const billingIntervalOptions = [
		{ value: "one_time", label: "One-time" },
		{ value: "month", label: "Monthly" },
		{ value: "year", label: "Yearly" },
	];

	const currencyOptions = [
		{ value: "usd", label: "USD ($)" },
		{ value: "eur", label: "EUR (€)" },
		{ value: "gbp", label: "GBP (£)" },
	];

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
						<div className="flex items-center justify-between p-3 border-b border-zinc-200">
							<h3 className="text-lg text-zinc-900">
								{productToEdit ? "Edit Product" : "Create New Product"}
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
							<div className="space-y-4">
								{/* Product Name */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Product Name *
									</label>
									<input
										type="text"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Enter product name"
										className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
										required
									/>
								</div>

								{/* Description */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Description
									</label>
									<textarea
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Enter product description"
										rows={4}
										className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900 resize-none"
									/>
								</div>

								{/* Banner Images */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Banner Images
									</label>

									{/* File Upload with AnimatedDropdown */}
									<div className="mb-3">
										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											multiple
											onChange={handleFileInputChange}
											className="hidden"
											disabled={uploadingImages}
										/>
										<AnimatedDropdown
											isOpen={isImageDropdownOpen}
											onToggle={() =>
												setIsImageDropdownOpen(!isImageDropdownOpen)
											}
											onSelect={handleImageSelect}
											options={[{ value: "upload", label: "Upload Images" }]}
											value={null}
											placeholder={
												uploadingImages
													? "Uploading..."
													: "Select to upload images"
											}
											buttonClassName="w-full px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl transition-colors border-2 border-dashed border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
											renderButton={(selectedOption, isOpen) => (
												<motion.button
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
													type="button"
													onClick={() =>
														setIsImageDropdownOpen(!isImageDropdownOpen)
													}
													disabled={uploadingImages}
													className="w-full px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{uploadingImages ? (
														<>
															<Loader2 className="w-4 h-4 animate-spin" />
															<span>Uploading...</span>
														</>
													) : (
														<>
															<Upload className="w-4 h-4" />
															<span>Upload Images (Multiple)</span>
															<ChevronDown
																className={`w-4 h-4 text-zinc-400 transition-transform ml-auto ${
																	isOpen ? "rotate-180" : ""
																}`}
															/>
														</>
													)}
												</motion.button>
											)}
											renderOption={(option) => (
												<motion.button
													key={option.value}
													whileHover={{ backgroundColor: "#f4f4f5" }}
													onClick={() => {
														handleImageSelect(option.value);
														setIsImageDropdownOpen(false);
													}}
													className="w-full px-4 py-3 text-left flex items-center gap-2 transition-colors text-zinc-700 hover:bg-zinc-50"
												>
													<Upload className="w-4 h-4" />
													<span>{option.label}</span>
												</motion.button>
											)}
										/>
										<p className="text-xs text-zinc-500 mt-1 text-center">
											Select multiple images (Max 10MB per image)
										</p>
									</div>

									{/* Images Grid */}
									{bannerImages.length > 0 && (
										<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
											{bannerImages.map((imageData, index) => {
												// Support both new format (object) and legacy format (string)
												const previewUrl =
													typeof imageData === "string"
														? imageData
														: imageData.previewUrl || imageData.base64;
												const hasBase64 =
													typeof imageData === "string"
														? imageData.startsWith("data:")
														: !!imageData.base64;

												return (
													<div
														key={index}
														className="relative group rounded-xl overflow-hidden border border-zinc-200"
													>
														{uploadingIndex === index && (
															<div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center z-10">
																<Loader2 className="w-6 h-6 animate-spin text-white" />
															</div>
														)}
														{!hasBase64 && (
															<div className="absolute inset-0 bg-yellow-50 border-2 border-yellow-300 flex items-center justify-center z-10">
																<span className="text-xs text-yellow-700 text-center px-2">
																	Will be re-uploaded
																</span>
															</div>
														)}
														<img
															src={previewUrl}
															alt={`Banner ${index + 1}`}
															className="w-full h-32 object-cover"
															onError={(e) => {
																e.target.src =
																	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='12'%3EInvalid Image%3C/text%3E%3C/svg%3E";
															}}
														/>
														<motion.button
															whileHover={{ scale: 1.1 }}
															whileTap={{ scale: 0.9 }}
															type="button"
															onClick={() => {
																setBannerImages(
																	bannerImages.filter((_, i) => i !== index)
																);
															}}
															disabled={uploadingImages}
															className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg disabled:opacity-0"
															title="Delete image"
														>
															<Trash2 className="w-3.5 h-3.5" />
														</motion.button>
													</div>
												);
											})}
										</div>
									)}
								</div>

								{/* Info message for editing restrictions */}
								{productToEdit && (
									<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
										<Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
										<div className="text-sm text-yellow-800">
											<p className="font-medium mb-1">Editing Restrictions</p>
											<p className="text-xs">
												Billing interval and currency cannot be changed after
												product creation. To change these, you'll need to create
												a new product.
											</p>
										</div>
									</div>
								)}

								{/* Price Type */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Price Type *
									</label>
									<select
										value={priceType}
										onChange={(e) => setPriceType(e.target.value)}
										className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
									>
										<option value="fixed">Fixed Price</option>
										<option value="custom">Pay What You Want</option>
									</select>
								</div>

								{/* Price Fields */}
								{priceType === "fixed" ? (
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-zinc-700 mb-2">
												Price *
											</label>
											<input
												type="number"
												value={priceAmount}
												onChange={(e) => setPriceAmount(e.target.value)}
												placeholder="0.00"
												min="0"
												step="0.01"
												className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
												required
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-zinc-700 mb-2">
												Currency *
											</label>
											<select
												value={currency}
												onChange={(e) => setCurrency(e.target.value)}
												disabled={!!productToEdit}
												className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900 disabled:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-500"
											>
												{currencyOptions.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
											{productToEdit && (
												<p className="text-xs text-zinc-500 mt-1">
													Currency cannot be changed after creation
												</p>
											)}
										</div>
									</div>
								) : (
									<div className="space-y-4">
										<div className="grid grid-cols-3 gap-4">
											<div>
												<label className="block text-sm font-medium text-zinc-700 mb-2">
													Min Amount
												</label>
												<input
													type="number"
													value={minAmount}
													onChange={(e) => setMinAmount(e.target.value)}
													placeholder="0.00"
													min="0"
													step="0.01"
													className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-zinc-700 mb-2">
													Max Amount
												</label>
												<input
													type="number"
													value={maxAmount}
													onChange={(e) => setMaxAmount(e.target.value)}
													placeholder="0.00"
													min="0"
													step="0.01"
													className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
												/>
											</div>
											<div>
												<label className="block text-sm font-medium text-zinc-700 mb-2">
													Currency *
												</label>
												<select
													value={currency}
													onChange={(e) => setCurrency(e.target.value)}
													disabled={!!productToEdit}
													className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900 disabled:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-500"
												>
													{currencyOptions.map((option) => (
														<option key={option.value} value={option.value}>
															{option.label}
														</option>
													))}
												</select>
												{productToEdit && (
													<p className="text-xs text-zinc-500 mt-1">
														Currency cannot be changed after creation
													</p>
												)}
											</div>
										</div>
									</div>
								)}

								{/* Billing Interval */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-2">
										Billing Interval *
									</label>
									<select
										value={billingInterval}
										onChange={(e) => setBillingInterval(e.target.value)}
										disabled={!!productToEdit}
										className="w-full px-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900 disabled:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-500"
									>
										{billingIntervalOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
									{productToEdit && (
										<p className="text-xs text-zinc-500 mt-1">
											Billing interval cannot be changed after creation. Create
											a new product to use a different billing cycle.
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleSave}
								disabled={isSaving}
								className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<Save className="w-4 h-4" />
								{isSaving
									? productToEdit
										? "Updating..."
										: "Creating..."
									: productToEdit
										? "Update Product"
										: "Create Product"}
							</motion.button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default ProductModal;
