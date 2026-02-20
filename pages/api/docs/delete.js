import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { path: filePath } = req.body;

		if (!filePath) {
			return res.status(400).json({ error: "Path is required" });
		}

		// Security: prevent path traversal
		if (filePath.includes("..") || filePath.startsWith("/")) {
			return res.status(400).json({ error: "Invalid path" });
		}

		const fullPath = path.join(CONTENT_DIR, filePath);

		if (!fs.existsSync(fullPath)) {
			return res.status(404).json({ error: "File not found" });
		}

		// Delete file
		fs.unlinkSync(fullPath);

		// Optionally remove empty parent directories
		let currentDir = path.dirname(fullPath);
		while (currentDir !== CONTENT_DIR && fs.existsSync(currentDir)) {
			const files = fs.readdirSync(currentDir);
			if (files.length === 0) {
				fs.rmdirSync(currentDir);
				currentDir = path.dirname(currentDir);
			} else {
				break;
			}
		}

		return res.status(200).json({
			success: true,
			message: "Document deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting doc:", error);
		return res.status(500).json({
			error: "Failed to delete doc",
			message: error.message,
		});
	}
}
