/** Client-side agent API URL — hit backend directly. */
export const INKGEST_AGENT_URL =
	process.env.NEXT_PUBLIC_INKGEST_AGENT_URL ||
	"https://api.buildsaas.dev/inkgest-agent";

/**
 * Headers for inkgest-agent API. Pass Firebase uid as Authorization (logged-in users only).
 */
export function inkgestAgentRequestHeaders(userId) {
	const headers = {
		"Content-Type": "application/json",
	};
	if (userId != null && String(userId).trim() !== "") {
		headers.Authorization = String(userId);
	}
	return headers;
}
