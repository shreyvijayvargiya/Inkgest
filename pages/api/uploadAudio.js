import { UTApi, UTFile } from "uploadthing/server";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const token = (process.env.UPLOADTHING_SECRET ?? process.env.UPLOADTHING_TOKEN)?.trim();
	if (!token) {
		return res.status(500).json({ error: "UPLOADTHING_SECRET not configured" });
	}

	const { dataUrl, name, type } = req.body ?? {};
	if (!dataUrl || typeof dataUrl !== "string") {
		return res.status(400).json({ error: "Missing dataUrl" });
	}

	try {
		const parts = dataUrl.split(";base64,");
		const b64 = parts[1]?.replace(/\s/g, "");
		if (!b64) return res.status(400).json({ error: "Invalid dataUrl" });

		const mime = type || (parts[0]?.replace(/^data:/i, "") ?? "audio/mpeg");
		const extFromMime = mime.split("/")[1] ?? "mp3";
		const ext = extFromMime.length < 12 ? extFromMime : "mp3";
		const fileName = `${(name || "audio").replace(/[^a-z0-9_-]/gi, "_")}-${Date.now()}.${ext}`;

		const buffer = Buffer.from(b64, "base64");
		const file = new UTFile([buffer], fileName, { type: mime });

		const utapi = new UTApi({ token });
		const result = await utapi.uploadFiles(file);

		if (result?.error) {
			console.error("UploadThing audio error:", result.error);
			return res.status(500).json({ error: result.error.message ?? "Upload failed" });
		}

		const url = result?.data?.ufsUrl ?? result?.data?.url;
		if (!url) return res.status(500).json({ error: "No URL returned" });

		return res.status(200).json({ url });
	} catch (err) {
		console.error("uploadAudio handler error:", err);
		return res.status(500).json({ error: err?.message ?? "Upload failed" });
	}
}
