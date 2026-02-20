import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
import crypto from "crypto";
import {
	sendSubscriptionConfirmationEmail,
	sendSubscriptionCancellationEmail,
	sendSubscriptionUpgradeEmail,
} from "../../../lib/api/subscriptionEmails";

// Import utility functions
import { COLLECTIONS, DEFAULTS } from "../../../lib/utils/polar/constants";
import { normalizeDate } from "../../../lib/utils/polar/dateUtils";
import {
	getCustomerFromFirestore,
	enrichCustomerData,
} from "../../../lib/utils/polar/customerUtils";
import { enrichPlanData } from "../../../lib/utils/polar/planUtils";
import {
	getPaymentStatusFromSubscription,
	verifyPaymentStatus,
	storePaymentRecord,
} from "../../../lib/utils/polar/paymentUtils";

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		// Verify webhook signature (recommended for production)
		const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
		if (POLAR_WEBHOOK_SECRET) {
			const signature = req.headers["polar-signature"];
			if (!signature) {
				return res.status(401).json({ error: "Missing signature" });
			}

			const body = JSON.stringify(req.body);
			const expectedSignature = crypto
				.createHmac("sha256", POLAR_WEBHOOK_SECRET)
				.update(body)
				.digest("hex");

			if (signature !== expectedSignature) {
				return res.status(401).json({ error: "Invalid signature" });
			}
		}

		const event = req.body;

		// Handle different event types
		switch (event.type) {
			case "subscription.active":
				await handleSubscriptionEvent(event);
				break;

			case "subscription.canceled":
				await handleSubscriptionCanceledEvent(event);
				break;

			case "payment.created":
			case "payment.succeeded":
			case "payment.failed":
				await handlePaymentEvent(event);
				break;

			case "customer.created":
			case "customer.updated":
				await handleCustomerEvent(event);
				break;

			default:
				console.log("Unhandled event type:", event.type);
		}

		return res.status(200).json({ received: true });
	} catch (error) {
		console.error("Webhook error:", error);
		return res.status(500).json({ error: "Internal server error" });
	}
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleSubscriptionEvent(event) {
	const subscription = event.data;
	const customerId = subscription.customer_id;

	if (!customerId) {
		console.error("No customer ID in subscription event");
		return;
	}

	// Enrich customer data
	const customerData = await enrichCustomerData(
		customerId,
		subscription.customer,
	);

	if (!customerData.isValid) {
		console.warn(
			`Skipping subscription event for invalid customer: ${customerId}`,
		);
		return;
	}

	// Get existing customer data for comparison
	const existingCustomer = await getCustomerFromFirestore(customerId);
	const existingCustomerData = existingCustomer || {};

	// Get plan information
	const planData = await enrichPlanData(
		customerId,
		subscription.product,
		subscription,
	);

	const isUpgrade =
		existingCustomerData.planId &&
		existingCustomerData.planId !== planData.planId &&
		existingCustomerData.planName !== planData.planName;

	const isCancelled =
		subscription.status === "canceled" || subscription.status === "cancelled";

	// Update customer in Firestore
	const userRef = doc(db, COLLECTIONS.USERS, customerId);
	const userDoc = await getDoc(userRef);

	const updatedUserData = {
		userId: customerId,
		subscriptionId:
			subscription.id || existingCustomerData.subscriptionId || null,
		email: customerData.email,
		name: customerData.name,
		planId: planData.planId,
		planName: planData.planName,
		status: subscription.status || "active",
		amount: subscription.price?.amount || existingCustomerData.amount || 0,
		currency:
			subscription.price?.currency ||
			existingCustomerData.currency ||
			DEFAULTS.CURRENCY,
		expiresAt: subscription.current_period_end
			? normalizeDate(subscription.current_period_end)
			: existingCustomerData.expiresAt || null,
		updatedAt: serverTimestamp(),
	};

	if (!userDoc.exists()) {
		updatedUserData.createdAt = serverTimestamp();
	}

	await setDoc(userRef, updatedUserData, { merge: true });

	// Send appropriate emails based on subscription status
	if (customerData.isValid) {
		try {
			if (isCancelled) {
				const expiresAtDate = normalizeDate(updatedUserData.expiresAt);
				await sendSubscriptionCancellationEmail({
					customerEmail: customerData.email,
					customerName: customerData.name,
					planName: planData.planName,
					expiresAt: expiresAtDate,
				});
			} else if (isUpgrade && existingCustomerData.planName) {
				const expiresAtDate = normalizeDate(updatedUserData.expiresAt);
				await sendSubscriptionUpgradeEmail({
					customerEmail: customerData.email,
					customerName: customerData.name,
					oldPlanName: existingCustomerData.planName,
					newPlanName: planData.planName,
					amount: subscription.price?.amount || 0,
					currency: subscription.price?.currency || DEFAULTS.CURRENCY,
					expiresAt: expiresAtDate,
				});
			}
		} catch (error) {
			console.error("Failed to send subscription email:", error);
			// Don't throw - email failure shouldn't break the webhook
		}
	}
}

