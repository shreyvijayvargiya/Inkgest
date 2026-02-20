import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { getFormById, submitForm } from "../../lib/api/forms";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Star, X, Upload, Trash2 } from "lucide-react";
import DatePicker from "../../lib/ui/DatePicker";

const FormPage = () => {
	const router = useRouter();
	const { slug } = router.query;
	const [form, setForm] = useState(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [formData, setFormData] = useState({});
	const [errors, setErrors] = useState({});
	const signatureCanvasRefs = useRef({});
	const imagePreviews = useRef({});

	useEffect(() => {
		if (slug) {
			fetchForm();
		}
	}, [slug]);

	const fetchForm = async () => {
		try {
			setLoading(true);
			// Try to get form by slug first, then by ID
			const formData = await getFormById(slug);
			if (formData && formData.isPublished) {
				setForm(formData);
				// Initialize form data (only for fields with valid labels)
				const initialData = {};
				if (formData.fields) {
					formData.fields.forEach((field) => {
						if (field.label && field.label.trim() !== "") {
							if (field.type === "checkbox") {
								initialData[field.label] = false;
							} else if (field.type === "image") {
								initialData[field.label] = [];
							} else if (field.type === "signature") {
								initialData[field.label] = "";
							} else {
								initialData[field.label] = "";
							}
						}
					});
				}
				setFormData(initialData);
			} else {
				// Form not found or not published
				setForm(null);
			}
		} catch (error) {
			console.error("Error fetching form:", error);
			setForm(null);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (fieldLabel, value) => {
		setFormData((prev) => ({
			...prev,
			[fieldLabel]: value,
		}));
		// Clear error for this field
		if (errors[fieldLabel]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[fieldLabel];
				return newErrors;
			});
		}
	};

	// Handle image upload
	const handleImageUpload = (fieldLabel, files) => {
		const fileArray = Array.from(files);
		const imageFiles = fileArray.filter((file) =>
			file.type.startsWith("image/")
		);

		if (imageFiles.length === 0) return;

		const newImages = [];
		imageFiles.forEach((file) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const imageData = {
					file: file,
					preview: e.target.result,
					name: file.name,
				};
				newImages.push(imageData);

				if (newImages.length === imageFiles.length) {
					setFormData((prev) => ({
						...prev,
						[fieldLabel]: [...(prev[fieldLabel] || []), ...newImages],
					}));
					imagePreviews.current[fieldLabel] = [
						...(imagePreviews.current[fieldLabel] || []),
						...newImages,
					];
				}
			};
			reader.readAsDataURL(file);
		});
	};

	// Handle image delete
	const handleImageDelete = (fieldLabel, index) => {
		setFormData((prev) => {
			const images = [...(prev[fieldLabel] || [])];
			images.splice(index, 1);
			return { ...prev, [fieldLabel]: images };
		});
		if (imagePreviews.current[fieldLabel]) {
			imagePreviews.current[fieldLabel].splice(index, 1);
		}
	};

	// Handle signature
	const handleSignatureStart = (fieldLabel, e) => {
		const canvas = signatureCanvasRefs.current[fieldLabel];
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		ctx.beginPath();
		ctx.moveTo(
			e.nativeEvent.offsetX || e.touches[0].clientX - canvas.offsetLeft,
			e.nativeEvent.offsetY || e.touches[0].clientY - canvas.offsetTop
		);
		canvas.isDrawing = true;
	};

	const handleSignatureMove = (fieldLabel, e) => {
		const canvas = signatureCanvasRefs.current[fieldLabel];
		if (!canvas || !canvas.isDrawing) return;
		const ctx = canvas.getContext("2d");
		ctx.lineTo(
			e.nativeEvent.offsetX || e.touches[0].clientX - canvas.offsetLeft,
			e.nativeEvent.offsetY || e.touches[0].clientY - canvas.offsetTop
		);
		ctx.stroke();
	};

	const handleSignatureEnd = (fieldLabel) => {
		const canvas = signatureCanvasRefs.current[fieldLabel];
		if (!canvas) return;
		canvas.isDrawing = false;
		const signatureData = canvas.toDataURL();
		handleInputChange(fieldLabel, signatureData);
	};

	const handleSignatureClear = (fieldLabel) => {
		const canvas = signatureCanvasRefs.current[fieldLabel];
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		handleInputChange(fieldLabel, "");
	};

	const validateForm = () => {
		const newErrors = {};

		if (form && form.fields) {
			form.fields.forEach((field) => {
				if (!field.label || field.label.trim() === "") {
					return; // Skip fields with empty labels
				}

				if (field.required) {
					const value = formData[field.label];
					// Check if value is empty (null, undefined, empty string, or empty array)
					if (
						value === null ||
						value === undefined ||
						value === "" ||
						(Array.isArray(value) && value.length === 0)
					) {
						newErrors[field.label] = "This field is required";
					}
				}
			});
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setSubmitting(true);
		try {
			// Process form data - convert images to base64 strings for storage
			const processedData = { ...formData };
			Object.keys(processedData).forEach((key) => {
				const field = form.fields.find((f) => f.label === key);
				if (field && field.type === "image") {
					// Convert image objects to base64 strings
					if (Array.isArray(processedData[key])) {
						processedData[key] = processedData[key].map((img) =>
							typeof img === "string" ? img : img.preview || img
						);
					}
				}
			});

			const result = await submitForm(form.id, processedData);

			if (result.success) {
				setSubmitted(true);
			} else {
				throw new Error(result.error || "Failed to submit form");
			}
		} catch (error) {
			console.error("Error submitting form:", error);
			alert(error.message || "Failed to submit form. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50">
				<Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
			</div>
		);
	}

	if (!form) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-zinc-900 mb-2">
						Form Not Found
					</h1>
					<p className="text-zinc-600">
						This form doesn't exist or is not published.
					</p>
				</div>
			</div>
		);
	}

	if (submitted) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
				>
					<CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
					<h2 className="text-2xl font-bold text-zinc-900 mb-2">Thank You!</h2>
					<p className="text-zinc-600">
						Your form has been submitted successfully.
					</p>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-50 py-12 px-4">
			<div className="max-w-2xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-white rounded-2xl shadow-xl p-8"
				>
					<h1 className="text-3xl font-bold text-zinc-900 mb-2">
						{form.title}
					</h1>
					{form.description && (
						<p className="text-zinc-600 mb-8">{form.description}</p>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						{form.fields && form.fields.length > 0 ? (
							form.fields
								.filter((field) => field.label && field.label.trim() !== "")
								.map((field, index) => (
									<div key={field.id || index}>
										<label className="block text-sm font-medium text-zinc-900 mb-2">
											{field.label}
											{field.required && (
												<span className="text-red-600 ml-1">*</span>
											)}
										</label>

										{field.type === "textarea" ? (
											<textarea
												value={formData[field.label] || ""}
												onChange={(e) =>
													handleInputChange(field.label, e.target.value)
												}
												placeholder={field.placeholder || ""}
												required={field.required}
												rows={4}
												className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 ${
													errors[field.label]
														? "border-red-300"
														: "border-zinc-200"
												}`}
											/>
										) : field.type === "select" ? (
											<select
												value={formData[field.label] || ""}
												onChange={(e) =>
													handleInputChange(field.label, e.target.value)
												}
												required={field.required}
												className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 ${
													errors[field.label]
														? "border-red-300"
														: "border-zinc-200"
												}`}
											>
												<option value="">Select an option...</option>
												{field.options &&
													field.options.map((option, optIndex) => (
														<option key={optIndex} value={option}>
															{option}
														</option>
													))}
											</select>
										) : field.type === "checkbox" ? (
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													id={`field-${index}`}
													checked={formData[field.label] || false}
													onChange={(e) =>
														handleInputChange(field.label, e.target.checked)
													}
													required={field.required}
													className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
												/>
												<label
													htmlFor={`field-${index}`}
													className="text-sm text-zinc-700"
												>
													{field.placeholder || "Check this box"}
												</label>
											</div>
										) : field.type === "radio" ? (
											<div className="space-y-2">
												{field.options &&
													field.options.map((option, optIndex) => (
														<div
															key={optIndex}
															className="flex items-center gap-2"
														>
															<input
																type="radio"
																id={`field-${index}-${optIndex}`}
																name={`field-${index}`}
																value={option}
																checked={formData[field.label] === option}
																onChange={(e) =>
																	handleInputChange(field.label, e.target.value)
																}
																required={field.required}
																className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
															/>
															<label
																htmlFor={`field-${index}-${optIndex}`}
																className="text-sm text-zinc-700"
															>
																{option}
															</label>
														</div>
													))}
											</div>
										) : field.type === "name" ? (
											<input
												type="text"
												value={formData[field.label] || ""}
												onChange={(e) =>
													handleInputChange(field.label, e.target.value)
												}
												placeholder={field.placeholder || "Enter your name"}
												required={field.required}
												className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 ${
													errors[field.label]
														? "border-red-300"
														: "border-zinc-200"
												}`}
											/>
										) : field.type === "rating" ? (
											<div className="flex items-center gap-1">
												{Array.from({
													length: field.maxRating || 5,
												}).map((_, i) => {
													const rating = parseInt(formData[field.label] || 0);
													return (
														<button
															key={i}
															type="button"
															onClick={() =>
																handleInputChange(field.label, i + 1)
															}
															className="focus:outline-none"
														>
															<Star
																className={`w-8 h-8 transition-colors ${
																	i < rating
																		? "text-yellow-400 fill-yellow-400"
																		: "text-zinc-300"
																}`}
															/>
														</button>
													);
												})}
												{formData[field.label] && (
													<span className="ml-2 text-sm text-zinc-600">
														{formData[field.label]} / {field.maxRating || 5}
													</span>
												)}
											</div>
										) : field.type === "date" ? (
											<DatePicker
												value={formData[field.label] || ""}
												onChange={(value) =>
													handleInputChange(field.label, value)
												}
												placeholder={field.placeholder || "Select date"}
												className="w-full"
											/>
										) : field.type === "signature" ? (
											<div className="space-y-2">
												<canvas
													ref={(el) => {
														if (
															el &&
															!signatureCanvasRefs.current[field.label]
														) {
															signatureCanvasRefs.current[field.label] = el;
															const rect = el.getBoundingClientRect();
															el.width = rect.width;
															el.height = 200;
															const ctx = el.getContext("2d");
															ctx.strokeStyle = "#000";
															ctx.lineWidth = 2;
															ctx.lineCap = "round";
															ctx.lineJoin = "round";
														}
													}}
													onMouseDown={(e) =>
														handleSignatureStart(field.label, e)
													}
													onMouseMove={(e) =>
														handleSignatureMove(field.label, e)
													}
													onMouseUp={() => handleSignatureEnd(field.label)}
													onMouseLeave={() => handleSignatureEnd(field.label)}
													onTouchStart={(e) => {
														e.preventDefault();
														handleSignatureStart(field.label, e);
													}}
													onTouchMove={(e) => {
														e.preventDefault();
														handleSignatureMove(field.label, e);
													}}
													onTouchEnd={(e) => {
														e.preventDefault();
														handleSignatureEnd(field.label);
													}}
													className="w-full border border-zinc-200 rounded-xl cursor-crosshair bg-white"
													style={{ touchAction: "none" }}
												/>
												<button
													type="button"
													onClick={() => handleSignatureClear(field.label)}
													className="text-sm text-zinc-600 hover:text-zinc-900 px-3 py-1.5 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
												>
													Clear Signature
												</button>
											</div>
										) : field.type === "image" ? (
											<div className="space-y-3">
												<input
													type="file"
													accept="image/*"
													multiple
													onChange={(e) =>
														handleImageUpload(field.label, e.target.files)
													}
													className="hidden"
													id={`image-upload-${index}`}
												/>
												<label
													htmlFor={`image-upload-${index}`}
													className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors"
												>
													<Upload className="w-4 h-4 text-zinc-600" />
													<span className="text-sm text-zinc-700">
														Upload Images
													</span>
												</label>
												{formData[field.label] &&
													formData[field.label].length > 0 && (
														<div className="grid grid-cols-3 gap-3">
															{formData[field.label].map((image, imgIndex) => (
																<div key={imgIndex} className="relative group">
																	<img
																		src={image.preview || image}
																		alt={`Preview ${imgIndex + 1}`}
																		className="w-full h-24 object-cover rounded-xl border border-zinc-200"
																	/>
																	<button
																		type="button"
																		onClick={() =>
																			handleImageDelete(field.label, imgIndex)
																		}
																		className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
																	>
																		<X className="w-3 h-3" />
																	</button>
																</div>
															))}
														</div>
													)}
											</div>
										) : (
											<input
												type={field.type || "text"}
												value={formData[field.label] || ""}
												onChange={(e) =>
													handleInputChange(field.label, e.target.value)
												}
												placeholder={field.placeholder || ""}
												required={field.required}
												className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 ${
													errors[field.label]
														? "border-red-300"
														: "border-zinc-200"
												}`}
											/>
										)}

										{errors[field.label] && (
											<p className="text-red-600 text-xs mt-1">
												{errors[field.label]}
											</p>
										)}
									</div>
								))
						) : (
							<p className="text-zinc-500 text-center py-8">
								No fields configured for this form.
							</p>
						)}

						<div className="pt-4">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								type="submit"
								disabled={submitting}
								className="w-full bg-zinc-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{submitting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Submitting...
									</>
								) : (
									"Submit"
								)}
							</motion.button>
						</div>
					</form>
				</motion.div>
			</div>
		</div>
	);
};

export default FormPage;
