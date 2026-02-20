import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
import { COLLECTIONS, DEFAULTS, STATUS_MAPPING, VALIDATION } from "./constants";
import { getFirestoreDate, normalizeDate } from "./dateUtils";
import { getCustomerFromFirestore } from "./customerUtils";

/**
 * Determine payment status from subscription status
 *
 * @param {string} subscriptionStatus - Subscription status
 * @returns {string} Payment status
 */
export function getPaymentStatusFromSubscription(subscriptionStatus) {
	return (
		STATUS_MAPPING.SUBSCRIPTION_TO_PAYMENT[subscriptionStatus] ||
		DEFAULTS.STATUS
	);
}

/**
 * Verify payment status against subscription status for consistency
 *
 * @param {string} paymentStatus - Current payment status
 * @param {string} customerId - Customer ID
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<string>} Verified payment status
 */
export async function verifyPaymentStatus(
	paymentStatus,
	customerId,
	subscriptionId
) {
	if (!customerId || !subscriptionId) return paymentStatus;

	try {
		const customer = await getCustomerFromFirestore(customerId);
		if (customer && customer.status) {
			const expectedStatus = getPaymentStatusFromSubscription(customer.status);
			// If payment is succeeded but subscription is not active, keep payment status
			// This handles past successful payments for canceled subscriptions
			if (
				paymentStatus === "succeeded" &&
				customer.status !== "active" &&
				customer.status !== "trialing"
			) {
				// Check if this is a past payment
				if (customer.expiresAt) {
					const expiresAt = normalizeDate(customer.expiresAt);
					if (expiresAt && expiresAt > new Date()) {
						return paymentStatus; // Still within period, payment was successful
					}
				}
			}
		}
	} catch (error) {
		console.error("Error verifying payment status:", error);
	}

	return paymentStatus;
}

/**
 * Validate payment data before storage
 *
 * @param {Object} payment - Payment data object
 * @returns {boolean} True if valid, false otherwise
 */
export function validatePaymentData(payment) {
	const errors = [];

	VALIDATION.REQUIRED_PAYMENT_FIELDS.forEach((field) => {
		// Check both snake_case and camelCase variants
		const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
		if (!payment[field] && !payment[camelField]) {
			errors.push(`Missing required field: ${field}`);
		}
	});

	if (errors.length > 0) {
		console.error("Payment validation errors:", errors);
		return false;
	}

	return true;
}

/**
 * Store payment record in Firestore with enriched data
 *
 * @param {Object} paymentData - Payment data to store
 * @returns {Promise<boolean>} True if stored successfully, false otherwise
 */
export async function storePaymentRecord(paymentData) {
	try {
		// Validate required fields
		if (!validatePaymentData(paymentData)) {
			console.error("Skipping payment storage due to validation errors");
			return false;
		}

		const paymentId = paymentData.paymentId || paymentData.id;
		if (!paymentId) {
			console.error("Cannot store payment: missing payment ID");
			return false;
		}

		const paymentRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);

		// Prepare payment document with consistent date handling
		const paymentDoc = {
			paymentId: paymentId,
			customerId: paymentData.customerId || paymentData.customer_id || null,
			customerEmail: paymentData.customerEmail || null,
			customerName: paymentData.customerName || DEFAULTS.CUSTOMER_NAME,
			amount: paymentData.amount || 0,
			currency: paymentData.currency || DEFAULTS.CURRENCY,
			status: paymentData.status || DEFAULTS.STATUS,
			planId: paymentData.planId || null,
			planName: paymentData.planName || DEFAULTS.PLAN_NAME,
			subscriptionId:
				paymentData.subscriptionId || paymentData.subscription_id || null,
			createdAt: getFirestoreDate(
				paymentData.createdAt ||
					paymentData.created_at ||
					paymentData.current_period_start
			),
			updatedAt: serverTimestamp(),
		};

		// Add optional fields if present
		if (paymentData.paymentType) {
			paymentDoc.paymentType = paymentData.paymentType;
		}
		if (paymentData.eventType) {
			paymentDoc.eventType = paymentData.eventType;
		}

		await setDoc(paymentRef, paymentDoc, { merge: true });
		return true;
	} catch (error) {
		console.error("Error storing payment record:", error);
		return false;
	}
}
