/**
 * Video generation — no LLM, no Firecrawl re-scraping.
 *
 * Pipeline:
 *  1. Receive images[] + content + title from the frontend (already stored on the draft)
 *  2. Generate narration audio via msedge-tts (reads first ~400 chars of draft content)
 *  3. Render Remotion slideshow: one image per slide, Ken Burns effect, audio track
 *  4. Upload mp4 to UploadThing
 *  5. Save metadata to Firestore + backlink draft
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { db } from "../../../lib/config/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { UTApi } from "uploadthing/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import path from "path";
import os from "os";
import fs from "fs/promises";

const utapi = new UTApi({ token: process.env.UPLOADTHING_SECRET });

/* ── Upload any buffer to UploadThing ── */
async function uploadFile({ buffer, filename, contentType }) {
	const file = new File([buffer], filename, { type: contentType });
	const response = await utapi.uploadFiles(file);
	if (response.error) throw new Error(response.error.message || "UploadThing upload failed");
	return response.data.url;
}

/* ── TTS: read draft content aloud via Edge TTS (free, no key) ── */
async function generateAudio({ title, content }) {
	// Narrate title + first meaningful paragraph of content (strip markdown)
	const plainText = content
		.replace(/!\[.*?\]\(.*?\)/g, "") // strip images
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // flatten links
		.replace(/#{1,6}\s/g, "") // strip headings
		.replace(/[*_`>]/g, "") // strip formatting
		.replace(/\s+/g, " ")
		.trim();

	const narration = `${title}. ${plainText}`.slice(0, 500);

	const tts = new MsEdgeTTS();
	await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

	const tempFile = path.join(os.tmpdir(), `tts-${Date.now()}.mp3`);
	await tts.toFile(tempFile, narration);
	const buffer = await fs.readFile(tempFile);
	await fs.unlink(tempFile).catch(() => {});
	return buffer;
}

/* ── Remotion: render slideshow mp4 ── */
async function renderSlideshow({ images, title, audioUrl }) {
	const tempDir = path.join(os.tmpdir(), `video-${Date.now()}`);
	await fs.mkdir(tempDir, { recursive: true });

	try {
		// Each image gets equal screen time; minimum 3s per slide, cap at 8s
		const perSlide = Math.min(8, Math.max(3, Math.floor(40 / Math.max(images.length, 1))));
		const totalDuration = images.length * perSlide;
		const durationInFrames = Math.ceil(totalDuration * 30);

		const bundleLocation = await bundle({
			entryPoint: path.join(process.cwd(), "remotion/index.ts"),
			webpackOverride: (config) => config,
		});

		const inputProps = {
			images,
			title,
			audioUrl: audioUrl || "",
			perSlide,
		};

		const composition = await selectComposition({
			serveUrl: bundleLocation,
			id: "VideoComposition",
			inputProps,
		});

		const outputPath = path.join(tempDir, "output.mp4");

		await renderMedia({
			composition,
			serveUrl: bundleLocation,
			codec: "h264",
			outputLocation: outputPath,
			inputProps,
			concurrency: 4,
			frameRange: [0, durationInFrames - 1],
		});

		const videoBuffer = await fs.readFile(outputPath);
		return { videoBuffer, tempDir };
	} catch (err) {
		await fs.rm(tempDir, { recursive: true, force: true });
		throw err;
	}
}

/* ── Firestore: save video doc + backlink draft ── */
async function saveVideoDoc({ videoUrl, audioUrl, title, userId, draftId }) {
	const docRef = await addDoc(collection(db, "videos"), {
		videoUrl,
		audioUrl: audioUrl || "",
		title,
		userId: userId || "anonymous",
		draftId: draftId || null,
		createdAt: serverTimestamp(),
		status: "completed",
	});

	if (draftId) {
		try {
			await updateDoc(doc(db, "drafts", draftId), {
				videoUrl,
				videoDocId: docRef.id,
			});
		} catch (e) {
			console.warn("[video] Failed to backlink draft:", e?.message);
		}
	}

	return docRef.id;
}

/* ── Handler ── */
export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { images, title, content, userId, draftId } = req.body || {};

		if (!userId || typeof userId !== "string" || !userId.trim()) {
			return res.status(401).json({ error: "Authentication required." });
		}
		if (!content || !content.trim()) {
			return res.status(400).json({ error: "Content is required" });
		}
		if (!Array.isArray(images) || images.length === 0) {
			return res.status(400).json({ error: "At least one image is required to generate a slideshow video" });
		}

		// Valid HTTPS image URLs only
		const validImages = images
			.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
			.slice(0, 15);

		if (validImages.length === 0) {
			return res.status(400).json({ error: "No valid image URLs found" });
		}

		// Step 1 — Generate narration audio from draft content (Edge TTS, free)
		let audioUrl = null;
		console.log("[video] Step 1: generating narration from draft content");
		try {
			const audioBuffer = await generateAudio({ title: title || "Draft", content });
			const audioFilename = `${Date.now()}-audio.mp3`;
			audioUrl = await uploadFile({ buffer: audioBuffer, filename: audioFilename, contentType: "audio/mpeg" });
			console.log("[video] Audio ready:", audioUrl);
		} catch (e) {
			console.warn("[video] Audio skipped:", e?.message);
		}

		// Step 2 — Render slideshow with Remotion
		console.log(`[video] Step 2: rendering slideshow (${validImages.length} images)`);
		const { videoBuffer, tempDir } = await renderSlideshow({
			images: validImages,
			title: title || "Draft",
			audioUrl,
		});

		// Step 3 — Upload mp4
		console.log("[video] Step 3: uploading video");
		const videoFilename = `${Date.now()}-${(title || "draft").replace(/[^a-z0-9]/gi, "-").slice(0, 40)}.mp4`;
		const videoUrl = await uploadFile({ buffer: videoBuffer, filename: videoFilename, contentType: "video/mp4" });

		// Step 4 — Save metadata + backlink draft
		console.log("[video] Step 4: saving metadata");
		const docId = await saveVideoDoc({ videoUrl, audioUrl, title: title || "Draft", userId, draftId });

		await fs.rm(tempDir, { recursive: true, force: true });

		return res.status(200).json({
			success: true,
			videoUrl,
			audioUrl,
			docId,
			title: title || "Draft",
			slideCount: validImages.length,
		});
	} catch (error) {
		console.error("[video] error:", error);
		return res.status(500).json({ error: error?.message || "Failed to generate video" });
	}
}
