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
	where,
	serverTimestamp,
} from "firebase/firestore";
import {
	ref,
	uploadBytes,
	getDownloadURL,
	deleteObject,
	uploadBytesResumable,
} from "firebase/storage";
import { db, storage } from "../config/firebase";

// Simple UUID generator
const generateUUID = () => {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

const ASSETS_COLLECTION = "assets";

/**
 * Compress image file in browser
 * @param {File} file - Image file to compress
 * @param {number} maxWidth - Maximum width (default: 1920)
 * @param {number} maxHeight - Maximum height (default: 1920)
 * @param {number} quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<File>} Compressed file
 */
export const compressImage = async (
	file,
	maxWidth = 1920,
	maxHeight = 1920,
	quality = 0.8
) => {
	return new Promise((resolve, reject) => {
		// Only compress images
		if (!file.type.startsWith("image/")) {
			resolve(file);
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement("canvas");
				let width = img.width;
				let height = img.height;

				// Calculate new dimensions
				if (width > height) {
					if (width > maxWidth) {
						height = (height * maxWidth) / width;
						width = maxWidth;
					}
				} else {
					if (height > maxHeight) {
						width = (width * maxHeight) / height;
						height = maxHeight;
					}
				}

				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							const compressedFile = new File([blob], file.name, {
								type: file.type,
								lastModified: Date.now(),
							});
							resolve(compressedFile);
						} else {
							resolve(file);
						}
					},
					file.type,
					quality
				);
			};
			img.onerror = () => resolve(file);
			img.src = e.target.result;
		};
		reader.onerror = () => resolve(file);
		reader.readAsDataURL(file);
	});
};

/**
 * Upload a file to Firebase Storage
 * @param {File} file - File to upload
 * @param {Function} onProgress - Progress callback (bytesTransferred, totalBytes)
 * @returns {Promise<Object>} Object with downloadURL and fileId
 */
export const uploadAssetFile = async (file, onProgress = null) => {
	try {
		// Compress if image
		let fileToUpload = file;
		if (file.type.startsWith("image/")) {
			fileToUpload = await compressImage(file);
		}

		// Generate unique file ID
		const fileId = generateUUID();
		const fileExtension = file.name.split(".").pop();
		const fileName = `${fileId}.${fileExtension}`;
		const storagePath = `assets/${fileName}`;

		// Upload to Firebase Storage
		const storageRef = ref(storage, storagePath);

		// For progress tracking, we need to use uploadBytesResumable
		const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

		return new Promise((resolve, reject) => {
			uploadTask.on(
				"state_changed",
				(snapshot) => {
					if (onProgress) {
						onProgress(snapshot.bytesTransferred, snapshot.totalBytes);
					}
				},
				(error) => {
					console.error("Error uploading file:", error);
					reject(error);
				},
				async () => {
					try {
						const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

						// Save metadata to Firestore
						const assetData = {
							name: file.name,
							fileName: fileName,
							fileId: fileId,
							type: file.type,
							size: fileToUpload.size,
							originalSize: file.size,
							url: downloadURL,
							storagePath: storagePath,
							createdAt: serverTimestamp(),
							updatedAt: serverTimestamp(),
						};

						const docRef = await addDoc(
							collection(db, ASSETS_COLLECTION),
							assetData
						);

						resolve({
							id: docRef.id,
							fileId: fileId,
							downloadURL: downloadURL,
							...assetData,
						});
					} catch (error) {
						console.error("Error saving asset metadata:", error);
						reject(error);
					}
				}
			);
		});
	} catch (error) {
		console.error("Error uploading asset:", error);
		throw error;
	}
};

/**
 * Get all assets
 * @returns {Promise<Array>} Array of asset documents
 */
export const getAllAssets = async () => {
	try {
		const q = query(
			collection(db, ASSETS_COLLECTION),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);
		const assets = [];

		querySnapshot.forEach((doc) => {
			const assetData = {
				id: doc.id,
				...doc.data(),
			};
			assets.push(assetData);
		});

		return assets;
	} catch (error) {
		console.error("Error getting assets:", error);
		throw error;
	}
};

/**
 * Get a single asset by ID
 * @param {string} id - Asset document ID
 * @returns {Promise<Object>} Asset document
 */
export const getAssetById = async (id) => {
	try {
		const docRef = doc(db, ASSETS_COLLECTION, id);
		const docSnap = await getDoc(docRef);

		if (docSnap.exists()) {
			return {
				id: docSnap.id,
				...docSnap.data(),
			};
		} else {
			throw new Error("Asset not found");
		}
	} catch (error) {
		console.error("Error getting asset:", error);
		throw error;
	}
};

/**
 * Get asset by fileId (for public URL access)
 * @param {string} fileId - File ID (UUID)
 * @returns {Promise<Object>} Asset document
 */
export const getAssetByFileId = async (fileId) => {
	try {
		const q = query(
			collection(db, ASSETS_COLLECTION),
			where("fileId", "==", fileId)
		);

		const querySnapshot = await getDocs(q);

		if (!querySnapshot.empty) {
			const doc = querySnapshot.docs[0];
			return {
				id: doc.id,
				...doc.data(),
			};
		} else {
			throw new Error("Asset not found");
		}
	} catch (error) {
		console.error("Error getting asset by fileId:", error);
		throw error;
	}
};

/**
 * Delete an asset
 * @param {string} id - Asset document ID
 * @returns {Promise<void>}
 */
export const deleteAsset = async (id) => {
	try {
		// Get asset data first
		const asset = await getAssetById(id);

		// Delete from Storage first (so if it fails, we still have Firestore record)
		if (asset.storagePath) {
			try {
				const storageRef = ref(storage, asset.storagePath);
				await deleteObject(storageRef);
			} catch (storageError) {
				console.error("Error deleting file from Storage:", storageError);
				// If storagePath doesn't work, try constructing it from fileName
				if (asset.fileName) {
					try {
						const fallbackPath = `assets/${asset.fileName}`;
						const fallbackRef = ref(storage, fallbackPath);
						await deleteObject(fallbackRef);
					} catch (fallbackError) {
						console.error(
							"Error deleting file with fallback path:",
							fallbackError
						);
						// Continue with Firestore deletion even if Storage deletion fails
					}
				}
			}
		} else if (asset.fileName) {
			// If storagePath is missing but fileName exists, construct the path
			try {
				const storagePath = `assets/${asset.fileName}`;
				const storageRef = ref(storage, storagePath);
				await deleteObject(storageRef);
			} catch (storageError) {
				console.error("Error deleting file from Storage:", storageError);
				// Continue with Firestore deletion even if Storage deletion fails
			}
		}

		// Delete from Firestore
		const docRef = doc(db, ASSETS_COLLECTION, id);
		await deleteDoc(docRef);
	} catch (error) {
		console.error("Error deleting asset:", error);
		throw error;
	}
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * Get file type category
 * @param {string} mimeType - MIME type
 * @returns {string} File type category (image, video, pdf, document, other)
 */
export const getFileTypeCategory = (mimeType) => {
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType.startsWith("video/")) return "video";
	if (mimeType === "application/pdf") return "pdf";
	if (
		mimeType.includes("document") ||
		mimeType.includes("text") ||
		mimeType.includes("word") ||
		mimeType.includes("excel") ||
		mimeType.includes("powerpoint")
	) {
		return "document";
	}
	return "other";
};
