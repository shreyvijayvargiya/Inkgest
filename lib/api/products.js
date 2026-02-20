/**
 * Products API
 * Client-side API functions for managing products in Firestore
 * All Polar API calls are handled server-side via API routes
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const PRODUCTS_COLLECTION = "products";

/**
 * Get all products from Firestore ONLY
 * This function ONLY fetches from Firestore products collection, NOT from Polar API
 * @returns {Promise<Array>} Array of products from Firestore
 */
export async function getAllProducts() {
	try {
		// Fetch ONLY from Firestore - no Polar API calls
		const q = query(
			collection(db, PRODUCTS_COLLECTION),
			orderBy("createdAt", "desc")
		);
		const querySnapshot = await getDocs(q);
		const products = [];

		querySnapshot.forEach((doc) => {
			products.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return products;
	} catch (error) {
		// If orderBy fails (e.g., missing index), try without ordering
		try {
			const q = query(collection(db, PRODUCTS_COLLECTION));
			const querySnapshot = await getDocs(q);
			const products = [];

			querySnapshot.forEach((doc) => {
				products.push({
					id: doc.id,
					...doc.data(),
				});
			});

			// Sort manually by createdAt if available
			products.sort((a, b) => {
				if (!a.createdAt && !b.createdAt) return 0;
				if (!a.createdAt) return 1;
				if (!b.createdAt) return -1;

				const dateA = a.createdAt?.toDate
					? a.createdAt.toDate()
					: new Date(a.createdAt);
				const dateB = b.createdAt?.toDate
					? b.createdAt.toDate()
					: new Date(b.createdAt);
				return dateB - dateA; // Descending order
			});

			return products;
		} catch (fallbackError) {
			console.error("Error getting products:", fallbackError);
			throw fallbackError;
		}
	}
}

/**
 * Get product by ID from Firestore
 * @param {string} productId - Firestore product document ID
 * @returns {Promise<Object>} Product object
 */
export async function getProductById(productId) {
	try {
		const docRef = doc(db, PRODUCTS_COLLECTION, productId);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Product not found");
		}
	} catch (error) {
		console.error("Error getting product:", error);
		throw error;
	}
}

/**
 * Create a new product in Polar and Firestore
 * @param {Object} productData - Product data
 * @param {string} productData.name - Product name
 * @param {string} productData.description - Product description
 * @param {Array} productData.prices - Pricing information array
 * @returns {Promise<Object>} Created product from Firestore
 */
export async function createProduct(productData) {
	try {
		// Step 1: Create product in Polar (server-side)
		const createResponse = await fetch("/api/polar/products/create", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: productData.name,
				description: productData.description,
				bannerImages: productData.bannerImages,
				prices: productData.prices,
			}),
		});

		if (!createResponse.ok) {
			const errorData = await createResponse.json();
			throw new Error(errorData.error || "Failed to create product in Polar");
		}

		const createData = await createResponse.json();
		const polarProduct = createData.product;
		const polarProductId = polarProduct.id;
		const priceId = createData.priceId;
		const mediaFileIds = createData.mediaFileIds || [];

		// Step 2: Create checkout link with price ID (server-side)
		let checkoutLink = "";
		try {
			const checkoutResponse = await fetch(
				"/api/polar/products/checkout-link",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						productId: polarProductId,
						priceId: priceId, // Pass the price ID to ensure correct price/plan
					}),
				}
			);

			if (checkoutResponse.ok) {
				const checkoutData = await checkoutResponse.json();
				checkoutLink = checkoutData.checkoutUrl || "";
			}
		} catch (checkoutError) {
			console.warn("Failed to create checkout link:", checkoutError);
			// Continue even if checkout link creation fails
		}

		// Step 3: Store in Firestore
		// Store banner images with their file IDs from Polar
		const firestoreData = {
			polarProductId: polarProductId,
			name: productData.name,
			description: productData.description || "",
			bannerImages: productData.bannerImages || [], // Store original banner image data
			mediaFileIds: mediaFileIds, // Store Polar file IDs
			prices: productData.prices,
			checkoutLink: checkoutLink,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(
			collection(db, PRODUCTS_COLLECTION),
			firestoreData
		);

		// Return the Firestore document
		return {
			id: docRef.id,
			...firestoreData,
		};
	} catch (error) {
		console.error("Error creating product:", error);
		throw error;
	}
}

