import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

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

		const oldFullPath = path.join(CONTENT_DIR, filePath);
		const newFullPath = path.join(CONTENT_DIR, newPath);

		// Check if old file exists
		if (!fs.existsSync(oldFullPath)) {
			return res.status(404).json({ error: "File not found" });
		}

		// Check if new file already exists
		if (fs.existsSync(newFullPath)) {
			return res.status(400).json({ error: "File with new name already exists" });
		}

		// Create directory if it doesn't exist
		const newDirPath = path.dirname(newFullPath);
		if (!fs.existsSync(newDirPath)) {
			fs.mkdirSync(newDirPath, { recursive: true });
		}

		// Rename file
		fs.renameSync(oldFullPath, newFullPath);

		return res.status(200).json({
			success: true,
			message: "File renamed successfully",
			path: newPath,
		});
	} catch (error) {
		console.error("Error renaming doc:", error);
		return res.status(500).json({
			error: "Failed to rename doc",
			message: error.message,
		});
	}
}
