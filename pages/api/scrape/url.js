/**
 * POST /api/scrape/url
 * Scrapes a URL via Firecrawl and returns the raw markdown + metadata.
 * No AI — content goes straight into the editor.
 */

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

	const { url, userId } = req.body || {};

	if (!userId || !userId.trim()) {
		return res.status(401).json({ error: "Authentication required" });
	}

	if (!url || !url.trim()) {
		return res.status(400).json({ error: "URL is required" });
	}

	const urlRegex = /^https?:\/\/.+/i;
	if (!urlRegex.test(url.trim())) {
		return res.status(400).json({ error: "Invalid URL — must start with http:// or https://" });
	}

	const firecrawlKey = process.env.FIRECRAWL_API_KEY;
	if (!firecrawlKey) {
		return res.status(500).json({ error: "Firecrawl API key not configured" });
	}

	try {
		const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${firecrawlKey}`,
			},
			body: JSON.stringify({
				url: url.trim(),
				formats: ["markdown", "links"],
				onlyMainContent: false,
			}),
		});

		const scrapeData = await scrapeRes.json();

		if (!scrapeRes.ok) {
			throw new Error(scrapeData?.error || `Firecrawl scrape failed (${scrapeRes.status})`);
		}

		const content = scrapeData?.data?.markdown || "";
		const title = scrapeData?.data?.metadata?.title || url.trim();
		const links = scrapeData?.data?.links || [];
		const images = extractImages(links);

		if (!content.trim()) {
			return res.status(422).json({ error: "Could not extract content from this URL" });
		}

		return res.status(200).json({
			success: true,
			content,
			title,
			images,
			url: url.trim(),
		});
	} catch (error) {
		console.error("[scrape/url]", error);
		return res.status(500).json({ error: error?.message || "Scrape failed" });
	}
}
