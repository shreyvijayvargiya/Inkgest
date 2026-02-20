import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";

/**
 * Upload a file to Firebase Storage
 * @param {File|Blob} file - File to upload
 * @param {string} path - Storage path (e.g., 'blogs/images/image.jpg')
 * @returns {Promise<string>} Download URL of uploaded file
 */
export const uploadFile = async (file, path) => {
	try {
		const storageRef = ref(storage, path);
		await uploadBytes(storageRef, file);
		const downloadURL = await getDownloadURL(storageRef);
		return downloadURL;
	} catch (error) {
		console.error("Error uploading file:", error);
		throw error;
	}
};

/**
 * Upload an image from base64 data URL
 * @param {string} dataUrl - Base64 data URL (e.g., 'data:image/png;base64,...')
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL of uploaded file
 */
export const uploadImageFromDataUrl = async (dataUrl, path) => {
	try {
		// Convert data URL to blob
		const response = await fetch(dataUrl);
		const blob = await response.blob();

		// Upload blob
		return await uploadFile(blob, path);
	} catch (error) {
		console.error("Error uploading image from data URL:", error);
		throw error;
	}
};

/**
 * Upload a banner image for a blog
 * @param {File} file - Image file
 * @param {string} blogId - Blog ID (optional, for existing blogs)
 * @returns {Promise<string>} Download URL of uploaded banner image
 */
export const uploadBannerImage = async (file, blogId = null) => {
	try {
		const timestamp = Date.now();
		const fileName = blogId
			? `blogs/${blogId}/banner-${timestamp}.${file.name.split(".").pop()}`
			: `blogs/banners/banner-${timestamp}.${file.name.split(".").pop()}`;

		return await uploadFile(file, fileName);
	} catch (error) {
		console.error("Error uploading banner image:", error);
		throw error;
	}
};

/**
 * Upload content images from HTML content
 * Extracts base64 images from HTML and uploads them to Firebase Storage
 * @param {string} htmlContent - HTML content with potential base64 images
 * @param {string} blogId - Blog ID for organizing images
 * @returns {Promise<string>} Updated HTML content with Firebase Storage URLs
 */
export const uploadContentImages = async (htmlContent, blogId = null) => {
	try {
		if (!htmlContent) return htmlContent;

		// Create a temporary DOM element to parse HTML
		const parser = new DOMParser();
		const doc = parser.parseFromString(htmlContent, "text/html");
		const images = doc.querySelectorAll("img");

		if (images.length === 0) return htmlContent;

		let updatedContent = htmlContent;

		// Process each image
		for (const img of images) {
			const src = img.getAttribute("src");

			// Skip if already a URL (not base64) - check for Firebase Storage URLs or external URLs
			if (
				!src ||
				(!src.startsWith("data:") &&
					(src.startsWith("http://") || src.startsWith("https://")))
			) {
				continue;
			}

			// Only process base64 images
			if (src.startsWith("data:")) {
				try {
					const timestamp = Date.now();
					const randomId = Math.random().toString(36).substring(2, 9);
					const extension = src.match(/data:image\/(\w+);/)?.[1] || "png";
					const path = blogId
						? `blogs/${blogId}/content-${timestamp}-${randomId}.${extension}`
						: `blogs/content/content-${timestamp}-${randomId}.${extension}`;

					const firebaseUrl = await uploadImageFromDataUrl(src, path);

					// Replace base64 URL with Firebase Storage URL in content
					updatedContent = updatedContent.replace(src, firebaseUrl);
				} catch (error) {
					console.error("Error uploading content image:", error);
					// Continue with other images even if one fails
				}
			}
		}

		return updatedContent;
	} catch (error) {
		console.error("Error processing content images:", error);
		return htmlContent; // Return original content on error
	}
};

/**
 * Upload all images for a blog (banner + content images)
 * @param {Object} blogData - Blog data object
 * @param {File|null} bannerFile - Banner image file (optional)
 * @param {string} blogId - Blog ID (optional, for existing blogs)
 * @returns {Promise<Object>} Updated blog data with image URLs
 */
export const uploadBlogImages = async (
	blogData,
	bannerFile = null,
	blogId = null
) => {
	try {
		const updatedData = { ...blogData };

		// Upload banner image if provided
		if (bannerFile) {
			updatedData.bannerImage = await uploadBannerImage(bannerFile, blogId);
		}

		// Upload and replace content images
		if (updatedData.content) {
			updatedData.content = await uploadContentImages(
				updatedData.content,
				blogId
			);
		}

		return updatedData;
	} catch (error) {
		console.error("Error uploading blog images:", error);
		throw error;
	}
};
