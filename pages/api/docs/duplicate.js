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

				if (
					(value.startsWith('"') && value.endsWith('"')) ||
					(value.startsWith("'") && value.endsWith("'"))
				) {
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
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { path: filePath, newPath } = req.body;

		if (!filePath || !newPath) {
			return res.status(400).json({ error: "Path and newPath are required" });
		}

		// Security: prevent path traversal
		if (
			filePath.includes("..") ||
			filePath.startsWith("/") ||
			newPath.includes("..") ||
			newPath.startsWith("/")
		) {
			return res.status(400).json({ error: "Invalid path" });
		}

		const sourcePath = path.join(CONTENT_DIR, filePath);
		const destPath = path.join(CONTENT_DIR, newPath);

		// Check if source file exists
		if (!fs.existsSync(sourcePath)) {
			return res.status(404).json({ error: "Source file not found" });
		}

		// Check if destination file already exists
		if (fs.existsSync(destPath)) {
			return res.status(400).json({ error: "Destination file already exists" });
		}

		// Read source file
		const sourceContent = fs.readFileSync(sourcePath, "utf-8");
		const { frontmatter, content } = parseMarkdown(sourceContent);

		// Update title in frontmatter for duplicate
		const newTitle = frontmatter.title
			? `${frontmatter.title} (Copy)`
			: path.basename(newPath, path.extname(newPath));

		// Generate new frontmatter
		const newFrontmatter = generateFrontmatter({
			title: newTitle,
			description: frontmatter.description || "",
			icon: frontmatter.icon || "📄",
			order: frontmatter.order || 999,
		});

		// Create directory if it doesn't exist
		const destDirPath = path.dirname(destPath);
		if (!fs.existsSync(destDirPath)) {
			fs.mkdirSync(destDirPath, { recursive: true });
		}

		// Write duplicate file
		const newContent = newFrontmatter + content;
		fs.writeFileSync(destPath, newContent, "utf-8");

		return res.status(200).json({
			success: true,
			message: "File duplicated successfully",
			path: newPath,
		});
	} catch (error) {
		console.error("Error duplicating doc:", error);
		return res.status(500).json({
			error: "Failed to duplicate doc",
			message: error.message,
		});
	}
}
