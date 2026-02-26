/**
 * POST /api/scrape/url
 * Scrapes URL(s) via api.buildsaas.dev/scrap and returns raw markdown + metadata.
 * Accepts: url (single) or urls (array). Uses batch endpoint when multiple URLs.
 * No AI — content goes straight into the editor.
 */
import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrl, validateUrls } from "../../../lib/utils/urlAllowlist";
import { scrapeUrls } from "../../../lib/utils/scrapeApi";

export const config = {
	api: { bodyParser: { sizeLimit: "1mb" } },
};

const extractImages = (links = []) => {
	const imgExts = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i;
	return links
		.filter((l) => {
			const url = typeof l === "string" ? l : l?.url || "";
			return imgExts.test(url);
		})
		.map((l) => (typeof l === "string" ? l : l?.url || ""))
		.filter(Boolean)
		.slice(0, 20);
};

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { url, urls: urlsBody, idToken } = req.body || {};

	// Require a signed Firebase ID token — verified server-side
	if (!idToken) {
		return res
			.status(401)
			.json({ error: "Authentication required. Please sign in." });
	}

	let verifiedUid;
	try {
		verifiedUid = await verifyFirebaseToken(idToken);
	} catch (authErr) {
		return res.status(401).json({ error: authErr.message });
	}

	// Rate limit — per IP and per user
	const rateLimit = await checkRateLimit(req, { identifier: verifiedUid });
	if (!rateLimit.allowed) {
		return res.status(429).json({
			error: "Too many requests. Please try again later.",
			retryAfter: rateLimit.resetIn,
		});
	}

	// Credit gate — 5 free scrapes per month; Pro = unlimited
	const creditCheck = await checkAndDeductCredit(verifiedUid, 1);
	if (!creditCheck.allowed) {
		return res.status(429).json({ error: creditCheck.error });
	}

	const urlList =
		Array.isArray(urlsBody) && urlsBody.length > 0
			? urlsBody.map((u) => String(u || "").trim()).filter(Boolean)
			: url && String(url).trim()
				? [String(url).trim()]
				: [];

	if (urlList.length === 0) {
		return res.status(400).json({ error: "URL or urls array is required" });
	}
	if (urlList.length > 10) {
		return res.status(400).json({ error: "Maximum 10 URLs per request" });
	}

	const urlRegex = /^https?:\/\/.+/i;
	if (urlList.some((u) => !urlRegex.test(u))) {
		return res
			.status(400)
			.json({ error: "Invalid URL — must start with http:// or https://" });
	}

	// SSRF protection — block localhost, private IPs, file://
	const urlValidation =
		urlList.length === 1 ? validateUrl(urlList[0]) : validateUrls(urlList);
	if (!urlValidation.valid) {
		return res.status(400).json({ error: urlValidation.error });
	}

	try {
		const scraped = await scrapeUrls({
			urls: urlList,
			apiKey: "apiKey",
		});

		if (scraped.sources.length === 0) {
			return res.status(422).json({
				error: "Could not extract content from the URL(s)",
				details: scraped.scrapeErrors,
			});
		}

		// Combine content from all sources
		const content = scraped.sources
			.map((s, i) => {
				const titleLine = s.title ? `# ${s.title}\n\n` : "";
				return `--- Source ${i + 1}: ${s.url} ---\n\n${titleLine}${s.markdown}\n`;
			})
			.join("\n\n");
		const title = scraped.sources[0]?.title || urlList[0] || "Scraped";
		const allLinks = scraped.sources.flatMap((s) => s.links || []);
		const images = extractImages(allLinks);

		return res.status(200).json({
			success: true,
			content,
			title,
			images,
			url: urlList[0],
			urls: urlList,
		});
	} catch (error) {
		console.error("[scrape/url]", error);
		return res.status(500).json({ error: error?.message || "Scrape failed" });
	}
}
