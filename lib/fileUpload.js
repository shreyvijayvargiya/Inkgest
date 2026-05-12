"use server";

import { UTApi, UTFile } from "uploadthing/server";

function extractDataImageUrls(content) {
	const urls = [];
	const marker = "data:image/";
	let idx = 0;
	while ((idx = content.indexOf(marker, idx)) !== -1) {
		const semi = content.indexOf(";base64,", idx);
		if (semi === -1) {
			idx += marker.length;
			continue;
		}
		const b64Start = semi + ";base64,".length;
		let end = b64Start;
		while (end < content.length) {
			const c = content[end];
			if (/[A-Za-z0-9+/]/.test(c)) {
				end++;
				continue;
			}
			if (c === "=") {
				end++;
				continue;
			}
			break;
		}
		urls.push(content.slice(idx, end));
		idx = end;
	}
	return [...new Set(urls)];
}

function publicUrlFromResult(data) {
	if (!data) return null;
	return data.ufsUrl ?? data.url ?? null;
}

/**
 * Uploads inline data-URL images to UploadThing and rewrites the string to hosted URLs.
 * Requires UPLOADTHING_TOKEN (v7). No-op if the token is missing or there are no data URLs.
 *
 * @param {string} content HTML or markdown containing data:image/...;base64,... segments
 * @returns {Promise<string>}
 */
export async function uploadInlineImagesToUploadThing(content) {
	if (!content || typeof content !== "string") return content;

	const token = process.env.UPLOADTHING_TOKEN?.trim();
	if (!token) return content;

	const dataUrls = extractDataImageUrls(content);
	if (dataUrls.length === 0) return content;

	const utapi = new UTApi({ token });
	let updated = content;

	for (const dataUrl of dataUrls) {
		try {
			const parts = dataUrl.split(";base64,");
			const b64Part = parts[1]?.replace(/\s/g, "") ?? "";
			if (!b64Part) continue;

			const header = dataUrl.slice(0, dataUrl.indexOf(";base64,"));
			const mime = header.replace(/^data:/i, "") || "image/png";
			const extFromMime = mime.includes("/")
				? mime.split("/")[1].replace("svg+xml", "svg")
				: "png";
			const ext =
				extFromMime && extFromMime.length < 12 ? extFromMime : "png";

			const buffer = Buffer.from(b64Part, "base64");
			const name = `ink-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
			const file = new UTFile([buffer], name, { type: mime });

			const res = await utapi.uploadFiles(file);
			const url = publicUrlFromResult(res?.data);
			if (res?.error || !url) {
				console.error("UploadThing inline image failed:", res?.error);
				continue;
			}
			updated = updated.split(dataUrl).join(url);
		} catch (e) {
			console.error("UploadThing inline image error:", e);
		}
	}

	return updated;
}
