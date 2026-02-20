// lib/utils/posthog.js
import posthog from "posthog-js";

/**
 * Check if PostHog is initialized
 */
export const isPostHogReady = () => {
	return typeof window !== "undefined" && posthog.__loaded;
};

/**
 * Identify a user
 * @param {string} userId - User ID
 * @param {Object} properties - User properties
 */
export const identifyUser = (userId, properties = {}) => {
	if (!isPostHogReady()) return;

	posthog.identify(userId, properties);
};

/**
 * Reset user identification (on logout)
 */
export const resetUser = () => {
	if (!isPostHogReady()) return;

	posthog.reset();
};

/**
 * Track a custom event
 * @param {string} eventName - Event name
 * @param {Object} properties - Event properties
 */
export const trackEvent = (eventName, properties = {}) => {
	if (!isPostHogReady()) return;

	posthog.capture(eventName, properties);
};

/**
 * Set user properties
 * @param {Object} properties - User properties
 */
export const setUserProperties = (properties) => {
	if (!isPostHogReady()) return;

	posthog.setPersonProperties(properties);
};

/**
 * Get feature flag value
 * @param {string} flagKey - Feature flag key
 * @param {any} defaultValue - Default value if flag not found
 * @returns {any} Feature flag value
 */
export const getFeatureFlag = (flagKey, defaultValue = false) => {
	if (!isPostHogReady()) return defaultValue;

	return posthog.isFeatureEnabled(flagKey) ?? defaultValue;
};

/**
 * Start session replay
 */
export const startSessionReplay = () => {
	if (!isPostHogReady()) return;

	posthog.startSessionRecording();
};

/**
 * Stop session replay
 */
export const stopSessionReplay = () => {
	if (!isPostHogReady()) return;

	posthog.stopSessionRecording();
};

/**
 * Check if session replay is active
 */
export const isSessionReplayActive = () => {
	if (!isPostHogReady()) return false;

	return posthog.sessionRecordingStarted();
};

export default posthog;
