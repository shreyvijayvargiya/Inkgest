import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { trackAnalytics } from "../api/analytics";

/**
 * Custom hook for analytics tracking using React Query
 * Tracks analytics once per session with optimized caching and error handling
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable/disable tracking (default: true)
 * @param {boolean} options.skipAdminRoutes - Skip tracking on admin routes (default: true)
 * @param {number} options.delay - Delay before tracking in ms (default: 1000)
 * @param {Function} options.onTrackStart - Callback when tracking starts
 * @param {Function} options.onTrackComplete - Callback when tracking completes
 * @param {Function} options.onTrackError - Callback when tracking errors
 * @param {number} options.retry - Number of retries on failure (default: 1)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 *
 * @example
 * // Basic usage
 * useAnalyticsTracking();
 *
 * @example
 * // With options
 * useAnalyticsTracking({
 *   enabled: true,
 *   delay: 2000,
 *   onTrackComplete: () => console.log('Tracking complete')
 * });
 */
export const useAnalyticsTracking = (options = {}) => {
	const {
		enabled = true,
		skipAdminRoutes = true,
		delay = 1000,
		onTrackStart,
		onTrackComplete,
		onTrackError,
		retry = 1,
		retryDelay = 1000,
	} = options;

	const hasTracked = useRef(false);
	const timeoutRef = useRef(null);

	// Use React Query mutation for tracking
	const mutation = useMutation({
		mutationFn: trackAnalytics,
		retry,
		retryDelay,
		onMutate: () => {
			// Call onTrackStart callback
			if (onTrackStart) {
				onTrackStart();
			}
		},
		onSuccess: () => {
			hasTracked.current = true;
			// Call onTrackComplete callback
			if (onTrackComplete) {
				onTrackComplete();
			}
		},
		onError: (error) => {
			console.error("Analytics tracking error:", error);
			// Call onTrackError callback
			if (onTrackError) {
				onTrackError(error);
			}
		},
		// Prevent duplicate tracking in the same session
		gcTime: Infinity, // Keep in cache forever (session-based)
		staleTime: Infinity, // Never consider stale
	});

	useEffect(() => {
		// Only run on client-side
		if (typeof window === "undefined") return;

		// Check if already tracked
		if (hasTracked.current) return;

		// Check if tracking is enabled
		if (!enabled) return;

		// Check if we should skip admin routes
		if (skipAdminRoutes && window.location.pathname.startsWith("/admin")) {
			return;
		}

		// Check sessionStorage to prevent duplicate tracking
		const sessionKey = "analytics_tracked";
		if (sessionStorage.getItem(sessionKey)) {
			hasTracked.current = true;
			return;
		}

		// Set up tracking with delay
		timeoutRef.current = setTimeout(() => {
			// Only mutate if not already tracked
			if (!hasTracked.current && !mutation.isPending) {
				mutation.mutate();
			}
		}, delay);

		// Cleanup
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [enabled, skipAdminRoutes, delay, mutation]);

	// Return mutation state for advanced usage
	return mutation;
};
