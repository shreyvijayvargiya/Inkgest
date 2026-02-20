function isPrivateHostname(hostname) {
	const h = (hostname || "").toLowerCase();
	if (!h) return true;
	if (h === "localhost" || h.endsWith(".localhost")) return true;
	if (h === "0.0.0.0" || h === "127.0.0.1") return true;
	// Block common private ranges by hostname if user passes raw IP
	if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
		const parts = h.split(".").map((p) => Number(p));
		if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
		const [a, b] = parts;
		if (a === 10) return true;
		if (a === 127) return true;
		if (a === 169 && b === 254) return true;
		if (a === 192 && b === 168) return true;
		if (a === 172 && b >= 16 && b <= 31) return true;
	}
	return false;
}

function safeParseJson(text) {
	if (!text) return {};
	try {
		const parsed = JSON.parse(text);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return null;
	}
}

function clampString(s, maxLen) {
	const str = typeof s === "string" ? s : String(s ?? "");
	return str.length > maxLen
		? `${str.slice(0, maxLen)}\n...[truncated]...`
		: str;
}

export default async function handler(req, res) {
	if (req.method !== "POST")
		return res.status(405).json({ error: "Method not allowed" });

	try {
		const {
			method,
			url,
			headersJson,
			paramsJson,
			bodyText,
			authType,
			bearerToken,
			apiKeyName,
			apiKeyValue,
			apiKeyIn,
		} = req.body || {};

		const httpMethod = String(method || "GET").toUpperCase();
		if (!["GET", "POST"].includes(httpMethod)) {
			return res
				.status(400)
				.json({ error: "Only GET/POST are supported right now" });
		}

		const rawUrl = String(url || "").trim();
		if (!rawUrl) return res.status(400).json({ error: "Missing url" });

		let parsedUrl;
		try {
			parsedUrl = new URL(rawUrl);
		} catch {
			return res.status(400).json({ error: "Invalid url" });
		}

		if (parsedUrl.protocol !== "https:") {
			return res.status(400).json({ error: "Only https URLs are allowed" });
		}
		if (isPrivateHostname(parsedUrl.hostname)) {
			return res
				.status(400)
				.json({ error: "Private/localhost URLs are not allowed" });
		}

		const params = safeParseJson(paramsJson);
		if (params === null) {
			return res.status(400).json({ error: "paramsJson must be valid JSON" });
		}
		Object.entries(params).forEach(([k, v]) => {
			if (v === undefined || v === null) return;
			parsedUrl.searchParams.set(String(k), String(v));
		});

		const headers = safeParseJson(headersJson);
		if (headers === null) {
			return res.status(400).json({ error: "headersJson must be valid JSON" });
		}

		const finalHeaders = {
			"User-Agent": "Inkgest-Workflow-Automations/1.0",
			...Object.fromEntries(
				Object.entries(headers).map(([k, v]) => [String(k), String(v)]),
			),
		};

		// Auth options
		const auth = String(authType || "none");
		if (auth === "bearer") {
			const token = String(bearerToken || "").trim();
			if (!token)
				return res.status(400).json({ error: "Missing bearer token" });
			finalHeaders.Authorization = `Bearer ${token}`;
		} else if (auth === "apiKey") {
			const name = String(apiKeyName || "").trim();
			const value = String(apiKeyValue || "").trim();
			const where = String(apiKeyIn || "header");
			if (!name || !value) {
				return res.status(400).json({ error: "Missing api key name/value" });
			}
			if (where === "query") {
				parsedUrl.searchParams.set(name, value);
			} else {
				finalHeaders[name] = value;
			}
		}

		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);

		const init = {
			method: httpMethod,
			headers: finalHeaders,
			signal: controller.signal,
		};

		if (httpMethod === "POST") {
			const body = String(bodyText || "");
			init.body = body;
			if (!finalHeaders["Content-Type"]) {
				finalHeaders["Content-Type"] = "application/json";
			}
		}

		const response = await fetch(parsedUrl.toString(), init).finally(() =>
			clearTimeout(timeout),
		);
		const text = await response.text();

		const responseHeaders = {};
		for (const [k, v] of response.headers.entries()) {
			// keep a small subset / size
			if (Object.keys(responseHeaders).length > 50) break;
			responseHeaders[k] = v;
		}

		return res.status(200).json({
			success: true,
			request: {
				method: httpMethod,
				url: parsedUrl.toString(),
			},
			response: {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
				bodyText: clampString(text, 20000),
			},
		});
	} catch (error) {
		const msg =
			error?.name === "AbortError" ? "Request timed out" : error?.message;
		console.error("HTTP request node error:", error);
		return res.status(500).json({ error: msg || "Request failed" });
	}
}
