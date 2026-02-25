import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus,
	Trash2,
	Search,
	FileText,
	X,
	Save,
	Eye,
	Copy,
	ExternalLink,
	Calendar,
	CheckCircle2,
	Star,
	Upload,
	ArrowLeft,
} from "lucide-react";
import {
	getAllForms,
	createForm,
	updateForm,
	deleteForm,
	getFormSubmissions,
	deleteFormSubmission,
} from "../../../lib/api/forms";
import { toast } from "sonner";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import TableSkeleton from "../../../lib/ui/TableSkeleton";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
	TableEmpty,
} from "../../../lib/ui/Table";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import { getFormSubmissionCount } from "../../../lib/api/forms";

// Component to display submission count
const FormSubmissionCount = ({ formId }) => {
	const { data: count = 0 } = useQuery({
		queryKey: ["formSubmissionCount", formId],
		queryFn: () => getFormSubmissionCount(formId),
		staleTime: 30 * 1000, // Cache for 30 seconds
	});

	return <span>{count}</span>;
};

const FormsTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedForm, setSelectedForm] = useState(null);
	const [viewMode, setViewMode] = useState("list"); // 'list' or 'submissions'
	const [formTitle, setFormTitle] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formFields, setFormFields] = useState([]);
	const [isPublished, setIsPublished] = useState(false);
	const [showFormModal, setShowFormModal] = useState(false);
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);
	const [openFieldTypeDropdowns, setOpenFieldTypeDropdowns] = useState({});
	const [showPreview, setShowPreview] = useState(false);
	const [editingForm, setEditingForm] = useState(null);

	// Fetch forms
	const {
		data: forms = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["forms"],
		queryFn: () => getAllForms(),
	});

	// Fetch submissions for selected form
	const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery({
		queryKey: ["formSubmissions", selectedForm?.id],
		queryFn: () => getFormSubmissions(selectedForm?.id),
		enabled: !!selectedForm && viewMode === "submissions",
	});

	// Filter forms by search query
	const filteredForms = forms.filter((form) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			form.title?.toLowerCase().includes(searchLower) ||
			form.description?.toLowerCase().includes(searchLower)
		);
	});

	// Create form mutation
	const createFormMutation = useMutation({
		mutationFn: createForm,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["forms"] });
			handleCloseModal();
			toast.success("Form created successfully!");
		},
		onError: (error) => {
			console.error("Error creating form:", error);
			toast.error("Failed to create form. Please try again.");
		},
	});

	// Update form mutation
	const updateFormMutation = useMutation({
		mutationFn: ({ id, data }) => updateForm(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["forms"] });
			queryClient.invalidateQueries({ queryKey: ["formSubmissions"] });
			handleCloseModal();
			toast.success("Form updated successfully!");
		},
		onError: (error) => {
			console.error("Error updating form:", error);
			toast.error("Failed to update form. Please try again.");
		},
	});

	// Delete form mutation
	const deleteFormMutation = useMutation({
		mutationFn: deleteForm,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["forms"] });
			setSelectedForm(null);
			setViewMode("list");
			toast.success("Form deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting form:", error);
			toast.error("Failed to delete form. Please try again.");
		},
	});

	// Delete submission mutation
	const deleteSubmissionMutation = useMutation({
		mutationFn: deleteFormSubmission,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["formSubmissions"] });
			toast.success("Submission deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting submission:", error);
			toast.error("Failed to delete submission. Please try again.");
		},
	});

	// Handle form selection
	const handleFormSelect = (form) => {
		setSelectedForm(form);
		setViewMode("submissions");
	};

	// Handle create new form
	const handleCreateForm = () => {
		setEditingForm(null);
		setFormTitle("");
		setFormDescription("");
		setFormFields([]);
		setIsPublished(false);
		setSelectedForm(null);
		setShowFormModal(true);
		setShowPreview(false);
	};

	// Handle edit form
	const handleEditForm = (form) => {
		setEditingForm(form);
		setSelectedForm(form);
		setFormTitle(form.title || "");
		setFormDescription(form.description || "");
		setFormFields(form.fields || []);
		setIsPublished(form.isPublished || false);
		setShowFormModal(true);
		setShowPreview(false);
	};

	// Handle save form
	const handleSaveForm = () => {
		if (!formTitle.trim()) {
			toast.warning("Please enter a form title");
			return;
		}

		// Filter out fields with empty labels
		const validFields = formFields.filter(
			(field) => field.label && field.label.trim() !== ""
		);

		if (validFields.length === 0) {
			toast.warning("Please add at least one field with a label");
			return;
		}

		const formData = {
			title: formTitle,
			description: formDescription,
			fields: validFields,
			isPublished: isPublished,
		};

		if (selectedForm) {
			updateFormMutation.mutate({ id: selectedForm.id, data: formData });
		} else {
			createFormMutation.mutate(formData);
		}
	};

	// Handle delete form
	const handleDeleteForm = (formId) => {
		setConfirmAction(() => () => deleteFormMutation.mutate(formId));
		setShowConfirmModal(true);
	};

	// Handle delete submission
	const handleDeleteSubmission = (submissionId) => {
		setConfirmAction(() => () => deleteSubmissionMutation.mutate(submissionId));
		setShowConfirmModal(true);
	};

	// Handle add field
	const handleAddField = () => {
		setFormFields([
			...formFields,
			{
				id: Date.now().toString(),
				label: "",
				type: "text",
				required: false,
				placeholder: "",
				options: [], // For select, radio
				maxRating: 5, // For rating
			},
		]);
	};

	// Handle update field
	const handleUpdateField = (fieldId, updates) => {
		setFormFields(
			formFields.map((field) =>
				field.id === fieldId ? { ...field, ...updates } : field
			)
		);
	};

	// Handle remove field
	const handleRemoveField = (fieldId) => {
		setFormFields(formFields.filter((field) => field.id !== fieldId));
	};

	// Handle copy form URL
	const handleCopyFormUrl = (form) => {
		const url = `${window.location.origin}/forms/${form.formSlug || form.id}`;
		navigator.clipboard.writeText(url);
		toast.success("Form URL copied to clipboard!");
	};

	// Format date
	const formatDate = (date) => {
		if (!date) return "";
		const d = date?.toDate ? date.toDate() : new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Close modal
	const handleCloseModal = () => {
		setShowFormModal(false);
		setEditingForm(null);
		setSelectedForm(null);
		setFormTitle("");
		setFormDescription("");
		setFormFields([]);
		setIsPublished(false);
		setShowPreview(false);
	};

	// Field types
	const fieldTypes = [
		{ value: "name", label: "Name" },
		{ value: "text", label: "Text" },
		{ value: "email", label: "Email" },
		{ value: "number", label: "Number" },
		{ value: "textarea", label: "Textarea" },
		{ value: "select", label: "Select" },
		{ value: "checkbox", label: "Checkbox" },
		{ value: "radio", label: "Radio" },
		{ value: "rating", label: "Rating" },
		{ value: "date", label: "Date Picker" },
		{ value: "signature", label: "Signature" },
		{ value: "image", label: "Image Upload" },
	];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 py-2 px-4">
				<div>
					<h1 className="text-lg text-zinc-900">Forms</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Create forms, collect submissions, and manage responses
					</p>
				</div>
				{viewMode === "list" && (
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleCreateForm}
						className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
					>
						<Plus className="w-4 h-4" />
						Create Form
					</motion.button>
				)}

			</div>

			{viewMode === "list" ? (
				<div className={`flex gap-4 px-4 ${showFormModal ? "" : ""}`}>
					{/* Left Side - Forms List */}
					<div
						className={`${showFormModal ? "w-1/2" : "w-full"} transition-all duration-300`}
					>
						{/* Search */}
						<div className="relative mb-4">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
							<input
								type="text"
								placeholder="Search forms..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
							/>
						</div>

						{/* Forms List */}
						<div className="overflow-x-auto">
							{isLoading ? (
								<TableSkeleton rows={5} columns={6} />
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="min-w-[200px]">Title</TableHead>
											<TableHead>Fields</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Submissions</TableHead>
											<TableHead>Created</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{error ? (
											<TableEmpty
												colSpan={6}
												message="Error loading forms. Please try again."
											/>
										) : filteredForms.length === 0 ? (
											<TableEmpty
												colSpan={6}
												message={
													searchQuery
														? "No forms found matching your search."
														: "No forms yet. Create your first form!"
												}
											/>
										) : (
											filteredForms.map((form) => (
												<TableRow
													key={form.id}
													onClick={() => handleFormSelect(form)}
													className="cursor-pointer"
												>
													<TableCell>
														<div className="font-medium text-sm text-zinc-900">
															{form.title}
														</div>
														{form.description && (
															<div className="text-xs text-zinc-500 mt-1">
																{form.description}
															</div>
														)}
													</TableCell>
													<TableCell className="text-zinc-600">
														{form.fields?.length || 0} fields
													</TableCell>
													<TableCell>
														<span
															className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${form.isPublished
																	? "bg-green-100 text-green-800"
																	: "bg-yellow-100 text-yellow-800"
																}`}
														>
															{form.isPublished ? "Published" : "Draft"}
														</span>
													</TableCell>
													<TableCell className="text-zinc-600">
														<FormSubmissionCount formId={form.id} />
													</TableCell>
													<TableCell className="text-zinc-600">
														{formatDate(form.createdAt)}
													</TableCell>
													<TableCell>
														<div
															className="flex items-center gap-2"
															onClick={(e) => e.stopPropagation()}
														>
															<button
																onClick={() => handleEditForm(form)}
																className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
																title="Edit form"
															>
																<FileText className="w-4 h-4" />
															</button>
															{form.isPublished && (
																<button
																	onClick={() => handleCopyFormUrl(form)}
																	className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
																	title="Copy form URL"
																>
																	<Copy className="w-4 h-4" />
																</button>
															)}
															<button
																onClick={() => handleDeleteForm(form.id)}
																className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
																title="Delete form"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							)}
						</div>
					</div>

					{/* Right Side - Form Editor */}
					{showFormModal && (
						<div className="w-1/2 border border-zinc-200 rounded-xl bg-white overflow-hidden flex flex-col">
							{/* Editor Header */}
							<div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200">
								<h2 className="text-lg text-zinc-900">
									{editingForm ? "Edit Form" : "Create Form"}
								</h2>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setShowPreview(!showPreview)}
										className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
										title="Preview form"
									>
										<Eye className="w-5 h-5" />
									</button>
									{!showPreview && (
										<button
											onClick={handleSaveForm}
											className="px-3 py-1.5 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
										>
											<Save className="w-4 h-4" />
											{editingForm ? "Update" : "Create"}
										</button>
									)}
									<button
										onClick={handleCloseModal}
										className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
									>
										<X className="w-5 h-5" />
									</button>
								</div>
							</div>

							{/* Editor Body */}
							<div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[calc(100vh-200px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
								{showPreview ? (
									/* Preview Mode */
									<div className="space-y-6">
										<div>
											<h1 className="text-2xl font-bold text-zinc-900 mb-2">
												{formTitle || "Form Title"}
											</h1>
											{formDescription && (
												<p className="text-zinc-600 mb-6">{formDescription}</p>
											)}
										</div>

										{formFields.length > 0 ? (
											formFields
												.filter(
													(field) => field.label && field.label.trim() !== ""
												)
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
																placeholder={field.placeholder || ""}
																rows={4}
																disabled
																className="w-full px-4 py-2 border border-zinc-200 rounded-xl bg-zinc-50 text-sm"
															/>
														) : field.type === "select" ? (
															<select
																disabled
																className="w-full px-4 py-2 border border-zinc-200 rounded-xl bg-zinc-50 text-sm"
															>
																<option>Select an option...</option>
																{field.options?.map((opt, i) => (
																	<option key={i}>{opt}</option>
																))}
															</select>
														) : field.type === "checkbox" ? (
															<div className="flex items-center gap-2">
																<input
																	type="checkbox"
																	disabled
																	className="w-4 h-4 text-zinc-900 border-zinc-300 rounded"
																/>
																<label className="text-sm text-zinc-700">
																	{field.placeholder || "Check this box"}
																</label>
															</div>
														) : field.type === "radio" ? (
															<div className="space-y-2">
																{field.options?.map((option, optIndex) => (
																	<div
																		key={optIndex}
																		className="flex items-center gap-2"
																	>
																		<input
																			type="radio"
																			disabled
																			className="w-4 h-4 text-zinc-900 border-zinc-300"
																		/>
																		<label className="text-sm text-zinc-700">
																			{option}
																		</label>
																	</div>
																))}
															</div>
														) : field.type === "rating" ? (
															<div className="flex items-center gap-1">
																{Array.from({
																	length: field.maxRating || 5,
																}).map((_, i) => (
																	<Star
																		key={i}
																		className="w-6 h-6 text-zinc-300"
																	/>
																))}
															</div>
														) : field.type === "date" ? (
															<input
																type="date"
																disabled
																className="w-full px-4 py-2 border border-zinc-200 rounded-xl bg-zinc-50 text-sm"
															/>
														) : field.type === "signature" ? (
															<div className="border border-zinc-200 rounded-xl h-32 bg-zinc-50 flex items-center justify-center">
																<span className="text-sm text-zinc-500">
																	Signature area
																</span>
															</div>
														) : field.type === "image" ? (
															<div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center">
																<Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
																<p className="text-sm text-zinc-500">
																	Image upload area
																</p>
															</div>
														) : (
															<input
																type={field.type || "text"}
																placeholder={field.placeholder || ""}
																disabled
																className="w-full px-4 py-2 border border-zinc-200 rounded-xl bg-zinc-50 text-sm"
															/>
														)}
													</div>
												))
										) : (
											<p className="text-zinc-500 text-center py-8">
												No fields configured. Add fields to see preview.
											</p>
										)}
									</div>
								) : (
									/* Edit Mode */
									<>
										<div>
											<label className="block text-sm font-medium text-zinc-900 mb-2">
												Form Title *
											</label>
											<input
												type="text"
												value={formTitle}
												onChange={(e) => setFormTitle(e.target.value)}
												placeholder="Enter form title..."
												className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-zinc-900 mb-2">
												Description
											</label>
											<textarea
												value={formDescription}
												onChange={(e) => setFormDescription(e.target.value)}
												placeholder="Enter form description..."
												rows={3}
												className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm resize-none"
											/>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												id="isPublished"
												checked={isPublished}
												onChange={(e) => setIsPublished(e.target.checked)}
												className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
											/>
											<label
												htmlFor="isPublished"
												className="text-sm font-medium text-zinc-900"
											>
												Publish form (make it live)
											</label>
										</div>

										<div>
											<div className="flex items-center justify-between mb-2">
												<label className="block text-sm font-medium text-zinc-900">
													Form Fields
												</label>
												<button
													onClick={handleAddField}
													className="flex items-center gap-1 text-sm text-zinc-700 hover:text-zinc-900 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
												>
													<Plus className="w-3.5 h-3.5" />
													Add Field
												</button>
											</div>

											<div className="space-y-3">
												{formFields.map((field) => (
													<div
														key={field.id}
														className="p-4 border border-zinc-200 rounded-xl space-y-3"
													>
														<div className="flex items-center justify-between">
															<span className="text-sm font-medium text-zinc-700">
																Field {formFields.indexOf(field) + 1}
															</span>
															<button
																onClick={() => handleRemoveField(field.id)}
																className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>

														<div>
															<label className="block text-xs font-medium text-zinc-700 mb-1">
																Label *
															</label>
															<input
																type="text"
																value={field.label}
																onChange={(e) =>
																	handleUpdateField(field.id, {
																		label: e.target.value,
																	})
																}
																placeholder="Field label..."
																className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
															/>
														</div>

														<div>
															<label className="block text-xs font-medium text-zinc-700 mb-1">
																Type *
															</label>
															<AnimatedDropdown
																isOpen={
																	openFieldTypeDropdowns[field.id] || false
																}
																onToggle={() => {
																	setOpenFieldTypeDropdowns((prev) => ({
																		...prev,
																		[field.id]: !prev[field.id],
																	}));
																}}
																onSelect={(value) => {
																	handleUpdateField(field.id, {
																		type: value,
																		options:
																			value === "select" || value === "radio"
																				? field.options || []
																				: [],
																	});
																	setOpenFieldTypeDropdowns((prev) => ({
																		...prev,
																		[field.id]: false,
																	}));
																}}
																options={fieldTypes}
																value={field.type}
																placeholder="Select field type"
																buttonClassName="text-sm"
															/>
														</div>

														{(field.type === "select" ||
															field.type === "radio") && (
																<div>
																	<label className="block text-xs font-medium text-zinc-700 mb-1">
																		Options (one per line) *
																	</label>
																	<textarea
																		value={
																			field.options
																				? field.options.join("\n")
																				: ""
																		}
																		onChange={(e) => {
																			const options = e.target.value
																				.split("\n")
																				.map((opt) => opt.trim())
																				.filter((opt) => opt !== "");
																			handleUpdateField(field.id, { options });
																		}}
																		placeholder="Option 1&#10;Option 2&#10;Option 3"
																		rows={3}
																		className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm resize-none"
																	/>
																</div>
															)}

														{field.type === "rating" && (
															<div>
																<label className="block text-xs font-medium text-zinc-700 mb-1">
																	Max Rating
																</label>
																<input
																	type="number"
																	min="1"
																	max="10"
																	value={field.maxRating || 5}
																	onChange={(e) =>
																		handleUpdateField(field.id, {
																			maxRating: parseInt(e.target.value) || 5,
																		})
																	}
																	className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
																/>
															</div>
														)}

														<div>
															<label className="block text-xs font-medium text-zinc-700 mb-1">
																Placeholder
															</label>
															<input
																type="text"
																value={field.placeholder}
																onChange={(e) =>
																	handleUpdateField(field.id, {
																		placeholder: e.target.value,
																	})
																}
																placeholder="Field placeholder..."
																className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
															/>
														</div>

														<div className="flex items-center gap-2">
															<input
																type="checkbox"
																id={`required-${field.id}`}
																checked={field.required}
																onChange={(e) =>
																	handleUpdateField(field.id, {
																		required: e.target.checked,
																	})
																}
																className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
															/>
															<label
																htmlFor={`required-${field.id}`}
																className="text-xs font-medium text-zinc-700"
															>
																Required field
															</label>
														</div>
													</div>
												))}

												{formFields.length === 0 && (
													<div className="text-center py-8 text-zinc-500 text-sm">
														No fields added yet. Click "Add Field" to get
														started.
													</div>
												)}
											</div>
										</div>
									</>
								)}
							</div>
						</div>
					)}
				</div>
			) : (
				<>
					{/* Submissions View */}
					{selectedForm && (
						<div className="space-y-2 px-4">
							{viewMode === "submissions" && (
								<button
									onClick={() => {
										setViewMode("list");
										setSelectedForm(null);
									}}
									className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 p-2 rounded-xl hover:bg-zinc-100 transition-colors text-xs"
								>
									<ArrowLeft className="w-3 h-3" />
									Back to Forms
								</button>
							)}
							<div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
								<h2 className="text-lg font-semibold text-zinc-900 mb-2">
									{selectedForm.title}
								</h2>
								{selectedForm.description && (
									<p className="text-sm text-zinc-600 mb-3">
										{selectedForm.description}
									</p>
								)}
								<div className="flex items-center gap-4">
									<div className="text-sm">
										<span className="text-zinc-600">Total Submissions: </span>
										<span className="font-semibold text-zinc-900">
											{submissions.length}
										</span>
									</div>
									{selectedForm.isPublished && (
										<button
											onClick={() => handleCopyFormUrl(selectedForm)}
											className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
										>
											<ExternalLink className="w-4 h-4" />
											Copy Form URL
										</button>
									)}
								</div>
							</div>

							{/* Submissions Table */}
							<div className="border border-zinc-200 rounded-xl overflow-hidden">
								<table className="w-full">
									<thead className="bg-zinc-50 border-b border-zinc-200">
										<tr>
											<th className="py-3 px-4 text-left text-xs font-semibold text-zinc-700">
												Submission Data
											</th>
											<th className="py-3 px-4 text-left text-xs font-semibold text-zinc-700">
												Date
											</th>
											<th className="py-3 px-4 text-left text-xs font-semibold text-zinc-700">
												Actions
											</th>
										</tr>
									</thead>
									<tbody>
										{isLoadingSubmissions ? (
											<tr>
												<td colSpan={3} className="py-8">
													<TableSkeleton rows={5} columns={3} />
												</td>
											</tr>
										) : submissions.length === 0 ? (
											<tr>
												<td
													colSpan={3}
													className="py-8 text-center text-zinc-500"
												>
													No submissions yet. Share your form to start
													collecting responses!
												</td>
											</tr>
										) : (
											submissions.map((submission, index) => (
												<tr
													key={submission.id}
													className={`${index === submissions.length - 1
															? ""
															: "border-b border-zinc-200"
														} hover:bg-zinc-50 transition-colors`}
												>
													<td className="py-3 px-4">
														<div className="space-y-1">
															{Object.entries(submission.data || {}).map(
																([key, value]) => (
																	<div key={key} className="text-sm">
																		<span className="font-medium text-zinc-700">
																			{key}:
																		</span>{" "}
																		<span className="text-zinc-600">
																			{String(value)}
																		</span>
																	</div>
																)
															)}
														</div>
													</td>
													<td className="py-3 px-4 text-sm text-zinc-600">
														<div className="flex items-center gap-1">
															<Calendar className="w-3.5 h-3.5" />
															{formatDate(submission.createdAt)}
														</div>
													</td>
													<td className="py-3 px-4">
														<button
															onClick={() =>
																handleDeleteSubmission(submission.id)
															}
															className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
															title="Delete submission"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</>
			)}

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={showConfirmModal}
				onClose={() => {
					setShowConfirmModal(false);
					setConfirmAction(null);
				}}
				onConfirm={() => {
					if (confirmAction) {
						confirmAction();
					}
					setShowConfirmModal(false);
					setConfirmAction(null);
				}}
				title="Confirm Delete"
				message="Are you sure you want to delete this? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default FormsTab;
