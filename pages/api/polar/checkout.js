import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/config/firebase";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { planId, customerId } = req.body;

		if (!planId) {
			return res.status(400).json({ error: "Plan ID is required" });
		}

		// Get Polar API credentials from environment variables
		const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
		const POLAR_API_URL = process.env.POLAR_API_URL || "https://api.polar.sh";

		if (!POLAR_ACCESS_TOKEN) {
			return res.status(500).json({
				error: "Polar API credentials not configured",
			});
		}

		// Helper to create checkout request
		const createCheckout = (includeCustomerId) => {
			const body = {
				product_id: planId,
				success_url: `${req.headers.origin}/pricing?success=true`,
				metadata: {
					source: "saas-app",
				},
			};
			if (includeCustomerId && customerId) {
				body.customer_id = customerId;
			}
			return fetch(`${POLAR_API_URL}/v1/checkouts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});
		};

		let checkoutResponse = await createCheckout(true);

		// If customer doesn't exist (e.g. after switching Polar org/token), retry without customerId
		if (!checkoutResponse.ok) {
			const errorData = await checkoutResponse.json();
			const customerNotFound =
				errorData.detail?.some?.((d) => d.msg === "Customer does not exist.") ??
				false;

			if (customerNotFound && customerId) {
				checkoutResponse = await createCheckout(false);
			}

			if (!checkoutResponse.ok) {
				const finalError = await checkoutResponse.json().catch(() => errorData);
				console.error("Polar checkout error:", finalError);
				return res.status(checkoutResponse.status).json({
					error: finalError.message || "Failed to create checkout",
				});
			}
		}

		const checkoutData = await checkoutResponse.json();

		// Store checkout session in Firestore (optional, for tracking)
		if (checkoutData.id) {
			try {
				await addDoc(collection(db, "checkouts"), {
					checkoutId: checkoutData.id,
					planId: planId,
					customerId: customerId || null,
					status: "pending",
					createdAt: serverTimestamp(),
				});
			} catch (firestoreError) {
				console.error("Error storing checkout:", firestoreError);
				// Don't fail the request if Firestore write fails
			}
		}

		return res.status(200).json({
			checkoutUrl: checkoutData.url || checkoutData.checkout_url,
			checkoutId: checkoutData.id,
		});
	} catch (error) {
		console.error("Error creating checkout:", error);
		return res.status(500).json({
			error: "Internal server error",
		});
	}
}
