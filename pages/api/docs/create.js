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
		const { category, fileName, title, description, icon, order } = req.body;

		if (!fileName) {
			return res.status(400).json({ error: "File name is required" });
		}

		// Security: prevent path traversal
		if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
			return res.status(400).json({ error: "Invalid file name" });
		}

		// Ensure .mdx extension
		const sanitizedFileName = fileName.endsWith(".mdx") || fileName.endsWith(".md")
			? fileName
			: `${fileName}.mdx`;

		// Build file path
		const filePath = category
			? `${category}/${sanitizedFileName}`
			: sanitizedFileName;

		const fullPath = path.join(CONTENT_DIR, filePath);
		const dirPath = path.dirname(fullPath);

		// Create directory if it doesn't exist
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}

		// Check if file already exists
		if (fs.existsSync(fullPath)) {
			return res.status(400).json({ error: "File already exists" });
		}

		// Generate frontmatter
		const frontmatter = generateFrontmatter({
			title: title || sanitizedFileName.replace(/\.(mdx|md)$/, ""),
			description: description || "",
			icon: icon || "📄",
			order: order || 999,
		});

		// Default content
		const defaultContent = `# ${title || sanitizedFileName.replace(/\.(mdx|md)$/, "")}\n\nStart writing your documentation here...\n`;

		// Combine frontmatter and content
		const fileContent = frontmatter + defaultContent;

		// Write file
		fs.writeFileSync(fullPath, fileContent, "utf-8");

		return res.status(200).json({
			success: true,
			message: "Document created successfully",
			path: filePath,
		});
	} catch (error) {
		console.error("Error creating doc:", error);
		return res.status(500).json({
			error: "Failed to create doc",
			message: error.message,
		});
	}
}
