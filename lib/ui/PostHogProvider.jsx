// lib/ui/PostHogProvider.jsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import posthog from "posthog-js";
import { posthogConfig } from "../config/posthog";

const PostHogProvider = ({ children }) => {
	const router = useRouter();

	useEffect(() => {
		// Initialize PostHog only if API key is provided
		if (!posthogConfig.apiKey) {
			if (process.env.NODE_ENV === "development") {
				console.warn("⚠️ PostHog API key not found. PostHog will not be initialized.");
			}
			return;
		}

		// Initialize PostHog
		posthog.init(posthogConfig.apiKey, {
			api_host: posthogConfig.apiHost,
			loaded: posthogConfig.loaded,
			capture_pageview: posthogConfig.capture_pageview,
			capture_pageleave: posthogConfig.capture_pageleave,
			autocapture: posthogConfig.autocapture,
			disable_session_recording: posthogConfig.disable_session_recording,
			session_recording: posthogConfig.session_recording,
			persistence: posthogConfig.persistence,
			debug: posthogConfig.debug,
			respect_dnt: posthogConfig.respect_dnt,
		});

		// Track page views
		const handleRouteChange = () => {
			posthog.capture("$pageview");
		};

		router.events.on("routeChangeComplete", handleRouteChange);

		return () => {
			router.events.off("routeChangeComplete", handleRouteChange);
		};
	}, [router.events]);

	return <>{children}</>;
};

export default PostHogProvider;
