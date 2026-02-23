/**
 * Verifies a Firebase ID token using the Firebase REST Auth API.
 *
 * Why this approach:
 *   – firebase-admin is not installed; this achieves the same token verification
 *     via Google's public `accounts:lookup` REST endpoint.
 *   – The Google endpoint validates the JWT signature, project audience, and
 *     expiry — identical checks to firebase-admin.verifyIdToken().
 *   – Requires only NEXT_PUBLIC_FIREBASE_API_KEY (already in env).
 *
 * @param {string} idToken  Firebase ID token from `user.getIdToken()` on the client
 * @returns {Promise<string>}  The cryptographically verified Firebase UID
 * @throws {Error}  If the token is invalid, expired, or the project key is missing
 */
export async function verifyFirebaseToken(idToken) {
	if (!idToken || typeof idToken !== "string") {
		throw new Error("No authentication token provided.");
	}

	const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
	if (!apiKey) {
		throw new Error(
			"Server configuration error: NEXT_PUBLIC_FIREBASE_API_KEY is not set.",
		);
	}

	const res = await fetch(
		`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ idToken }),
		},
	);

	const data = await res.json().catch(() => ({}));

	if (!res.ok) {
		const code = data?.error?.message || "";
		if (code === "INVALID_ID_TOKEN" || code === "TOKEN_EXPIRED") {
			throw new Error("Your session has expired. Please sign in again.");
		}
		throw new Error("Authentication failed. Please sign in again.");
	}

	const user = data.users?.[0];
	if (!user?.localId) {
		throw new Error("Could not verify your identity. Please sign in again.");
	}

	return user.localId; // verified Firebase UID
}
