import { getCustomerFromFirestore } from "./customerUtils";
import { DEFAULTS } from "./constants";

/**
 * Get plan information from multiple sources
 * Priority: Payment/Subscription product > Customer subscription > Defaults
 *
 * @param {string} customerId - Customer ID
 * @param {Object} eventProductData - Product data from webhook event
 * @param {Object} eventSubscriptionData - Subscription data from webhook event
 * @returns {Promise<Object>} Plan data with planId and planName
 */
export async function enrichPlanData(
	customerId,
	eventProductData = {},
	eventSubscriptionData = {}
) {
	// Try from event product data first
	let planId = eventProductData?.id || null;
	let planName = eventProductData?.name || null;

	// Try from subscription data
	if (!planId && eventSubscriptionData?.product_id) {
		planId = eventSubscriptionData.product_id;
	}
	if (!planName && eventSubscriptionData?.product?.name) {
		planName = eventSubscriptionData.product.name;
	}

	// If still missing, fetch from customer subscription in Firestore
	if (customerId && (!planId || !planName)) {
		const firestoreCustomer = await getCustomerFromFirestore(customerId);
		if (firestoreCustomer) {
			planId = planId || firestoreCustomer.planId || null;
			planName = planName || firestoreCustomer.planName || null;
		}
	}

	return {
		planId: planId || null,
		planName: planName || DEFAULTS.PLAN_NAME,
	};
}
