/**
 * Create checkout link for a product
 * POST /api/polar/products/checkout-link
 * Body: { productId: string (Polar product ID), priceId?: string (optional price ID) }
 */
export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { productId, priceId } = req.body;

		if (!productId) {
			return res.status(400).json({
				error: "Product ID is required",
			});
		}

		// Get Polar API credentials from environment variables
		const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
		const POLAR_API_URL = process.env.POLAR_API_URL || "https://api.polar.sh";

		if (!POLAR_ACCESS_TOKEN) {
			return res.status(500).json({
				error: "Polar API credentials not configured",
			});
		}

		// If priceId is not provided, fetch the product to get the current price ID
		let actualPriceId = priceId;
		if (!actualPriceId) {
			try {
				const productResponse = await fetch(
					`${POLAR_API_URL}/v1/products/${productId}`,
					{
						method: "GET",
						headers: {
							Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
							"Content-Type": "application/json",
						},
					}
				);

				if (productResponse.ok) {
					const productData = await productResponse.json();
					// Get the first price ID from the product
					if (productData.prices && productData.prices.length > 0) {
						actualPriceId = productData.prices[0].id;
					}
				}
			} catch (fetchError) {
				console.warn("Failed to fetch product for price ID:", fetchError);
			}
		}

		// Build checkout request body
		const checkoutBody = {
			product_id: productId,
			success_url: `${req.headers.origin}/pricing?success=true`,
			metadata: {
				source: "saas-app",
			},
		};

		// Add price_id if available (ensures correct price/plan is used)
		if (actualPriceId) {
			checkoutBody.price_id = actualPriceId;
		}

		// Create checkout session with Polar
		const checkoutResponse = await fetch(`${POLAR_API_URL}/v1/checkouts`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(checkoutBody),
		});

		if (!checkoutResponse.ok) {
			const errorData = await checkoutResponse.json();
			console.error("Polar checkout error:", errorData);
			return res.status(checkoutResponse.status).json({
				error: errorData.message || "Failed to create checkout link",
			});
		}

		const checkoutData = await checkoutResponse.json();

		return res.status(200).json({
			success: true,
			checkoutUrl: checkoutData.url || checkoutData.checkout_url,
			checkoutId: checkoutData.id,
		});
	} catch (error) {
		console.error("Error creating checkout link:", error);
		return res.status(500).json({
			error: "Internal server error",
		});
	}
}
