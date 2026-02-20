import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

/**
 * Recursively scan directory for MDX/MD files
 */
function scanDirectory(dirPath, basePath = CONTENT_DIR) {
	const docs = [];

	if (!fs.existsSync(dirPath)) {
		return docs;
	}

	const entries = fs.readdirSync(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		const relativePath = path.relative(basePath, fullPath);

		if (entry.isDirectory()) {
			// Recursively scan subdirectories
			const subDocs = scanDirectory(fullPath, basePath);
			docs.push(...subDocs);
		} else if (
			entry.isFile() &&
			(entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))
		) {
			// Read frontmatter and content
			const content = fs.readFileSync(fullPath, "utf-8");
			const frontmatter = extractFrontmatter(content);

			// Determine category - if file is directly in basePath, category should be "root"
			let category = path.dirname(relativePath).replace(/\\/g, "/");
			// Normalize "." or empty to "root" for files directly in the base directory
			if (category === "." || category === "" || category === basePath) {
				category = "root";
			}

			docs.push({
				path: relativePath.replace(/\\/g, "/"), // Normalize path separators
				fileName: entry.name,
				category: category,
				title: frontmatter.title || entry.name.replace(/\.(mdx|md)$/, ""),
				description: frontmatter.description || "",
				icon: frontmatter.icon || null,
				order: frontmatter.order || 999,
				lastModified: fs.statSync(fullPath).mtime,
			});
		}
	}

	return docs.sort((a, b) => a.order - b.order);
}

/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content) {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		return {};
	}

	const frontmatterText = match[1];
	const frontmatter = {};

	frontmatterText.split("\n").forEach((line) => {
		const colonIndex = line.indexOf(":");
		if (colonIndex > 0) {
			const key = line.substring(0, colonIndex).trim();
			let value = line.substring(colonIndex + 1).trim();

			// Remove quotes if present
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}

			frontmatter[key] = value;
		}
	});

	return frontmatter;
}

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Ensure content directory exists
		if (!fs.existsSync(CONTENT_DIR)) {
			fs.mkdirSync(CONTENT_DIR, { recursive: true });
		}

		// Get version from query parameter
		const { version } = req.query;

		// If version is provided, scan only that version directory
		const scanPath = version ? path.join(CONTENT_DIR, version) : CONTENT_DIR;
		const basePath = version ? scanPath : CONTENT_DIR;

		// If version is specified and doesn't exist, return empty
		if (version && !fs.existsSync(scanPath)) {
			return res.status(200).json({
				docs: [],
				categories: {},
			});
		}

		const docs = scanDirectory(scanPath, basePath);

		// Group by category
		const categories = {};
		docs.forEach((doc) => {
			// Handle category normalization
			let category = doc.category || "root";

			// Normalize "." or empty string to "root" for files directly in version directory
			if (category === "." || category === "" || category === basePath) {
				category = "root";
			}

			// Remove version prefix from category path if version is specified
			if (version && category.startsWith(version + "/")) {
				category = category.substring(version.length + 1);
			}

			// If category equals version name or is still "." after processing, set to "root"
			if (category === version || category === "." || category === "") {
				category = "root";
			}

			// Normalize path separators
			category = category.replace(/\\/g, "/");

			if (!categories[category]) {
				categories[category] = [];
			}
			categories[category].push(doc);
		});

		return res.status(200).json({
			docs,
			categories,
		});
	} catch (error) {
		console.error("Error listing docs:", error);
		return res.status(500).json({
			error: "Failed to list docs",
			message: error.message,
		});
	}
}
