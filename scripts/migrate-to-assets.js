#!/usr/bin/env node
/**
 * Migration script: Copy drafts and tables from root collections to users/{uid}/assets
 *
 * Run with: node scripts/migrate-to-assets.js
 * Requires: Firebase Admin SDK credentials (GOOGLE_APPLICATION_CREDENTIALS or service account)
 *
 * This copies all documents from:
 *   - drafts (where userId exists) -> users/{userId}/assets with type: "draft"
 *   - tables (where userId exists) -> users/{userId}/assets with type: "table"
 *
 * Original collections are NOT deleted. Run this once, then verify data in the app.
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
	admin.initializeApp();
}

const db = admin.firestore();

async function migrate() {
	console.log("Starting migration: drafts + tables -> users/{uid}/assets\n");

	const draftsSnap = await db.collection("drafts").get();
	const tablesSnap = await db.collection("tables").get();

	let draftCount = 0;
	let tableCount = 0;
	const errors = [];

	for (const d of draftsSnap.docs) {
		const data = d.data();
		const userId = data.userId;
		if (!userId) {
			console.warn(`Draft ${d.id} has no userId, skipping`);
			continue;
		}
		try {
			const { userId: _, ...rest } = data;
			await db
				.collection("users")
				.doc(userId)
				.collection("assets")
				.doc(d.id)
				.set({
					type: "draft",
					...rest,
					createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
				});
			draftCount++;
			if (draftCount % 50 === 0) console.log(`  Migrated ${draftCount} drafts...`);
		} catch (e) {
			errors.push({ id: d.id, coll: "drafts", err: e.message });
		}
	}

	for (const d of tablesSnap.docs) {
		const data = d.data();
		const userId = data.userId;
		if (!userId) {
			console.warn(`Table ${d.id} has no userId, skipping`);
			continue;
		}
		try {
			const { userId: _, ...rest } = data;
			await db
				.collection("users")
				.doc(userId)
				.collection("assets")
				.doc(d.id)
				.set({
					type: "table",
					...rest,
					createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
				});
			tableCount++;
			if (tableCount % 50 === 0) console.log(`  Migrated ${tableCount} tables...`);
		} catch (e) {
			errors.push({ id: d.id, coll: "tables", err: e.message });
		}
	}

	console.log(`\nDone. Migrated ${draftCount} drafts and ${tableCount} tables.`);
	if (errors.length > 0) {
		console.error(`\n${errors.length} errors:`);
		errors.slice(0, 10).forEach((e) => console.error(`  ${e.coll}/${e.id}: ${e.err}`));
		if (errors.length > 10) console.error(`  ... and ${errors.length - 10} more`);
	}
}

migrate()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error("Migration failed:", e);
		process.exit(1);
	});
