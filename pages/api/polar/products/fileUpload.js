import crypto from "crypto";

/**
 * Upload a file to Polar Files API
 * Process: Create file -> Upload to URL -> Mark as uploaded -> Return file ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type (e.g., 'image/png')
 * @param {string} accessToken - Polar access token
 * @param {string} apiUrl - Polar API URL
 * @returns {Promise<string>} File ID from Polar
 */
export async function uploadFileToPolar(
	fileBuffer,
	fileName,
	mimeType,
	accessToken,
	apiUrl = "https://api.polar.sh"
) {
	try {
		// Input validation
		if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
			throw new Error("fileBuffer must be a valid Buffer");
		}
		if (fileBuffer.length === 0) {
			throw new Error("fileBuffer cannot be empty");
		}
		if (!fileName || typeof fileName !== "string" || fileName.trim() === "") {
			throw new Error("fileName must be a non-empty string");
		}
		if (!mimeType || typeof mimeType !== "string" || mimeType.trim() === "") {
			throw new Error("mimeType must be a non-empty string");
		}
		if (!accessToken || typeof accessToken !== "string") {
			throw new Error("accessToken must be a valid string");
		}

		// Calculate SHA256 checksum in base64 format (Polar API requirement)
		const checksumSha256 = crypto
			.createHash("sha256")
			.update(fileBuffer)
			.digest("base64");

		const fileSize = fileBuffer.length;

		// Step 1: Create file record in Polar with upload parts structure
		// For single file upload, we use one part covering the entire file
		const fileRequestPayload = {
			service: "product_media",
			name: fileName,
			mime_type: mimeType,
			size: fileSize,
			checksum_sha256_base64: checksumSha256,
			upload: {
				parts: [
					{
						number: 1,
						chunk_start: 0,
						chunk_end: fileSize - 1,
						checksum_sha256_base64: checksumSha256,
					},
				],
			},
		};

		console.log("Creating file in Polar with payload:", {
			...fileRequestPayload,
			checksum_sha256_base64: checksumSha256.substring(0, 20) + "...", // Log partial checksum
			upload: {
				parts: [
					{
						...fileRequestPayload.upload.parts[0],
						checksum_sha256_base64: checksumSha256.substring(0, 20) + "...",
					},
				],
			},
		});

		const createFileResponse = await fetch(`${apiUrl}/v1/files`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(fileRequestPayload),
		});

		if (!createFileResponse.ok) {
			const errorText = await createFileResponse.text();
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch (e) {
				errorData = { raw: errorText };
			}

			// Log the full error details, including nested detail array
			console.error("Polar API error response (full):");
			console.error(
				"Status:",
				createFileResponse.status,
				createFileResponse.statusText
			);
			console.error("Error Data:", JSON.stringify(errorData, null, 2));
			console.error(
				"Request Payload:",
				JSON.stringify(fileRequestPayload, null, 2)
			);

			// Use console.dir for better nested object display
			if (errorData.detail) {
				console.error("Validation Details:");
				console.dir(errorData.detail, { depth: null });
			}

			// Extract detailed validation errors from detail array
			let errorMessage =
				errorData.message ||
				errorData.error ||
				"Failed to create file in Polar";
			if (
				errorData.detail &&
				Array.isArray(errorData.detail) &&
				errorData.detail.length > 0
			) {
				const validationErrors = errorData.detail
					.map((err) => {
						if (typeof err === "object") {
							// Try to extract field and message from validation error
							if (err.loc && err.msg) {
								return `${err.loc.join(".")}: ${err.msg}`;
							}
							return JSON.stringify(err);
						}
						return err;
					})
					.join("; ");
				errorMessage = `${errorMessage} - ${validationErrors}`;
			} else if (errorData.detail) {
				errorMessage = `${errorMessage} - ${JSON.stringify(errorData.detail)}`;
			}

			throw new Error(errorMessage);
		}

		const fileData = await createFileResponse.json();
		const fileId = fileData.id;

		// Step 2: Upload file parts to the provided URLs
		// The response includes upload.parts with URLs for each part
		if (
			!fileData.upload ||
			!fileData.upload.parts ||
			fileData.upload.parts.length === 0
		) {
			throw new Error("No upload parts provided by Polar");
		}

		// Array to store ETags from each upload response
		const uploadEtags = [];

		// Upload each part (for single file, there's typically one part)
		for (const part of fileData.upload.parts) {
			if (!part.url) {
				throw new Error(`No upload URL provided for part ${part.number}`);
			}

			// Extract the chunk for this part
			const chunkStart = part.chunk_start || 0;
			const chunkEnd = part.chunk_end || fileSize - 1;
			const chunkBuffer = fileBuffer.slice(chunkStart, chunkEnd + 1);

			console.log(`Uploading part ${part.number} to storage URL...`, {
				partNumber: part.number,
				chunkSize: chunkBuffer.length,
				expectedSize: chunkEnd - chunkStart + 1,
			});

			// Build headers for upload
			const uploadHeaders = {
				"Content-Type": mimeType,
				"Content-Length": chunkBuffer.length.toString(),
				...(part.headers || {}), // Include any additional headers from Polar (may include checksum headers)
			};

			console.log(`Upload headers for part ${part.number}:`, {
				...uploadHeaders,
				// Don't log sensitive headers if present
				hasCustomHeaders: !!part.headers,
			});

			// Upload the chunk to the part's URL
			const uploadResponse = await fetch(part.url, {
				method: "PUT",
				headers: uploadHeaders,
				body: chunkBuffer,
			});

			// Some storage services return 200/204 for successful uploads
			// Check for both ok status and specific success codes
			if (
				!uploadResponse.ok &&
				uploadResponse.status !== 200 &&
				uploadResponse.status !== 204
			) {
				const errorText = await uploadResponse.text();
				console.error("Polar upload error for part:", {
					partNumber: part.number,
					status: uploadResponse.status,
					statusText: uploadResponse.statusText,
					errorText: errorText,
					url: part.url.substring(0, 50) + "...", // Log partial URL for debugging
				});
				throw new Error(
					`Failed to upload file part ${part.number} to Polar storage: ${uploadResponse.status} ${uploadResponse.statusText}`
				);
			}

			// Capture ETag from response headers (case-insensitive)
			const etag =
				uploadResponse.headers.get("ETag") ||
				uploadResponse.headers.get("etag") ||
				uploadResponse.headers.get("Etag");

			if (etag) {
				// Remove quotes from ETag if present (ETags are often quoted)
				const cleanEtag = etag.replace(/^"|"$/g, "");
				uploadEtags.push(cleanEtag);
				console.log(`Captured ETag for part ${part.number}: ${cleanEtag}`);
			} else {
				console.warn(
					`No ETag header found in response for part ${part.number}`
				);
				// Some storage services might not return ETag, use empty string or null
				uploadEtags.push(null);
			}

			console.log(
				`Successfully uploaded part ${part.number} to storage (status: ${uploadResponse.status})`
			);
		}

		// Small delay to ensure upload is fully processed
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Step 3: Mark file as uploaded
		console.log(`Marking file ${fileId} as uploaded...`);
		const markUploadedResponse = await fetch(
			`${apiUrl}/v1/files/${fileId}/uploaded`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: fileData.upload.id,
					path: fileData.upload.path,
					parts: fileData.upload.parts.map((part, index) => {
						const partData = {
							number: part.number,
							checksum_sha256_base64: part.checksum_sha256_base64,
						};

						// Only include ETag if we captured one
						if (uploadEtags[index]) {
							partData.checksum_etag = uploadEtags[index];
						}

						return partData;
					}),
				}),
			}
		);

		if (!markUploadedResponse.ok) {
			const errorText = await markUploadedResponse.text();
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch (e) {
				errorData = { raw: errorText };
			}

			console.error("Polar mark uploaded error response:");
			console.error(
				"Status:",
				markUploadedResponse.status,
				markUploadedResponse.statusText
			);
			console.error("Error Data:", JSON.stringify(errorData, null, 2));

			// Log detailed validation errors if present
			if (errorData.detail) {
				console.error("Validation Details:");
				console.dir(errorData.detail, { depth: null });

				// Extract detailed validation errors
				if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
					const validationErrors = errorData.detail
						.map((err) => {
							if (typeof err === "object") {
								if (err.loc && err.msg) {
									return `${err.loc.join(".")}: ${err.msg}`;
								}
								return JSON.stringify(err);
							}
							return err;
						})
						.join("; ");

					throw new Error(
						`Failed to mark file as uploaded: ${errorData.message || errorData.error || "RequestValidationError"} - ${validationErrors}`
					);
				}
			}

			throw new Error(
				errorData.message ||
					errorData.error ||
					(Array.isArray(errorData.detail)
						? errorData.detail
								.map((e) =>
									typeof e === "object" && e.msg ? e.msg : JSON.stringify(e)
								)
								.join("; ")
						: JSON.stringify(errorData.detail)) ||
					`Failed to mark file as uploaded: ${markUploadedResponse.status} ${markUploadedResponse.statusText}`
			);
		}

		console.log("Successfully uploaded file to Polar:", fileId);
		return fileId;
	} catch (error) {
		console.error("Error uploading file to Polar:", {
			message: error.message,
			stack: error.stack,
			fileName: fileName,
			mimeType: mimeType,
			fileSize: fileBuffer?.length,
		});
		throw error;
	}
}