/**
 * Update a product in Polar and Firestore
 * @param {string} productId - Firestore product document ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object>} Updated product from Firestore
 */
export async function updateProduct(productId, productData) {
	try {
		// Get existing product from Firestore to get Polar product ID
		const existingProduct = await getProductById(productId);
		const polarProductId = existingProduct.polarProductId;

		if (!polarProductId) {
			throw new Error("Product does not have a Polar product ID");
		}

		// Step 1: Update product in Polar (server-side)
		const updateResponse = await fetch("/api/polar/products/update", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				polarProductId: polarProductId,
				name: productData.name,
				description: productData.description,
				bannerImages: productData.bannerImages,
				prices: productData.prices,
			}),
		});

		if (!updateResponse.ok) {
			const errorData = await updateResponse.json();
			throw new Error(errorData.error || "Failed to update product in Polar");
		}

		const updateResponseData = await updateResponse.json();
		const priceId = updateResponseData.priceId;
		const mediaFileIds = updateResponseData.mediaFileIds;

		// Step 2: Regenerate checkout link with updated product and price ID
		let checkoutLink = existingProduct.checkoutLink || "";
		try {
			const checkoutResponse = await fetch(
				"/api/polar/products/checkout-link",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						productId: polarProductId,
						priceId: priceId, // Pass the updated price ID
					}),
				}
			);

			if (checkoutResponse.ok) {
				const checkoutData = await checkoutResponse.json();
				checkoutLink = checkoutData.checkoutUrl || "";
			}
		} catch (checkoutError) {
			console.warn("Failed to regenerate checkout link:", checkoutError);
			// Continue with existing checkout link if regeneration fails
		}

		// Step 3: Update in Firestore with new checkout link
		const docRef = doc(db, PRODUCTS_COLLECTION, productId);
		const firestoreUpdateData = {
			name: productData.name,
			description: productData.description || "",
			bannerImages:
				productData.bannerImages || existingProduct.bannerImages || [],
			prices: productData.prices,
			checkoutLink: checkoutLink,
			updatedAt: serverTimestamp(),
		};

		// Update mediaFileIds if new ones were uploaded
		if (mediaFileIds && mediaFileIds.length > 0) {
			firestoreUpdateData.mediaFileIds = mediaFileIds;
		}

		await updateDoc(docRef, firestoreUpdateData);

		// Return updated product
		return {
			id: productId,
			...existingProduct,
			...firestoreUpdateData,
		};
	} catch (error) {
		console.error("Error updating product:", error);
		throw error;
	}
}

/**
 * Delete a product from Polar and Firestore
 * @param {string} productId - Firestore product document ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
	try {
		// Get existing product from Firestore to get Polar product ID
		const existingProduct = await getProductById(productId);
		const polarProductId = existingProduct.polarProductId;

		// Step 1: Delete from Polar (server-side, if polarProductId exists)
		if (polarProductId) {
			try {
				const deleteResponse = await fetch("/api/polar/products/delete", {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						polarProductId: polarProductId,
					}),
				});

				if (!deleteResponse.ok) {
					const errorData = await deleteResponse.json();
					console.warn("Failed to delete product from Polar:", errorData);
					// Continue to delete from Firestore even if Polar deletion fails
				}
			} catch (polarError) {
				console.warn("Error deleting product from Polar:", polarError);
				// Continue to delete from Firestore
			}
		}

		// Step 2: Delete from Firestore
		const docRef = doc(db, PRODUCTS_COLLECTION, productId);
		await deleteDoc(docRef);

		return;
	} catch (error) {
		console.error("Error deleting product:", error);
		throw error;
	}
}
