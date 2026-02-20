import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	ShoppingBag,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	Trash2,
	Edit,
	Plus,
	ExternalLink,
	Image as ImageIcon,
} from "lucide-react";
import { getAllProducts, deleteProduct } from "../../../lib/api/products";
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
import ProductModal from "../../../lib/ui/ProductModal";
import ProductDetailsModal from "../../../lib/ui/ProductDetailsModal";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import { toast } from "react-toastify";

const ProductsTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null);
	const [sortDirection, setSortDirection] = useState("asc");
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [isProductModalOpen, setIsProductModalOpen] = useState(false);
	const [isProductDetailsModalOpen, setIsProductDetailsModalOpen] =
		useState(false);
	const [productToEdit, setProductToEdit] = useState(null);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState(null);

	const {
		data: products = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["products"],
		queryFn: () => getAllProducts(),
	});

	// Delete mutation
	const deleteProductMutation = useMutation({
		mutationFn: (productId) => deleteProduct(productId),
		onSuccess: () => {
			toast.success("Product deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
		onError: (error) => {
			console.error("Error deleting product:", error);
			toast.error(
				error.message || "Failed to delete product. Please try again."
			);
		},
	});

	const filteredProducts = products.filter((product) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			product.name?.toLowerCase().includes(searchLower) ||
			product.description?.toLowerCase().includes(searchLower) ||
			product.id?.toLowerCase().includes(searchLower)
		);
	});

	// Sort products
	const sortedProducts = [...filteredProducts].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison
		if (sortField === "createdAt") {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: a.created_at
					? new Date(a.created_at)
					: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: b.created_at
					? new Date(b.created_at)
					: new Date(b.createdAt || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle numeric comparison for price
		if (sortField === "price") {
			const getPriceAmount = (product) => {
				if (!product.prices || product.prices.length === 0) return 0;
				const price = product.prices[0];
				// Handle both Polar format (price_amount in cents) and direct amount
				return price.price_amount || price.amount || price.price || 0;
			};
			const priceA = getPriceAmount(a);
			const priceB = getPriceAmount(b);
			return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "name":
				aValue = (a.name || "").toLowerCase();
				bValue = (b.name || "").toLowerCase();
				break;
			case "description":
				aValue = (a.description || "").toLowerCase();
				bValue = (b.description || "").toLowerCase();
				break;
			default:
				return 0;
		}

		// String comparison
		if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
		if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
		return 0;
	});

	// Handle column sort
	const handleSort = (field) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	// Get sort icon for column header
	const getSortIcon = (field) => {
		if (sortField !== field) {
			return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-zinc-400" />;
		}
		return sortDirection === "asc" ? (
			<ArrowUp className="w-3.5 h-3.5 ml-1 text-zinc-900" />
		) : (
			<ArrowDown className="w-3.5 h-3.5 ml-1 text-zinc-900" />
		);
	};

	const formatDate = (date) => {
		if (!date) return "";
		const d = new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
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

	const getBillingInterval = (product) => {
		if (!product.prices || product.prices.length === 0) return "One-time";
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

	const handleDeleteClick = (product) => {
		setProductToDelete(product);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!productToDelete) return;

		try {
			await deleteProductMutation.mutateAsync(productToDelete.id);
		} finally {
			setProductToDelete(null);
			setIsDeleteModalOpen(false);
		}
	};

	const handleViewClick = (product) => {
		setSelectedProduct(product);
		setIsProductDetailsModalOpen(true);
	};

	const handleEditClick = (product) => {
		setProductToEdit(product);
		setIsProductModalOpen(true);
	};

	const handleCreateClick = () => {
		setProductToEdit(null);
		setIsProductModalOpen(true);
	};

	const handleModalClose = () => {
		setIsProductModalOpen(false);
		setProductToEdit(null);
	};

	if (error) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-xl">
				<p className="text-sm text-red-600">
					Error loading products: {error.message}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2">
				<div>
					<h1 className="text-lg text-zinc-900">Products</h1>
					<p className="text-sm text-zinc-600 mt-1">
						Manage your digital products and checkout links
					</p>
				</div>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={handleCreateClick}
					className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors"
				>
					<Plus className="w-4 h-4" />
					Create New Product
				</motion.button>
			</div>

			{/* Search */}
			<div className="flex items-center gap-4 mx-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
					<input
						type="text"
						placeholder="Search products..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-100 focus:outline-none text-sm"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton columns={8} rows={5} />
				) : sortedProducts.length === 0 ? (
					<div className="p-8 text-center border border-zinc-200 rounded-xl">
						<ShoppingBag className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
						<p className="text-sm text-zinc-600">
							{searchQuery
								? "No products found matching your search"
								: "No products yet. Create your first product to get started."}
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Images</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("name")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										Name
										{getSortIcon("name")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("description")}
									className="min-w-[300px]"
								>
									<div className="flex items-center gap-2">
										Description
										{getSortIcon("description")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("price")}
								>
									<div className="flex items-center gap-2">
										Price
										{getSortIcon("price")}
									</div>
								</TableHead>
								<TableHead>Billing</TableHead>
								<TableHead className="min-w-[200px]">Checkout Link</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("createdAt")}
								>
									<div className="flex items-center gap-2">
										Created
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sortedProducts.map((product) => {
								const bannerImages = getBannerImages(product);
								return (
									<TableRow key={product.id}>
										<TableCell>
												{bannerImages.length > 0 ? (
													<div className="flex items-center gap-1.5">
														{bannerImages.slice(0, 3).map((imgUrl, idx) => (
															<div
																key={idx}
																className="relative w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 flex-shrink-0 bg-zinc-100 group"
															>
																<img
																	src={imgUrl}
																	alt={`Banner ${idx + 1}`}
																	className="w-full h-full object-cover relative z-10"
																	onError={(e) => {
																		e.target.style.display = "none";
																		// Show fallback icon when image fails
																		const fallback =
																			e.target.nextElementSibling;
																		if (fallback) {
																			fallback.style.display = "flex";
																		}
																	}}
																/>
																{/* Fallback icon - hidden by default, shown if image fails to load */}
																<div className="absolute inset-0 hidden items-center justify-center bg-zinc-100 z-0">
																	<ImageIcon className="w-4 h-4 text-zinc-400" />
																</div>
															</div>
														))}
														{bannerImages.length > 3 && (
															<div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-600 flex-shrink-0">
																+{bannerImages.length - 3}
															</div>
														)}
													</div>
												) : (
													<div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
														<ImageIcon className="w-4 h-4 text-zinc-400" />
													</div>
												)}
										</TableCell>
										<TableCell>
											<button
												onClick={() => handleViewClick(product)}
												className="text-left w-full hover:text-zinc-600 transition-colors cursor-pointer"
											>
												<div className="text-sm font-medium text-zinc-900 hover:underline">
													{product.name || "Unnamed Product"}
												</div>
												<div className="text-xs text-zinc-500 mt-0.5">
													ID: {product.id?.substring(0, 8)}...
												</div>
											</button>
										</TableCell>
										<TableCell>
											<button
												onClick={() => handleViewClick(product)}
												className="text-left w-full hover:text-zinc-600 transition-colors cursor-pointer"
											>
												<div className="text-sm text-zinc-700 max-w-xs truncate hover:underline">
													{product.description || "No description"}
												</div>
											</button>
										</TableCell>
										<TableCell>
											<div className="text-sm font-medium text-zinc-900">
												{formatPrice(product)}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm text-zinc-600">
												{getBillingInterval(product)}
											</div>
										</TableCell>
										<TableCell>
											{product.checkoutLink ? (
												<a
													href={product.checkoutLink}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
												>
													<span className="truncate max-w-[200px]">
														{product.checkoutLink}
													</span>
													<ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
												</a>
											) : (
												<span className="text-sm text-zinc-400">No link</span>
											)}
										</TableCell>
										<TableCell>
											<div className="text-sm text-zinc-600">
												{formatDate(
													product.createdAt?.toDate
														? product.createdAt.toDate()
														: product.createdAt
												)}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-2">
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleEditClick(product)}
													className="p-1.5 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
													title="Edit"
												>
													<Edit className="w-4 h-4" />
												</motion.button>
												<motion.button
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.9 }}
													onClick={() => handleDeleteClick(product)}
													className="p-1.5 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
													title="Delete"
												>
													<Trash2 className="w-4 h-4" />
												</motion.button>
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</div>

			{/* Modals */}
			<ProductModal
				isOpen={isProductModalOpen}
				onClose={handleModalClose}
				productToEdit={productToEdit}
				queryClient={queryClient}
			/>

			<ProductDetailsModal
				isOpen={isProductDetailsModalOpen}
				onClose={() => {
					setIsProductDetailsModalOpen(false);
					setSelectedProduct(null);
				}}
				product={selectedProduct}
			/>

			<ConfirmationModal
				isOpen={isDeleteModalOpen}
				onClose={() => {
					setIsDeleteModalOpen(false);
					setProductToDelete(null);
				}}
				onConfirm={handleDeleteConfirm}
				title="Delete Product"
				message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
				variant="danger"
				confirmText="Delete"
			/>
		</div>
	);
};

export default ProductsTab;
