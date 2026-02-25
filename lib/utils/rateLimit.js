/**
 * In-memory rate limiter for API routes.
 *
 * Per-IP and per-user limits to prevent abuse.
 * Works per serverless instance; for multi-instance production, consider Upstash Redis.
 *
 * Usage:
 *   const { allowed, remaining, resetIn } = await checkRateLimit(req, { identifier: uid });
 *   if (!allowed) return res.status(429).json({ error: "Too many requests" });
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const IP_LIMIT = 60; // 60 req/min per IP
const USER_LIMIT = 30; // 30 req/min per user (when authenticated)

const ipStore = new Map();
const userStore = new Map();

function prune(store, now) {
	for (const [key, data] of store.entries()) {
		if (data.resetAt < now) store.delete(key);
	}
}

function getOrCreate(store, key, limit) {
	const now = Date.now();
	prune(store, now);

	let data = store.get(key);
	if (!data || data.resetAt < now) {
		data = { count: 0, resetAt: now + WINDOW_MS };
		store.set(key, data);
	}
	data.count += 1;
	const remaining = Math.max(0, limit - data.count);
	const allowed = data.count <= limit;
	return { allowed, remaining, resetIn: Math.ceil((data.resetAt - now) / 1000) };
}

/**
 * Get client IP from request (Vercel, etc.)
 */
export function getClientIp(req) {
	const forwarded = req.headers["x-forwarded-for"];
	if (forwarded) {
		const first = typeof forwarded === "string" ? forwarded.split(",")[0] : forwarded[0];
		return first?.trim() || "unknown";
	}
	return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

/**
 * Check rate limit. Call early in the handler.
 *
 * @param {object} req - Next.js API request
 * @param {object} opts - { identifier?: string } - user ID when authenticated
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export async function checkRateLimit(req, opts = {}) {
	const ip = getClientIp(req);
	const ipResult = getOrCreate(ipStore, ip, IP_LIMIT);
	if (!ipResult.allowed) {
		return {
			allowed: false,
			remaining: 0,
			resetIn: ipResult.resetIn,
		};
	}

	if (opts.identifier) {
		const userResult = getOrCreate(userStore, opts.identifier, USER_LIMIT);
		if (!userResult.allowed) {
			return {
				allowed: false,
				remaining: 0,
				resetIn: userResult.resetIn,
			};
		}
		return {
			allowed: true,
			remaining: Math.min(ipResult.remaining, userResult.remaining),
			resetIn: userResult.resetIn,
		};
	}

	return {
		allowed: true,
		remaining: ipResult.remaining,
		resetIn: ipResult.resetIn,
	};
}
