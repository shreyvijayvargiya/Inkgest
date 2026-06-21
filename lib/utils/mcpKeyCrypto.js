import { createHash, randomBytes } from "crypto";

export function generateMcpApiKey() {
	return `ink_${randomBytes(24).toString("hex")}`;
}

export function hashMcpApiKey(apiKey) {
	return createHash("sha256").update(String(apiKey)).digest("hex");
}

export function mcpKeyPrefix(apiKey) {
	const s = String(apiKey || "");
	if (s.length <= 16) return s;
	return `${s.slice(0, 12)}…${s.slice(-4)}`;
}

export function createMcpKeyId() {
	return `mk_${Date.now()}_${randomBytes(4).toString("hex")}`;
}
