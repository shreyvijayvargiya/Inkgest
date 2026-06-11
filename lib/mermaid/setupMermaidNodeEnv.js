/**
 * Mermaid v11 expects browser globals (window/document) and a DOMPurify instance
 * with `.addHook`. In Node the dompurify default export is a factory — without
 * jsdom, `mermaid.parse()` throws "DOMPurify.addHook is not a function".
 */

let envReady = false;

export async function ensureMermaidNodeEnv() {
	if (envReady) return;
	if (typeof window !== "undefined" && typeof document !== "undefined") {
		envReady = true;
		return;
	}
	const { JSDOM } = await import("jsdom");
	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
	globalThis.window = dom.window;
	globalThis.document = dom.window.document;
	envReady = true;
}

/** Reset for tests only. */
export function resetMermaidNodeEnvForTests() {
	envReady = false;
}
