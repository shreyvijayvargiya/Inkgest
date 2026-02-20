import React from "react";
import { useAnalyticsTracking } from "../hooks/useAnalyticsTracking";

/**
 * Analytics Tracker Component
 * A reusable component for tracking analytics
 *
 * @param {Object} props - Component props
 * @param {boolean} props.enabled - Enable/disable tracking (default: true)
 * @param {boolean} props.skipAdminRoutes - Skip tracking on admin routes (default: true)
 * @param {number} props.delay - Delay before tracking in ms (default: 1000)
 * @param {Function} props.onTrackStart - Callback when tracking starts
 * @param {Function} props.onTrackComplete - Callback when tracking completes
 * @param {Function} props.onTrackError - Callback when tracking errors
 * @param {boolean} props.silent - Hide console logs (default: false)
 *
 * @example
 * // Basic usage - just place it in your app
 * <AnalyticsTracker />
 *
 * @example
 * // With callbacks
 * <AnalyticsTracker
 *   onTrackStart={() => console.log('Tracking started')}
 *   onTrackComplete={() => console.log('Tracking complete')}
 *   onTrackError={(error) => console.error('Tracking error', error)}
 * />
 *
 * @example
 * // Disable tracking conditionally
 * <AnalyticsTracker enabled={!isDevelopment} />
 */
const AnalyticsTracker = ({
	enabled = true,
	skipAdminRoutes = true,
	delay = 1000,
	onTrackStart,
	onTrackComplete,
	onTrackError,
	silent = false,
}) => {
	useAnalyticsTracking({
		enabled,
		skipAdminRoutes,
		delay,
		onTrackStart: silent
			? onTrackStart
			: () => {
					if (onTrackStart) onTrackStart();
					else if (!silent) console.log("🔍 Analytics tracking started");
			  },
		onTrackComplete: silent
			? onTrackComplete
			: () => {
					if (onTrackComplete) onTrackComplete();
					else if (!silent) console.log("✅ Analytics tracking complete");
			  },
		onTrackError: silent
			? onTrackError
			: (error) => {
					if (onTrackError) onTrackError(error);
					else if (!silent)
						console.error("❌ Analytics tracking error:", error);
			  },
	});

	// This component doesn't render anything
	return null;
};

export default AnalyticsTracker;
