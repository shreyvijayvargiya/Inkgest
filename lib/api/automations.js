/**
 * Client helpers for automation-related server APIs.
 * Keep server credentials on the server (pages/api/*). This file only calls those endpoints.
 */

export async function generateNewsletterFromSources({ urls, prompt, model }) {
	const response = await fetch("/api/automations/newsletter-generate", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ urls, prompt, model }),
	});

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data?.error || "Failed to generate");
	}
	return data;
}

export async function runHttpRequest({
	method,
	url,
	headersJson,
	paramsJson,
	bodyText,
	authType,
	bearerToken,
	apiKeyName,
	apiKeyValue,
	apiKeyIn,
}) {
	const response = await fetch("/api/automations/http-request", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			method,
			url,
			headersJson,
			paramsJson,
			bodyText,
			authType,
			bearerToken,
			apiKeyName,
			apiKeyValue,
			apiKeyIn,
		}),
	});

	const data = await response.json();
	if (!response.ok) {
		throw new Error(data?.error || "Request failed");
	}
	return data;
}
