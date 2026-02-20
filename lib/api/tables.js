/**
 * Client helpers for Firestore table management.
 * Creates collections in Firestore that act as "tables" with schema metadata.
 */

import { db } from "../config/firebase";
import {
	collection,
	doc,
	setDoc,
	getDoc,
	getDocs,
	deleteDoc,
	query,
	orderBy,
	limit,
	updateDoc,
	serverTimestamp,
} from "firebase/firestore";

// Collection name to store table schemas/metadata
const TABLES_META_COLLECTION = "_tables_meta";

// System collections used by the app with their metadata
const SYSTEM_COLLECTIONS = [
	{
		name: "blogs",
		description: "Blog posts and articles",
		isSystem: true,
		icon: "FileText",
		columns: [
			{ name: "title", type: "text", required: true },
			{ name: "content", type: "text", required: true },
			{ name: "slug", type: "text", required: true },
			{ name: "status", type: "text", required: false },
			{ name: "author", type: "text", required: false },
			{ name: "tags", type: "array", required: false },
			{ name: "createdAt", type: "date", required: false },
			{ name: "updatedAt", type: "date", required: false },
		],
	},
	{
		name: "emails",
		description: "Email templates and campaigns",
		isSystem: true,
		icon: "Mail",
		columns: [
			{ name: "subject", type: "text", required: true },
			{ name: "body", type: "text", required: true },
			{ name: "status", type: "text", required: false },
			{ name: "sentAt", type: "date", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "subscribers",
		description: "Email subscribers list",
		isSystem: true,
		icon: "User",
		columns: [
			{ name: "email", type: "email", required: true },
			{ name: "name", type: "text", required: false },
			{ name: "status", type: "text", required: false },
			{ name: "subscribedAt", type: "date", required: false },
		],
	},
	{
		name: "users",
		description: "Registered users",
		isSystem: true,
		icon: "Users",
		columns: [
			{ name: "email", type: "email", required: true },
			{ name: "displayName", type: "text", required: false },
			{ name: "photoURL", type: "url", required: false },
			{ name: "role", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "customers",
		description: "Customer records",
		isSystem: true,
		icon: "Building2",
		columns: [
			{ name: "name", type: "text", required: true },
			{ name: "email", type: "email", required: true },
			{ name: "company", type: "text", required: false },
			{ name: "phone", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "payments",
		description: "Payment transactions",
		isSystem: true,
		icon: "CreditCard",
		columns: [
			{ name: "amount", type: "number", required: true },
			{ name: "currency", type: "text", required: false },
			{ name: "status", type: "text", required: false },
			{ name: "customerId", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "invoices",
		description: "Invoice records",
		isSystem: true,
		icon: "Receipt",
		columns: [
			{ name: "invoiceNumber", type: "text", required: true },
			{ name: "amount", type: "number", required: true },
			{ name: "status", type: "text", required: false },
			{ name: "customerId", type: "text", required: false },
			{ name: "dueDate", type: "date", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "products",
		description: "Product catalog",
		isSystem: true,
		icon: "ShoppingBag",
		columns: [
			{ name: "name", type: "text", required: true },
			{ name: "description", type: "text", required: false },
			{ name: "price", type: "number", required: true },
			{ name: "currency", type: "text", required: false },
			{ name: "status", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "messages",
		description: "Contact messages",
		isSystem: true,
		icon: "MessageSquare",
		columns: [
			{ name: "name", type: "text", required: true },
			{ name: "email", type: "email", required: true },
			{ name: "message", type: "text", required: true },
			{ name: "status", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "teams",
		description: "Team members and roles",
		isSystem: true,
		icon: "Shield",
		columns: [
			{ name: "email", type: "email", required: true },
			{ name: "role", type: "text", required: true },
			{ name: "name", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "waitlist",
		description: "Waitlist signups",
		isSystem: true,
		icon: "UsersRound",
		columns: [
			{ name: "email", type: "email", required: true },
			{ name: "name", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "forms",
		description: "Form definitions",
		isSystem: true,
		icon: "FileEdit",
		columns: [
			{ name: "name", type: "text", required: true },
			{ name: "fields", type: "array", required: true },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "formSubmissions",
		description: "Form submission data",
		isSystem: true,
		icon: "FileEdit",
		columns: [
			{ name: "formId", type: "text", required: true },
			{ name: "data", type: "object", required: true },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "tasks",
		description: "Kanban board tasks",
		isSystem: true,
		icon: "LayoutGrid",
		columns: [
			{ name: "title", type: "text", required: true },
			{ name: "description", type: "text", required: false },
			{ name: "status", type: "text", required: true },
			{ name: "priority", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "idea-database",
		description: "Ideas and notes",
		isSystem: true,
		icon: "Lightbulb",
		columns: [
			{ name: "title", type: "text", required: true },
			{ name: "content", type: "text", required: false },
			{ name: "category", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "assets",
		description: "Media assets and files",
		isSystem: true,
		icon: "FolderOpen",
		columns: [
			{ name: "name", type: "text", required: true },
			{ name: "url", type: "url", required: true },
			{ name: "type", type: "text", required: false },
			{ name: "size", type: "number", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "changelog",
		description: "Product changelog entries",
		isSystem: true,
		icon: "GitBranch",
		columns: [
			{ name: "title", type: "text", required: true },
			{ name: "content", type: "text", required: true },
			{ name: "version", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "cronJobs",
		description: "Scheduled CRON jobs",
		isSystem: true,
		icon: "Clock",
		columns: [
			{ name: "name", type: "text", required: true },
			{ name: "schedule", type: "text", required: true },
			{ name: "enabled", type: "boolean", required: false },
			{ name: "lastRun", type: "date", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "reportIssues",
		description: "Bug reports and issues",
		isSystem: true,
		icon: "AlertCircle",
		columns: [
			{ name: "title", type: "text", required: true },
			{ name: "description", type: "text", required: true },
			{ name: "status", type: "text", required: false },
			{ name: "priority", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
	{
		name: "app-analytics",
		description: "Analytics and tracking data",
		isSystem: true,
		icon: "Eye",
		columns: [
			{ name: "event", type: "text", required: true },
			{ name: "data", type: "object", required: false },
			{ name: "timestamp", type: "date", required: false },
		],
	},
	{
		name: "checkouts",
		description: "Checkout sessions",
		isSystem: true,
		icon: "CreditCard",
		columns: [
			{ name: "customerId", type: "text", required: false },
			{ name: "amount", type: "number", required: false },
			{ name: "status", type: "text", required: false },
			{ name: "createdAt", type: "date", required: false },
		],
	},
];

/**
 * Check if a table (collection) already exists in Firestore
 * @param {string} tableName - The name of the table/collection
 * @returns {Promise<boolean>} - True if table exists
 */
export async function checkTableExists(tableName) {
	try {
		// Check if there's metadata for this table
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		const metaSnap = await getDoc(metaRef);
		
		if (metaSnap.exists()) {
			return true;
		}

		// Also check if the collection has any documents
		const collRef = collection(db, tableName);
		const q = query(collRef, limit(1));
		const snap = await getDocs(q);
		
		return !snap.empty;
	} catch (error) {
		console.error("Error checking table existence:", error);
		return false;
	}
}

/**
 * Create a new table in Firestore
 * @param {Object} params
 * @param {string} params.tableName - The name of the table/collection
 * @param {string} params.description - Description of the table
 * @param {Array} params.columns - Array of column definitions
 * @returns {Promise<Object>} - The created table metadata
 */
export async function createTable({ tableName, description, columns }) {
	try {
		// Store table metadata in _tables_meta collection
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		
		const tableMetadata = {
			name: tableName,
			description: description || "",
			columns: columns.map((col, index) => ({
				name: col.name,
				type: col.type || "text",
				required: col.required || false,
				order: index,
			})),
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
			rowCount: 0,
		};

		await setDoc(metaRef, tableMetadata);

		return tableMetadata;
	} catch (error) {
		console.error("Error creating table:", error);
		throw new Error(error?.message || "Failed to create table");
	}
}

/**
 * Get all tables with their metadata (custom tables only)
 * @returns {Promise<Array>} - Array of table metadata objects
 */
export async function getAllTables() {
	try {
		const metaCollRef = collection(db, TABLES_META_COLLECTION);
		const q = query(metaCollRef, orderBy("createdAt", "desc"));
		const snapshot = await getDocs(q);

		const tables = [];
		
		for (const docSnap of snapshot.docs) {
			const tableData = docSnap.data();
			
			// Get actual row count from the collection
			const collRef = collection(db, docSnap.id);
			const collSnap = await getDocs(collRef);
			const rowCount = collSnap.size;

			tables.push({
				id: docSnap.id,
				...tableData,
				rowCount,
				columnCount: tableData.columns?.length || 0,
				isSystem: false,
				createdAt: tableData.createdAt?.toDate?.() || new Date(),
				updatedAt: tableData.updatedAt?.toDate?.() || new Date(),
			});
		}

		return tables;
	} catch (error) {
		console.error("Error fetching tables:", error);
		throw new Error(error?.message || "Failed to fetch tables");
	}
}

/**
 * Get all collections including system collections
 * @returns {Promise<Array>} - Array of all collection metadata objects
 */
export async function getAllCollections() {
	try {
		// Get custom tables first
		const customTables = await getAllTables();

		// Get system collections with their row counts
		const systemCollections = await Promise.all(
			SYSTEM_COLLECTIONS.map(async (sysCollection) => {
				try {
					const collRef = collection(db, sysCollection.name);
					const collSnap = await getDocs(collRef);
					const rowCount = collSnap.size;

					return {
						id: sysCollection.name,
						name: sysCollection.name,
						description: sysCollection.description,
						columns: sysCollection.columns,
						columnCount: sysCollection.columns.length,
						rowCount,
						isSystem: true,
						icon: sysCollection.icon,
						createdAt: null, // System collections don't have creation date
						updatedAt: null,
					};
				} catch (error) {
					// If collection doesn't exist or can't be accessed, return with 0 rows
					return {
						id: sysCollection.name,
						name: sysCollection.name,
						description: sysCollection.description,
						columns: sysCollection.columns,
						columnCount: sysCollection.columns.length,
						rowCount: 0,
						isSystem: true,
						icon: sysCollection.icon,
						createdAt: null,
						updatedAt: null,
					};
				}
			})
		);

		// Combine and return both custom and system collections
		// System collections first, then custom tables
		return [...systemCollections, ...customTables];
	} catch (error) {
		console.error("Error fetching all collections:", error);
		throw new Error(error?.message || "Failed to fetch collections");
	}
}

/**
 * Get system collection metadata
 * @param {string} collectionName - The collection name
 * @returns {Object|null} - System collection metadata or null
 */
export function getSystemCollectionMeta(collectionName) {
	return SYSTEM_COLLECTIONS.find((c) => c.name === collectionName) || null;
}

/**
 * Get a single table's metadata
 * @param {string} tableName - The name of the table
 * @returns {Promise<Object|null>} - Table metadata or null
 */
export async function getTable(tableName) {
	try {
		// First check if it's a system collection
		const systemMeta = getSystemCollectionMeta(tableName);
		if (systemMeta) {
			const collRef = collection(db, tableName);
			const collSnap = await getDocs(collRef);

			return {
				id: tableName,
				name: tableName,
				description: systemMeta.description,
				columns: systemMeta.columns,
				columnCount: systemMeta.columns.length,
				rowCount: collSnap.size,
				isSystem: true,
				icon: systemMeta.icon,
				createdAt: null,
				updatedAt: null,
			};
		}

		// Otherwise check custom tables
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		const metaSnap = await getDoc(metaRef);

		if (!metaSnap.exists()) {
			return null;
		}

		const tableData = metaSnap.data();

		// Get row count
		const collRef = collection(db, tableName);
		const collSnap = await getDocs(collRef);

		return {
			id: metaSnap.id,
			...tableData,
			rowCount: collSnap.size,
			columnCount: tableData.columns?.length || 0,
			isSystem: false,
			createdAt: tableData.createdAt?.toDate?.() || new Date(),
			updatedAt: tableData.updatedAt?.toDate?.() || new Date(),
		};
	} catch (error) {
		console.error("Error fetching table:", error);
		throw new Error(error?.message || "Failed to fetch table");
	}
}

/**
 * Update a table's metadata (columns, description)
 * @param {string} tableName - The name of the table
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateTable(tableName, updates) {
	try {
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		await updateDoc(metaRef, {
			...updates,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating table:", error);
		throw new Error(error?.message || "Failed to update table");
	}
}

/**
 * Delete a table and all its data
 * @param {string} tableName - The name of the table
 * @returns {Promise<void>}
 */
export async function deleteTable(tableName) {
	try {
		// Delete all documents in the collection
		const collRef = collection(db, tableName);
		const snapshot = await getDocs(collRef);
		
		const deletePromises = snapshot.docs.map((docSnap) =>
			deleteDoc(doc(db, tableName, docSnap.id))
		);
		await Promise.all(deletePromises);

		// Delete the table metadata
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		await deleteDoc(metaRef);
	} catch (error) {
		console.error("Error deleting table:", error);
		throw new Error(error?.message || "Failed to delete table");
	}
}

/**
 * Get all rows from a table
 * @param {string} tableName - The name of the table
 * @returns {Promise<Array>} - Array of row objects
 */
export async function getTableRows(tableName) {
	try {
		const collRef = collection(db, tableName);
		const snapshot = await getDocs(collRef);

		return snapshot.docs.map((docSnap) => ({
			id: docSnap.id,
			...docSnap.data(),
		}));
	} catch (error) {
		console.error("Error fetching table rows:", error);
		throw new Error(error?.message || "Failed to fetch table rows");
	}
}

/**
 * Add a row to a table
 * @param {string} tableName - The name of the table
 * @param {Object} rowData - The row data
 * @returns {Promise<string>} - The created document ID
 */
export async function addTableRow(tableName, rowData) {
	try {
		const collRef = collection(db, tableName);
		const newDocRef = doc(collRef);
		
		await setDoc(newDocRef, {
			...rowData,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});

		// Update row count in metadata
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		const metaSnap = await getDoc(metaRef);
		if (metaSnap.exists()) {
			const currentCount = metaSnap.data().rowCount || 0;
			await updateDoc(metaRef, { rowCount: currentCount + 1 });
		}

		return newDocRef.id;
	} catch (error) {
		console.error("Error adding table row:", error);
		throw new Error(error?.message || "Failed to add row");
	}
}

/**
 * Update a row in a table
 * @param {string} tableName - The name of the table
 * @param {string} rowId - The row/document ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<void>}
 */
export async function updateTableRow(tableName, rowId, updates) {
	try {
		const rowRef = doc(db, tableName, rowId);
		await updateDoc(rowRef, {
			...updates,
			updatedAt: serverTimestamp(),
		});
	} catch (error) {
		console.error("Error updating table row:", error);
		throw new Error(error?.message || "Failed to update row");
	}
}

/**
 * Delete a row from a table
 * @param {string} tableName - The name of the table
 * @param {string} rowId - The row/document ID
 * @returns {Promise<void>}
 */
export async function deleteTableRow(tableName, rowId) {
	try {
		const rowRef = doc(db, tableName, rowId);
		await deleteDoc(rowRef);

		// Update row count in metadata
		const metaRef = doc(db, TABLES_META_COLLECTION, tableName);
		const metaSnap = await getDoc(metaRef);
		if (metaSnap.exists()) {
			const currentCount = metaSnap.data().rowCount || 0;
			await updateDoc(metaRef, { rowCount: Math.max(0, currentCount - 1) });
		}
	} catch (error) {
		console.error("Error deleting table row:", error);
		throw new Error(error?.message || "Failed to delete row");
	}
}
