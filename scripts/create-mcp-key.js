#!/usr/bin/env node
/**
 * Create an MCP API key for a Firebase user (CLI / local testing).
 *
 * Usage:
 *   node scripts/create-mcp-key.js <firebase-uid> [key-name]
 *
 * Loads .env.local from project root if present.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.
 */

const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
	const envPath = path.join(__dirname, "..", ".env.local");
	if (!fs.existsSync(envPath)) return;
	for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
		const t = line.trim();
		if (!t || t.startsWith("#")) continue;
		const eq = t.indexOf("=");
		if (eq <= 0) continue;
		const key = t.slice(0, eq).trim();
		let val = t.slice(eq + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (!process.env[key]) process.env[key] = val;
	}
}

loadEnvLocal();
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createHash, randomBytes } = require("crypto");

function parseServiceAccount() {
	const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
	if (b64) {
		return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
	}
	const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	if (credPath) {
		const resolved = path.resolve(process.cwd(), credPath);
		if (fs.existsSync(resolved)) {
			return JSON.parse(fs.readFileSync(resolved, "utf8"));
		}
	}
	const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	if (raw) return JSON.parse(raw);
	return null;
}

function initAdmin() {
	if (getApps().length) return;
	const sa = parseServiceAccount();
	if (sa) {
		initializeApp({ credential: cert(sa), projectId: sa.project_id });
	} else {
		initializeApp();
	}
}

function generateMcpApiKey() {
	return `ink_${randomBytes(24).toString("hex")}`;
}

function hashMcpApiKey(apiKey) {
	return createHash("sha256").update(String(apiKey)).digest("hex");
}

function mcpKeyPrefix(apiKey) {
	const s = String(apiKey);
	return s.length <= 16 ? s : `${s.slice(0, 12)}…${s.slice(-4)}`;
}

async function main() {
	const uid = process.argv[2];
	const name = process.argv[3] || "CLI test key";
	if (!uid) {
		console.error("Usage: node scripts/create-mcp-key.js <firebase-uid> [key-name]");
		process.exit(1);
	}

	initAdmin();
	const db = getFirestore();
	const apiKey = generateMcpApiKey();
	const keyHash = hashMcpApiKey(apiKey);
	const keyId = `mk_${Date.now()}_${randomBytes(4).toString("hex")}`;
	const prefix = mcpKeyPrefix(apiKey);
	const now = FieldValue.serverTimestamp();

	await db.runTransaction(async (tx) => {
		const lookupRef = db.collection("mcp_api_keys").doc(keyHash);
		const lookupDoc = await tx.get(lookupRef);
		if (lookupDoc.exists) throw new Error("Key collision");

		tx.set(db.collection("users").doc(uid).collection("mcpKeys").doc(keyId), {
			name,
			prefix,
			keyHash,
			createdAt: now,
		});
		tx.set(lookupRef, { uid, keyId, name, createdAt: now });
	});

	console.log("\n✓ MCP API key created\n");
	console.log("UID:     ", uid);
	console.log("Name:    ", name);
	console.log("API key: ", apiKey);
	console.log("\nAdd to Claude Desktop MCP config env INKGEST_API_KEY\n");
}

main().catch((e) => {
	console.error(e.message || e);
	process.exit(1);
});
