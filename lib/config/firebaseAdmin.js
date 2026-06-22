/**
 * Firebase Admin — server-only Firestore access (MCP API, migrations, etc.)
 *
 * Set one of:
 *   FIREBASE_SERVICE_ACCOUNT_JSON — raw JSON string of service account
 *   FIREBASE_SERVICE_ACCOUNT_BASE64 — base64-encoded JSON (handy on Vercel)
 *   GOOGLE_APPLICATION_CREDENTIALS — path to JSON file (local dev)
 */

import fs from "fs";
import path from "path";
import { initializeApp, getApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function readInlineJsonEnv(value) {
	const trimmed = String(value || "").trim();
	if (!trimmed.startsWith("{")) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		return null;
	}
}

function resolveCredentialsPath() {
	const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
	if (explicit) return path.resolve(process.cwd(), explicit);
	const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
	if (!gac) return null;
	// File path only — inline JSON in GAC is handled separately (common Vercel mistake).
	const trimmed = gac.trim();
	if (trimmed.startsWith("{")) return null;
	return path.resolve(process.cwd(), trimmed);
}

function parseServiceAccount() {
	const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
	if (b64) {
		return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
	}

	const fromGacJson = readInlineJsonEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS);
	if (fromGacJson) return fromGacJson;

	const credPath = resolveCredentialsPath();
	if (credPath && fs.existsSync(credPath)) {
		return JSON.parse(fs.readFileSync(credPath, "utf8"));
	}

	const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	if (raw) {
		const trimmed = raw.trim();
		if (!trimmed) return null;
		try {
			return JSON.parse(trimmed);
		} catch (e) {
			throw new Error(
				"FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON (single line on Vercel). " +
					"For local dev, use GOOGLE_APPLICATION_CREDENTIALS=./your-service-account.json instead.",
			);
		}
	}

	return null;
}

/** True when Admin SDK can authenticate to Firestore (service account or ADC file). */
export function isFirebaseAdminConfigured() {
	if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim()) return true;
	if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return true;
	if (readInlineJsonEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS)) return true;
	const credPath = resolveCredentialsPath();
	if (credPath && fs.existsSync(credPath)) return true;
	return false;
}

export function getAdminApp() {
	if (getApps().length) return getApp();
	const sa = parseServiceAccount();
	if (sa) {
		initializeApp({
			credential: cert(sa),
			projectId: sa.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		});
	} else if (resolveCredentialsPath()) {
		initializeApp({
			credential: applicationDefault(),
			projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		});
	} else {
		initializeApp({
			projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		});
	}
	return getApp();
}

export function getAdminFirestore() {
	return getFirestore(getAdminApp());
}
