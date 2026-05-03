/**
 * Composio integrations — calls Hono API (same base as /generate).
 *
 * Routes under `integrations/composio/*` expect `Authorization: Bearer <API JWT>`
 * minted via POST /api-token/create (Firebase ID token in Authorization for that step only).
 */

/** @typedef {"notion" | "googledocs"} ComposioPlatform */

export function getComposioApiBase() {
	const raw =
		process.env.NEXT_PUBLIC_INKGEST_GENERATE_URL || "http://localhost:3002";
	return String(raw).replace(/\/$/, "");
}

function jsonHeaders(apiJwt) {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${apiJwt}`,
	};
}

async function parseJsonSafe(res) {
	try {
		return await res.json();
	} catch {
		return {};
	}
}

/** Decode JWT payload (no verify) — for client-side TTL cache only. */
function jwtPayloadExpMs(jwt) {
	if (!jwt || typeof jwt !== "string") return 0;
	const part = jwt.split(".")[1];
	if (!part) return 0;
	const pad = "=".repeat((4 - (part.length % 4)) % 4);
	const b64 = part.replace(/-/g, "+").replace(/_/g, "/") + pad;
	try {
		const json = JSON.parse(atob(b64));
		return (typeof json.exp === "number" ? json.exp : 0) * 1000;
	} catch {
		return 0;
	}
}

function pickJwtFromPayload(data) {
	if (!data || typeof data !== "object") return "";
	return (
		data.token ||
		data.jwt ||
		data.accessToken ||
		data.access_token ||
		data.data?.token ||
		data.data?.jwt ||
		""
	);
}

let jwtCache = {
	firebaseToken: null,
	firestoreUserId: null,
	apiJwt: null,
	expiresAtMs: 0,
};

/**
 * Exchange Firebase ID token for Hono integration JWT (minted with API JWT_SECRET).
 * Sends Firestore user id in the JSON body (backend uses `users/{userId}`).
 * @param {string} firebaseIdToken
 * @param {string} firestoreUserId Firebase Auth uid / Firestore `users` doc id
 */
export async function createIntegrationApiJwt(firebaseIdToken, firestoreUserId) {
	if (!firebaseIdToken?.trim?.()) {
		throw new Error("Sign in required");
	}
	if (!firestoreUserId || String(firestoreUserId).trim() === "") {
		throw new Error("userId is required for API token");
	}
	const url = `${getComposioApiBase()}/api-token/create`;
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${firebaseIdToken}`,
		},
		body: JSON.stringify({
			userId: String(firestoreUserId).trim(),
		}),
	});
	const data = await parseJsonSafe(res);
	if (!res.ok) {
		throw new Error(
			data.error ||
				data.message ||
				`Failed to mint API token (${res.status})`,
		);
	}
	const jwt = pickJwtFromPayload(data);
	if (!jwt) throw new Error("API token missing in /api-token/create response");
	return jwt;
}

/**
 * Cached API JWT — refreshes ~1 min before exp or when Firebase token / user changes.
 * @param {string} firebaseIdToken
 * @param {string} firestoreUserId
 */
export async function getIntegrationApiJwt(firebaseIdToken, firestoreUserId) {
	const slackMs = 60_000;
	const now = Date.now();
	if (
		jwtCache.firebaseToken === firebaseIdToken &&
		jwtCache.firestoreUserId === String(firestoreUserId).trim() &&
		jwtCache.apiJwt &&
		jwtCache.expiresAtMs > now + slackMs
	) {
		return jwtCache.apiJwt;
	}
	const apiJwt = await createIntegrationApiJwt(firebaseIdToken, firestoreUserId);
	const fromJwt = jwtPayloadExpMs(apiJwt);
	const expiresAtMs =
		fromJwt > now ? fromJwt : now + 4 * 60 * 1000;
	jwtCache = {
		firebaseToken: firebaseIdToken,
		firestoreUserId: String(firestoreUserId).trim(),
		apiJwt,
		expiresAtMs,
	};
	return apiJwt;
}