async function handleSubscriptionCanceledEvent(event) {
	const subscription = event.data;
	const customerId = subscription.customer_id;

	if (!customerId) {
		console.error("No customer ID in subscription canceled event");
		return;
	}

	// Enrich customer data
	const customerData = await enrichCustomerData(
		customerId,
		subscription.customer,
	);

	// Get existing customer data
	const existingCustomer = await getCustomerFromFirestore(customerId);
	if (!existingCustomer) {
		console.error("Customer not found in Firestore for cancellation");
		return;
	}

	// Get plan information
	const planData = await enrichPlanData(
		customerId,
		subscription.product,
		subscription,
	);

	const expiresAt = subscription.current_period_end
		? normalizeDate(subscription.current_period_end)
		: normalizeDate(existingCustomer.expiresAt);

	// Update customer status to canceled
	const customerRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
	const updatedCustomerData = {
		customerId: customerId,
		subscriptionId: subscription.id || existingCustomer.subscriptionId || null,
		email: customerData.email || existingCustomer.email,
		name: customerData.name || existingCustomer.name,
		planId: planData.planId || existingCustomer.planId || null,
		planName: planData.planName,
		status: "canceled",
		amount: subscription.price?.amount || existingCustomer.amount || 0,
		currency:
			subscription.price?.currency ||
			existingCustomer.currency ||
			DEFAULTS.CURRENCY,
		expiresAt: expiresAt,
		canceledAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

	await setDoc(customerRef, updatedCustomerData, { merge: true });

	// Send cancellation email
	if (customerData.isValid) {
		try {
			const expiresAtDate = normalizeDate(expiresAt);
			await sendSubscriptionCancellationEmail({
				customerEmail: customerData.email,
				customerName: customerData.name,
				planName: planData.planName,
				expiresAt: expiresAtDate,
			});
			console.log(
				"Subscription cancellation email sent to:",
				customerData.email,
			);
		} catch (error) {
			console.error("Failed to send subscription cancellation email:", error);
			// Don't throw - email failure shouldn't break the webhook
		}
	}

	console.log("Subscription canceled for customer:", customerId);
}

async function handlePaymentEvent(event) {
	const payment = event.data;

	// Validate required fields
	if (!payment.id || !payment.customer_id) {
		console.error("Payment event missing required fields:", {
			id: payment.id,
			customer_id: payment.customer_id,
		});
		return;
	}

	// Enrich customer data from multiple sources
	const customerData = await enrichCustomerData(
		payment.customer_id,
		payment.customer,
	);

	// Enrich plan data from multiple sources
	const planData = await enrichPlanData(
		payment.customer_id,
		payment.product,
		payment.subscription || {},
	);

	// Verify payment status against subscription if available
	let paymentStatus = payment.status || DEFAULTS.STATUS;
	if (payment.subscription_id) {
		paymentStatus = await verifyPaymentStatus(
			paymentStatus,
			payment.customer_id,
			payment.subscription_id,
		);
	}

	// Store payment record with all enriched data
	await storePaymentRecord({
		paymentId: payment.id,
		customerId: payment.customer_id,
		customerEmail: customerData.email,
		customerName: customerData.name,
		amount: payment.amount || 0,
		currency: payment.currency || DEFAULTS.CURRENCY,
		status: paymentStatus,
		planId: planData.planId,
		planName: planData.planName,
		subscriptionId: payment.subscription_id || null,
		createdAt: payment.created_at,
		paymentType: "payment",
		eventType: event.type,
	});

	// If payment succeeded, update customer subscription status
	if (payment.status === "succeeded" && payment.customer_id) {
		const customerRef = doc(db, COLLECTIONS.CUSTOMERS, payment.customer_id);
		await setDoc(
			customerRef,
			{
				status: "active",
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		);

		// Get customer data for email (use enriched data)
		const customerForEmail = await getCustomerFromFirestore(
			payment.customer_id,
		);
		const emailCustomerData = customerForEmail || {};

		// Send payment confirmation email using enriched data
		const emailToUse = customerData.email || emailCustomerData.email;
		if (emailToUse && customerData.isValid) {
			try {
				const expiresAtDate = normalizeDate(emailCustomerData.expiresAt);
				await sendSubscriptionConfirmationEmail({
					customerEmail: emailToUse,
					customerName:
						customerData.name ||
						emailCustomerData.name ||
						DEFAULTS.CUSTOMER_NAME,
					planName: planData.planName,
					amount: payment.amount || 0,
					currency: payment.currency || DEFAULTS.CURRENCY,
					paymentId: payment.id,
					expiresAt: expiresAtDate,
				});
			} catch (error) {
				console.error("Failed to send payment confirmation email:", error);
				// Don't throw - email failure shouldn't break the webhook
			}
		}
	}
}

async function handleCustomerEvent(event) {
	const customer = event.data;

	// Store customer in Firestore
	const customerRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
	const customerDoc = await getDoc(customerRef);

	const customerData = {
		customerId: customer.id,
		email: customer.email || null,
		name: customer.name || customer.email || DEFAULTS.CUSTOMER_NAME,
		updatedAt: serverTimestamp(),
	};

	if (!customerDoc.exists()) {
		customerData.createdAt = serverTimestamp();
	}

	await setDoc(customerRef, customerData, { merge: true });
}

export async function handleSubscriptionCreatedEvent(event) {
	const subscription = event.data;
	const customerId = subscription.customer_id;

	if (!customerId) {
		console.error("No customer ID in subscription created event");
		return;
	}

	// Enrich customer data
	const customerData = await enrichCustomerData(
		customerId,
		subscription.customer,
	);

	// Get existing customer data
	const existingCustomer = await getCustomerFromFirestore(customerId);
	if (!existingCustomer) {
		console.error("Customer not found in Firestore for subscription created");
		return;
	}

	const userRef = doc(db, COLLECTIONS.USERS, customerId);
	const userDoc = await getDoc(userRef);

	if (!userDoc.exists()) {
		await setDoc(
			userRef,
			{
				userId: customerId,
				subscriptionId: subscription.id,
				email: customerData.email,
				name: customerData.name,
				planId: planData.planId,
				planName: planData.planName,
				status: "active",
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		);
	}
	// Get plan information
	const planData = await enrichPlanData(
		customerId,
		subscription.product,
		subscription,
	);

	await setDoc(
		userRef,
		{
			userId: customerId,
			subscriptionId: subscription.id,
			email: customerData.email,
			name: customerData.name,
			planId: planData.planId,
			planName: planData.planName,
			status: "active",
		},
		{ merge: true },
	);
}
