import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

export default async function handler(req, res) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Ensure content directory exists
		if (!fs.existsSync(CONTENT_DIR)) {
			fs.mkdirSync(CONTENT_DIR, { recursive: true });
			return res.status(200).json({ versions: [] });
		}

		// Get all directories in content/modules (these are versions)
		const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
		const versions = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();

		return res.status(200).json({ versions });
	} catch (error) {
		console.error("Error listing versions:", error);
		return res.status(500).json({
			error: "Failed to list versions",
			message: error.message,
		});
	}
}
