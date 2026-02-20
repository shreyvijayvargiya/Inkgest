import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
import { COLLECTIONS, DEFAULTS, VALIDATION } from "./constants";

/**
 * Fetch customer data from Firestore
 *
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object|null>} Customer data or null
 */
export async function getCustomerFromFirestore(customerId) {
	if (!customerId) return null;

	try {
		const customerRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
		const customerDoc = await getDoc(customerRef);

		if (customerDoc.exists()) {
			return {
				id: customerDoc.id,
				...customerDoc.data(),
			};
		}
		return null;
	} catch (error) {
		console.error(
			`Error fetching customer ${customerId} from Firestore:`,
			error
		);
		return null;
	}
}

/**
 * Enrich customer data from multiple sources
 * Priority: Event data > Firestore data > Defaults
 *
 * @param {string} customerId - Customer ID
 * @param {Object} eventCustomerData - Customer data from webhook event
 * @returns {Promise<Object>} Enriched customer data with isValid flag
 */
export async function enrichCustomerData(customerId, eventCustomerData = {}) {
	// Start with event data
	let customerEmail = eventCustomerData?.email || null;
	let customerName = eventCustomerData?.name || null;

	// If missing, fetch from Firestore
	if (customerId && (!customerEmail || !customerName)) {
		const firestoreCustomer = await getCustomerFromFirestore(customerId);
		if (firestoreCustomer) {
			customerEmail = customerEmail || firestoreCustomer.email || null;
			customerName = customerName || firestoreCustomer.name || null;
		}
	}

	// Validate email (not a placeholder)
	const isValidEmail =
		customerEmail &&
		customerEmail !== `${customerId}@polar.sh` &&
		!VALIDATION.INVALID_EMAIL_PATTERN.test(customerEmail);

	return {
		email: isValidEmail ? customerEmail : null,
		name: customerName || DEFAULTS.CUSTOMER_NAME,
		isValid: isValidEmail,
	};
}
