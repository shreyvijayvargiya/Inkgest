/**
 * POST /api/generate/[type]
 * Proxies to Hono POST /generate/:type. Uses idToken in JSON body like /api/scrape/url
 * (verify → rate limit → validate → deduct credit → upstream).
 */
import { Readable } from "stream";
import { toGeneratePathType } from "../../../lib/api/generateClient";
import { getInkgestGenerateBackendBase } from "../../../lib/config/generate";
import { checkAndDeductCredit } from "../../../lib/utils/credits";
import { checkRateLimit } from "../../../lib/utils/rateLimit";
import { validateUrls } from "../../../lib/utils/urlAllowlist";
import { verifyFirebaseToken } from "../../../lib/utils/verifyAuth";

const ALLOWED = new Set([
	"blog",
	"image-gallery",
	"infographics",
	"newsletter",
	"table",
	"landing-page",
	"react",
]);

export const config = {
	api: {
		bodyParser: { sizeLimit: "1mb" },
		responseLimit: false,
	},
};

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const rawType = req.query.type;
	const segment = Array.isArray(rawType) ? rawType[0] : rawType;
	const pathType = toGeneratePathType(String(segment || "").toLowerCase());

	if (!ALLOWED.has(pathType)) {
		return res.status(400).json({ error: "Invalid generate type" });
	}

	const {
		idToken,
		urls = [],
		prompt = "",
		format = "substack",
		style = "casual",
	} = req.body || {};

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

	const rateLimit = await checkRateLimit(req, { identifier: verifiedUid });
	if (!rateLimit.allowed) {
		return res.status(429).json({
			error: "Too many requests. Please try again later.",
			retryAfter: rateLimit.resetIn,
		});
	}

	const urlList = Array.isArray(urls)
		? urls.map((u) => String(u || "").trim()).filter(Boolean)
		: [];

	if (urlList.length > 10) {
		return res.status(400).json({ error: "Maximum 10 URLs per request" });
	}

	const promptStr = String(prompt || "").trim();
	if (urlList.length === 0 && !promptStr) {
		return res
			.status(400)
			.json({ error: "Provide at least one URL or a prompt" });
	}

	if (urlList.length > 0) {
		const urlRegex = /^https?:\/\/.+/i;
		if (urlList.some((u) => !urlRegex.test(u))) {
			return res.status(400).json({
				error: "Invalid URL — must start with http:// or https://",
			});
		}
		const urlValidation = validateUrls(urlList);
		if (!urlValidation.valid) {
			return res.status(400).json({ error: urlValidation.error });
		}
	}

	const creditCheck = await checkAndDeductCredit(verifiedUid, 1);
	if (!creditCheck.allowed) {
		return res.status(429).json({ error: creditCheck.error });
	}

	const base = getInkgestGenerateBackendBase();
	const backendUrl = `${base}/generate/${encodeURIComponent(pathType)}`;

	let backendRes;
	try {
		backendRes = await fetch(backendUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${idToken}`,
			},
			body: JSON.stringify({
				urls: urlList,
				prompt: promptStr,
				format,
				style,
			}),
		});
	} catch (err) {
		console.error("[generate proxy fetch]", err);
		return res.status(502).json({
			error: err?.message || "Generate service unreachable",
		});
	}

	const contentType = backendRes.headers.get("content-type") || "";

	if (contentType.includes("text/event-stream") && backendRes.body) {
		res.status(backendRes.status);
		res.setHeader("Content-Type", contentType);
		const cacheControl = backendRes.headers.get("cache-control");
		if (cacheControl) res.setHeader("Cache-Control", cacheControl);

		await new Promise((resolve, reject) => {
			let readable;
			try {
				readable = Readable.fromWeb(backendRes.body);
			} catch (e) {
				reject(e);
				return;
			}
			readable.on("error", (e) => {
				console.error("[generate proxy stream]", e);
				if (!res.writableEnded) res.end();
				reject(e);
			});
			res.on("finish", resolve);
			readable.pipe(res);
		});
		return;
	}

	const buf = await backendRes.arrayBuffer();
	const bodyText = Buffer.from(buf).toString("utf8");

	if (!backendRes.ok) {
		let parsed;
		try {
			parsed = JSON.parse(bodyText);
		} catch {
			parsed = { error: bodyText || `Request failed (${backendRes.status})` };
		}
		return res.status(backendRes.status).json(parsed);
	}

	if (contentType.includes("application/json")) {
		try {
			return res.status(200).json(JSON.parse(bodyText));
		} catch {
			return res.status(200).type("application/json").send(bodyText);
		}
	}

	if (contentType) res.setHeader("Content-Type", contentType);
	return res.status(200).send(bodyText);
}
