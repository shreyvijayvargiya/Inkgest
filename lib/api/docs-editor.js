/**
 * Documentation Editor API
 * Handles reading and writing MDX/MD files for documentation
 */

const CONTENT_DIR = process.cwd() + "/content/modules";

/**
 * Get all available versions
 * @returns {Promise<Array>} Array of version names
 */
export const getVersions = async () => {
	try {
		const response = await fetch("/api/docs/versions");
		if (!response.ok) {
			throw new Error("Failed to fetch versions");
		}
		const data = await response.json();
		return data.versions || [];
	} catch (error) {
		console.error("Error getting versions:", error);
		throw error;
	}
};

/**
 * Get all documentation pages
 * Scans the content/modules directory for MDX/MD files
 * @param {string} version - Optional version to filter by
 * @returns {Promise<Array>} Array of doc pages with metadata
 */
export const getAllDocs = async (version = null) => {
	try {
		const url = version 
			? `/api/docs/list?version=${encodeURIComponent(version)}`
			: "/api/docs/list";
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Failed to fetch docs");
		}
		return await response.json();
	} catch (error) {
		console.error("Error getting docs:", error);
		throw error;
	}
};

/**
 * Get a single documentation page by path
 * @param {string} path - File path relative to content/modules (or version directory)
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Doc page with content
 */
export const getDocByPath = async (path, version = null) => {
	try {
		// If version is provided, prepend it to the path
		const fullPath = version ? `${version}/${path}` : path;
		const response = await fetch(
			`/api/docs/read?path=${encodeURIComponent(fullPath)}`
		);
		if (!response.ok) {
			throw new Error("Failed to fetch doc");
		}
		return await response.json();
	} catch (error) {
		console.error("Error getting doc:", error);
		throw error;
	}
};

/**
 * Save or update a documentation page
 * @param {string} path - File path relative to content/modules (or version directory)
 * @param {Object} docData - Document data (title, description, content)
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Success response
 */
export const saveDoc = async (path, docData, version = null) => {
	try {
		// If version is provided, prepend it to the path
		const fullPath = version ? `${version}/${path}` : path;
		const response = await fetch("/api/docs/save", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				path: fullPath,
				...docData,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to save doc");
		}

		return await response.json();
	} catch (error) {
		console.error("Error saving doc:", error);
		throw error;
	}
};

/**
 * Delete a documentation page
 * @param {string} path - File path relative to content/modules (or version directory)
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Success response
 */
export const deleteDoc = async (path, version = null) => {
	try {
		// If version is provided, prepend it to the path
		const fullPath = version ? `${version}/${path}` : path;
		const response = await fetch("/api/docs/delete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ path: fullPath }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete doc");
		}

		return await response.json();
	} catch (error) {
		console.error("Error deleting doc:", error);
		throw error;
	}
};

/**
 * Create a new documentation page
 * @param {string} category - Category name (optional)
 * @param {string} fileName - File name
 * @param {Object} docData - Document data
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Success response
 */
export const createDoc = async (category, fileName, docData = {}, version = null) => {
	try {
		// If version is provided, prepend it to the category
		const fullCategory = version 
			? (category ? `${version}/${category}` : version)
			: category;
		const response = await fetch("/api/docs/create", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				category: fullCategory,
				fileName,
				...docData,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to create doc");
		}

		return await response.json();
	} catch (error) {
		console.error("Error creating doc:", error);
		throw error;
	}
};

/**
 * Create a new category
 * @param {string} categoryName - Category name
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Success response
 */
export const createCategory = async (categoryName, version = null) => {
	try {
		// If version is provided, prepend it to the category name
		const fullCategoryName = version 
			? `${version}/${categoryName}`
			: categoryName;
		const response = await fetch("/api/docs/create-category", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ categoryName: fullCategoryName }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to create category");
		}

		return await response.json();
	} catch (error) {
		console.error("Error creating category:", error);
		throw error;
	}
};

/**
 * Rename a documentation page
 * @param {string} oldPath - Current file path
 * @param {string} newPath - New file path
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Success response
 */
export const renameDoc = async (oldPath, newPath, version = null) => {
	try {
		// If version is provided, prepend it to both paths
		const fullOldPath = version ? `${version}/${oldPath}` : oldPath;
		const fullNewPath = version ? `${version}/${newPath}` : newPath;
		const response = await fetch("/api/docs/rename", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				path: fullOldPath,
				newPath: fullNewPath,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to rename doc");
		}

		return await response.json();
	} catch (error) {
		console.error("Error renaming doc:", error);
		throw error;
	}
};

/**
 * Duplicate a documentation page
 * @param {string} filePath - Source file path
 * @param {string} newPath - New file path for duplicate
 * @param {string} version - Optional version prefix
 * @returns {Promise<Object>} Success response
 */
export const duplicateDoc = async (filePath, newPath, version = null) => {
	try {
		// If version is provided, prepend it to both paths
		const fullFilePath = version ? `${version}/${filePath}` : filePath;
		const fullNewPath = version ? `${version}/${newPath}` : newPath;
		const response = await fetch("/api/docs/duplicate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				path: fullFilePath,
				newPath: fullNewPath,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to duplicate doc");
		}

		return await response.json();
	} catch (error) {
		console.error("Error duplicating doc:", error);
		throw error;
	}
};
