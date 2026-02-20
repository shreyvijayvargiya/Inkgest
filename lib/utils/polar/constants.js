/**
 * Global constants for Polar webhook and payment processing
 */

export const COLLECTIONS = {
	CUSTOMERS: "customers",
	PAYMENTS: "payments",
	USERS: "users"
};

export const DEFAULTS = {
	PLAN_NAME: "Pro",
	CUSTOMER_NAME: "Customer",
	CURRENCY: "usd",
	STATUS: "pending",
};

export const STATUS_MAPPING = {
	// Subscription status to payment status
	SUBSCRIPTION_TO_PAYMENT: {
		active: "succeeded",
		trialing: "succeeded",
		past_due: "failed",
		unpaid: "failed",
		canceled: "succeeded", // Past payments were successful
		cancelled: "succeeded",
	},
};

export const VALIDATION = {
	REQUIRED_PAYMENT_FIELDS: ["id", "customer_id"],
	INVALID_EMAIL_PATTERN: /@polar\.sh$/,
};