/**
 * Convert base64 string to Buffer
 * @param {string} base64String - Base64 encoded string (with or without data URL prefix)
 * @returns {Buffer} File buffer
 */
export function base64ToBuffer(base64String) {
	// Remove data URL prefix if present (e.g., "data:image/png;base64,...")
	const base64Data = base64String.includes(",")
		? base64String.split(",")[1]
		: base64String;
	return Buffer.from(base64Data, "base64");
}

/**
 * Get MIME type from base64 data URL or file extension
 * @param {string} base64String - Base64 string (may include data URL prefix)
 * @param {string} fileName - Optional file name for extension-based detection
 * @returns {string} MIME type
 */
export function getMimeType(base64String, fileName = null) {
	// Try to extract from data URL
	if (base64String.includes("data:")) {
		const mimeMatch = base64String.match(/data:([^;]+)/);
		if (mimeMatch) {
			return mimeMatch[1];
		}
	}

	// Fallback to extension-based detection
	if (fileName) {
		const ext = fileName.split(".").pop()?.toLowerCase();
		const mimeTypes = {
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			png: "image/png",
			gif: "image/gif",
			webp: "image/webp",
			svg: "image/svg+xml",
		};
		return mimeTypes[ext] || "application/octet-stream";
	}

	return "application/octet-stream";
}
