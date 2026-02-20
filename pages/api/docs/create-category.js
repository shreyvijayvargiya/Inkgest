import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { categoryName } = req.body;

		if (!categoryName) {
			return res.status(400).json({ error: "Category name is required" });
		}

		// Security: prevent path traversal
		if (categoryName.includes("..") || categoryName.includes("/") || categoryName.includes("\\")) {
			return res.status(400).json({ error: "Invalid category name" });
		}

		// Sanitize category name (remove special characters, keep alphanumeric, hyphens, underscores)
		const sanitizedCategory = categoryName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();

		const categoryPath = path.join(CONTENT_DIR, sanitizedCategory);

		// Check if category already exists
		if (fs.existsSync(categoryPath)) {
			return res.status(400).json({ error: "Category already exists" });
		}

		// Create category directory
		fs.mkdirSync(categoryPath, { recursive: true });

		// Create a default index file
		const indexPath = path.join(categoryPath, "index.mdx");
		const indexContent = `---
title: "${sanitizedCategory}"
description: "Documentation for ${sanitizedCategory}"
icon: "📁"
order: 1
---

# ${sanitizedCategory}

Welcome to the ${sanitizedCategory} documentation section.

`;

		fs.writeFileSync(indexPath, indexContent, "utf-8");

		return res.status(200).json({
			success: true,
			message: "Category created successfully",
			category: sanitizedCategory,
		});
	} catch (error) {
		console.error("Error creating category:", error);
		return res.status(500).json({
			error: "Failed to create category",
			message: error.message,
		});
	}
}
