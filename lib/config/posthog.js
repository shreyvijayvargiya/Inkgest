// lib/config/posthog.js
export const posthogConfig = {
	apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
	apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
	
	// Feature flags
	loaded: (posthog) => {
		if (process.env.NODE_ENV === "development") {
			console.log("✅ PostHog loaded:", posthog);
		}
	},
	
	// Session replay configuration
	capture_pageview: true,
	capture_pageleave: true,
	
	// Privacy settings
	respect_dnt: true,
	
	// Advanced settings
	autocapture: true,
	disable_session_recording: false,
	session_recording: {
		maskAllInputs: true,
		maskTextSelector: "[data-ph-mask]",
		blockSelector: "[data-ph-block]",
		ignoreSelector: "[data-ph-ignore]",
		recordCrossOriginIframes: false,
	},
	
	// Person profiles
	persistence: "localStorage+cookie",
	
	// Debug mode (development only)
	debug: process.env.NODE_ENV === "development",
};
