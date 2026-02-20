import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

/**
 * Generate frontmatter string
 */
function generateFrontmatter(data) {
	const frontmatter = [];
	
	if (data.title) frontmatter.push(`title: "${data.title}"`);
	if (data.description) frontmatter.push(`description: "${data.description}"`);
	if (data.icon) frontmatter.push(`icon: "${data.icon}"`);
	if (data.order !== undefined) frontmatter.push(`order: ${data.order}`);

	return frontmatter.length > 0 ? `---\n${frontmatter.join("\n")}\n---\n\n` : "";
}

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { path: filePath, title, description, content, icon, order } = req.body;

		if (!filePath) {
			return res.status(400).json({ error: "Path is required" });
		}

		// Security: prevent path traversal
		if (filePath.includes("..") || filePath.startsWith("/")) {
			return res.status(400).json({ error: "Invalid path" });
		}

		// Ensure .mdx extension if not present
		let normalizedPath = filePath;
		if (!filePath.endsWith(".mdx") && !filePath.endsWith(".md")) {
			normalizedPath = filePath + ".mdx";
		}

		const fullPath = path.join(CONTENT_DIR, normalizedPath);
		const dirPath = path.dirname(fullPath);

		// Create directory if it doesn't exist
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		// Generate frontmatter
		const frontmatter = generateFrontmatter({
			title,
			description,
			icon,
			order,
		});

		// Combine frontmatter and content
		const fileContent = frontmatter + (content || "");

		// Write file synchronously
		try {
			fs.writeFileSync(fullPath, fileContent, "utf-8");
			console.log(`[DOCS] Successfully saved file: ${fullPath}`);
		} catch (writeError) {
			console.error(`[DOCS] Error writing file ${fullPath}:`, writeError);
			throw writeError;
		}

		return res.status(200).json({
			success: true,
			message: "Document saved successfully",
			path: normalizedPath,
		});
	} catch (error) {
		console.error("Error saving doc:", error);
		return res.status(500).json({
			error: "Failed to save doc",
			message: error.message,
		});
	}
}
