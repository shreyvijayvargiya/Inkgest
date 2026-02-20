import { uploadFileToPolar, base64ToBuffer, getMimeType } from "./fileUpload";

/**
 * Create product in Polar API
 * POST /api/polar/products/create
 * Body: { name: string, description?: string, prices: Array, bannerImages?: Array<{base64: string, fileName: string}> }
 */
export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { name, description, prices, bannerImages } = req.body;

		if (!name || !prices || !Array.isArray(prices) || prices.length === 0) {
			return res.status(400).json({
				error: "Name and prices array are required",
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

		// Upload banner images to Polar Files API if provided
		let mediaFileIds = [];
		if (
			bannerImages &&
			Array.isArray(bannerImages) &&
			bannerImages.length > 0
		) {
			try {
				for (const imageData of bannerImages) {
					// Support both new format (object with base64 and fileName) and legacy format (base64 string)
					let base64String, fileName;

					if (typeof imageData === "string") {
						// Legacy format: just a base64 string
						base64String = imageData;
						fileName = `banner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
					} else if (imageData.base64) {
						// New format: object with base64 and fileName
						base64String = imageData.base64;
						fileName =
							imageData.fileName ||
							`banner-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.png`;
					} else {
						console.warn("Invalid image data format, skipping:", imageData);
						continue;
					}

					// Validate file size (max 10MB)
					const fileBuffer = base64ToBuffer(base64String);
					if (fileBuffer.length > 10 * 1024 * 1024) {
						console.warn(`File ${fileName} exceeds 10MB limit, skipping`);
						continue;
					}

					const mimeType = getMimeType(base64String, fileName);

					// Upload to Polar
					const fileId = await uploadFileToPolar(
						fileBuffer,
						fileName,
						mimeType,
						POLAR_ACCESS_TOKEN,
						POLAR_API_URL
					);

					mediaFileIds.push(fileId);
				}
			} catch (fileUploadError) {
				console.error(
					"Error uploading banner images to Polar:",
					fileUploadError
				);
				return res.status(500).json({
					error: "Failed to upload banner images",
					details: fileUploadError.message,
				});
			}
		}

		// Transform prices to Polar API format
		// Polar requires amount_type discriminator and uses price_amount/price_currency
		const transformedPrices = prices.map((price) => {
			// Determine amount_type: "fixed" for fixed prices, "custom" for pay-what-you-want
			const amountType =
				price.amount_type || (price.price_amount ? "fixed" : "custom");

			const priceObj = {
				amount_type: amountType,
				price_currency: price.price_currency || price.currency || "usd",
			};

			// For fixed prices, include price_amount
			if (amountType === "fixed") {
				priceObj.price_amount = price.price_amount || price.amount;
			}
			// For custom/pay-what-you-want, include min/max if provided
			else if (amountType === "custom") {
				if (price.min_amount) priceObj.min_amount = price.min_amount;
				if (price.max_amount) priceObj.max_amount = price.max_amount;
			}

			return priceObj;
		});

		// Determine if this is a recurring product
		const firstPrice = prices[0];
		const isRecurring =
			firstPrice.recurring_interval &&
			firstPrice.recurring_interval !== "one_time";
		const recurringInterval = isRecurring
			? firstPrice.recurring_interval
			: undefined;

		// Build request body - recurring_interval goes at product level for recurring products
		const requestBody = {
			name,
			description: description || undefined,
			prices: transformedPrices,
		};

		// Add recurring_interval at product level if it's a recurring product
		if (recurringInterval) {
			requestBody.recurring_interval = recurringInterval;
		}

		// Add media file IDs if we uploaded any banner images
		// Polar expects medias to be an array of UUID strings, not objects
		if (mediaFileIds.length > 0) {
			requestBody.medias = mediaFileIds;
		}

		// Create product in Polar
		const polarResponse = await fetch(`${POLAR_API_URL}/v1/products`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!polarResponse.ok) {
			const errorData = await polarResponse.json();
			console.dir(errorData, { depth: null });
			return res.status(polarResponse.status).json({
				error:
					errorData.message ||
					errorData.error ||
					"Failed to create product in Polar",
				details: errorData.detail || errorData,
			});
		}

		const polarProduct = await polarResponse.json();

		// Return the created product with price IDs and media file IDs
		return res.status(200).json({
			success: true,
			product: polarProduct,
			// Include the first price ID for checkout link generation
			priceId:
				polarProduct.prices && polarProduct.prices.length > 0
					? polarProduct.prices[0].id
					: null,
			// Include media file IDs for storing in Firestore
			mediaFileIds: mediaFileIds,
		});
	} catch (error) {
		console.error("Error creating product in Polar:", error);
		return res.status(500).json({
			error: "Internal server error",
		});
	}
}
