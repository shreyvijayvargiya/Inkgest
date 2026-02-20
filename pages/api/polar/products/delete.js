/**
 * Delete product from Polar API
 * DELETE /api/polar/products/delete
 * Body: { polarProductId: string }
 */
export default async function handler(req, res) {
	if (req.method !== "DELETE") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { polarProductId } = req.body;

		if (!polarProductId) {
			return res.status(400).json({
				error: "Polar product ID is required",
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

		// Delete product from Polar
		const polarResponse = await fetch(
			`${POLAR_API_URL}/v1/products/${polarProductId}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
			}
		);

		if (!polarResponse.ok) {
			const errorData = await polarResponse.json();
			console.error("Polar delete product error:", errorData);
			return res.status(polarResponse.status).json({
				error: errorData.message || "Failed to delete product from Polar",
			});
		}

		return res.status(200).json({
			success: true,
		});
	} catch (error) {
		console.error("Error deleting product from Polar:", error);
		return res.status(500).json({
			error: "Internal server error",
		});
	}
}