export async function clearIntegrationJwtCache() {
	jwtCache = {
		firebaseToken: null,
		firestoreUserId: null,
		apiJwt: null,
		expiresAtMs: 0,
	};
}

/**
 * @param {string} firebaseIdToken Firebase token (exchange happens internally).
 * @param {{ platform: string, userId: string, callbackUrl?: string } & Record<string, unknown>} body `userId` is required by the API for OAuth.
 */
export async function postComposioOAuthLink(firebaseIdToken, body) {
	if (!body?.userId || String(body.userId).trim() === "") {
		throw new Error("userId is required");
	}
	const firestoreUserId = String(body.userId).trim();
	const apiJwt = await getIntegrationApiJwt(firebaseIdToken, firestoreUserId);
	const url = `${getComposioApiBase()}/integrations/composio/oauth-link`;
	const res = await fetch(url, {
		method: "POST",
		headers: jsonHeaders(apiJwt),
		body: JSON.stringify({
			...body,
			userId: String(body.userId).trim(),
		}),
	});
	const data = await parseJsonSafe(res);
	if (!res.ok) {
		throw new Error(
			data.error || data.message || `OAuth link failed (${res.status})`,
		);
	}
	return data;
}

/**
 * @param {string} firestoreUserId Firebase Auth uid (must match JWT / Firestore user)
 */
export async function postComposioConnection(firebaseIdToken, firestoreUserId, body) {
	if (!firestoreUserId || String(firestoreUserId).trim() === "") {
		throw new Error("userId is required");
	}
	const apiJwt = await getIntegrationApiJwt(
		firebaseIdToken,
		String(firestoreUserId).trim(),
	);
	const url = `${getComposioApiBase()}/integrations/composio/connection`;
	const res = await fetch(url, {
		method: "POST",
		headers: jsonHeaders(apiJwt),
		body: JSON.stringify(body),
	});
	const data = await parseJsonSafe(res);
	if (!res.ok) {
		throw new Error(
			data.error ||
				data.message ||
				`Connection save failed (${res.status})`,
		);
	}
	return data;
}

/**
 * @param {string} firebaseIdToken Firebase token (exchange happens internally).
 */
export async function getComposioConnection(
	firebaseIdToken,
	firestoreUserId,
	platform,
) {
	if (!firestoreUserId || String(firestoreUserId).trim() === "") {
		throw new Error("userId is required");
	}
	const apiJwt = await getIntegrationApiJwt(
		firebaseIdToken,
		String(firestoreUserId).trim(),
	);
	const p = encodeURIComponent(platform);
	const url = `${getComposioApiBase()}/integrations/composio/connection/${p}`;
	const res = await fetch(url, {
		method: "GET",
		headers: { Authorization: `Bearer ${apiJwt}` },
	});
	if (res.status === 404) return null;
	const data = await parseJsonSafe(res);
	if (!res.ok) {
		throw new Error(
			data.error || data.message || `Connection check failed (${res.status})`,
		);
	}
	return data;
}

