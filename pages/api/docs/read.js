import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

/**
 * Extract frontmatter and content from markdown
 */
function parseMarkdown(content) {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (match) {
		const frontmatterText = match[1];
		const body = match[2];
		const frontmatter = {};

		frontmatterText.split("\n").forEach((line) => {
			const colonIndex = line.indexOf(":");
			if (colonIndex > 0) {
				const key = line.substring(0, colonIndex).trim();
				let value = line.substring(colonIndex + 1).trim();
				
				if ((value.startsWith('"') && value.endsWith('"')) || 
				    (value.startsWith("'") && value.endsWith("'"))) {
					value = value.slice(1, -1);
				}
				
				frontmatter[key] = value;
			}
		});

		return {
			frontmatter,
			content: body,
		};
	}

	return {
		frontmatter: {},
		content,
	};
}

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { path: filePath } = req.query;

		if (!filePath) {
			return res.status(400).json({ error: "Path parameter is required" });
		}

		// Security: prevent path traversal
		if (filePath.includes("..") || filePath.startsWith("/")) {
			return res.status(400).json({ error: "Invalid path" });
		}

		const fullPath = path.join(CONTENT_DIR, filePath);

		if (!fs.existsSync(fullPath)) {
			return res.status(404).json({ error: "File not found" });
		}

		const content = fs.readFileSync(fullPath, "utf-8");
		const { frontmatter, content: body } = parseMarkdown(content);

		return res.status(200).json({
			path: filePath,
			title: frontmatter.title || "",
			description: frontmatter.description || "",
			icon: frontmatter.icon || null,
			order: frontmatter.order || 999,
			content: body,
			frontmatter,
		});
	} catch (error) {
		console.error("Error reading doc:", error);
		return res.status(500).json({
			error: "Failed to read doc",
			message: error.message,
		});
	}
}