export async function deleteComposioConnection(
	firebaseIdToken,
	firestoreUserId,
	platform,
) {
	if (!firestoreUserId || String(firestoreUserId).trim() === "") {
		throw new Error("userId is required");
	}
	const apiJwt = await getIntegrationApiJwt(
		firebaseIdToken,
		String(firestoreUserId).trim(),
	);
	const p = encodeURIComponent(platform);
	const url = `${getComposioApiBase()}/integrations/composio/connection/${p}`;
	const res = await fetch(url, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${apiJwt}` },
	});
	const data = await parseJsonSafe(res);
	if (!res.ok && res.status !== 404) {
		throw new Error(
			data.error || data.message || `Disconnect failed (${res.status})`,
		);
	}
	return data;
}

export async function postComposioPush(firebaseIdToken, firestoreUserId, body) {
	if (!firestoreUserId || String(firestoreUserId).trim() === "") {
		throw new Error("userId is required");
	}
	const apiJwt = await getIntegrationApiJwt(
		firebaseIdToken,
		String(firestoreUserId).trim(),
	);
	const url = `${getComposioApiBase()}/integrations/composio/push`;
	const res = await fetch(url, {
		method: "POST",
		headers: jsonHeaders(apiJwt),
		body: JSON.stringify(body),
	});
	const data = await parseJsonSafe(res);
	if (!res.ok) {
		throw new Error(data.error || data.message || `Push failed (${res.status})`);
	}
	return data;
}

const URL_HINT_KEYS = [
	"display_url",
	"displayUrl",
	"url",
	"link",
	"href",
	"alternateLink",
	"alternate_link",
	"pageUrl",
	"documentUrl",
	"webviewLink",
	"webViewLink",
	"permalink",
	"publicUrl",
	"notionUrl",
	"notion_url",
	"page_url",
	"document_url",
];

const ID_HINT_KEYS = [
	"documentId",
	"document_id",
	"pageId",
	"page_id",
	"id",
	"fileId",
	"file_id",
];

function isHttpUrl(s) {
	return typeof s === "string" && /^https?:\/\//i.test(s.trim());
}

function pickUrlAndId(obj) {
	if (!obj || typeof obj !== "object") return { url: "", documentId: "" };
	let url = "";
	let documentId = "";
	for (const k of URL_HINT_KEYS) {
		if (isHttpUrl(obj[k])) {
			url = String(obj[k]).trim();
			break;
		}
	}
	for (const k of ID_HINT_KEYS) {
		const v = obj[k];
		let s =
			typeof v === "string"
				? v.trim()
				: typeof v === "number" && Number.isFinite(v)
					? String(v)
					: "";
		if (s && !isHttpUrl(s)) {
			documentId = s;
			break;
		}
	}
	return { url, documentId };
}

function collectObjects(root) {
	if (!root || typeof root !== "object") return [];
	const seen = new Set();
	const nested = [];
	const add = (x) => {
		if (
			x &&
			typeof x === "object" &&
			!Array.isArray(x) &&
			!seen.has(x)
		) {
			seen.add(x);
			nested.push(x);
		}
	};

	add(root);
	add(root.data);
	add(root.result);
	add(root.results);
	add(root.payload);
	add(root.output);
	add(root.response);
	add(root.toolResponse);
	add(root.meta);
	add(root.body);

	/* Envelope: { success, result: { data: { display_url, documentId } } } (Composio / Google Docs) */
	const r = root.result;
	if (r && typeof r === "object") {
		add(r);
		if (r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
			add(r.data);
		}
	}

	return nested;
}

/**
 * Infer open-in-browser URL when API returns only an id (Composio / tool shapes vary).
 * @param {"notion" | "googledocs" | string} platform
 * @param {string} documentId
 */
export function inferExportDocUrl(platform, documentId) {
	const id = String(documentId || "").trim();
	if (!id) return "";
	if (platform === "googledocs") {
		return `https://docs.google.com/document/d/${id}/edit`;
	}
	return "";
}

/** Extract outbound URL / doc id from push response (backend / Composio shapes may vary). */
export function normalizePushResponse(data) {
	let url = "";
	let documentId = "";
	for (const obj of collectObjects(data)) {
		const p = pickUrlAndId(obj);
		if (p.url) url = p.url;
		if (p.documentId) documentId = p.documentId;
	}
	/* Array payloads e.g. { data: [ { url } ] } */
	if (!url && Array.isArray(data?.data)) {
		for (const row of data.data) {
			const p = pickUrlAndId(row);
			if (p.url) url = p.url;
			if (p.documentId && !documentId) documentId = p.documentId;
		}
	}
	return {
		url: String(url || "").trim(),
		documentId: String(documentId || "").trim(),
	};
}
