import {
	collection,
	doc,
	getDoc,
	addDoc,
	updateDoc,
	query,
	where,
	getDocs,
	orderBy,
	serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const ANALYTICS_COLLECTION = "app-analytics";

/**
 * Generate a browser fingerprint based on various browser characteristics
 * @returns {string} Browser fingerprint hash
 */
const generateFingerprint = () => {
	if (typeof window === "undefined") return null;

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	ctx.textBaseline = "top";
	ctx.font = "14px 'Arial'";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = "#f60";
	ctx.fillRect(125, 1, 62, 20);
	ctx.fillStyle = "#069";
	ctx.fillText("Browser fingerprint", 2, 15);
	ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
	ctx.fillText("Browser fingerprint", 4, 17);

	const fingerprint = [
		navigator.userAgent,
		navigator.language,
		screen.width + "x" + screen.height,
		new Date().getTimezoneOffset(),
		canvas.toDataURL(),
		navigator.hardwareConcurrency || 0,
		navigator.deviceMemory || 0,
		screen.colorDepth,
		window.devicePixelRatio || 1,
	].join("|");

	// Simple hash function
	let hash = 0;
	for (let i = 0; i < fingerprint.length; i++) {
		const char = fingerprint.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
};

/**
 * Get IP address and location data from IP geolocation API
 * @returns {Promise<Object>} Location data
 */
const getIPLocation = async () => {
	try {
		// Using ipapi.co for IP geolocation (free tier: 1000 requests/day)
		const response = await fetch("https://ipapi.co/json/");
		if (!response.ok) throw new Error("IP API failed");

		const data = await response.json();

		return {
			ipAddress: data.ip || null,
			country: data.country_name || null,
			countryCode: data.country_code || null,
			city: data.city || null,
			regionName: data.region || null,
			latitude: data.latitude || null,
			longitude: data.longitude || null,
			timezone: data.timezone || null,
			isp: data.org || null,
			locationSource: "ip",
		};
	} catch (error) {
		console.error("Error fetching IP location:", error);
		// Fallback: try alternative API
		try {
			const fallbackResponse = await fetch("https://ip-api.com/json/");
			if (fallbackResponse.ok) {
				const fallbackData = await fallbackResponse.json();
				return {
					ipAddress: fallbackData.query || null,
					country: fallbackData.country || null,
					countryCode: fallbackData.countryCode || null,
					city: fallbackData.city || null,
					regionName: fallbackData.regionName || null,
					latitude: fallbackData.lat || null,
					longitude: fallbackData.lon || null,
					timezone: fallbackData.timezone || null,
					isp: fallbackData.isp || null,
					locationSource: "ip",
				};
			}
		} catch (fallbackError) {
			console.error("Fallback IP API also failed:", fallbackError);
		}

		// Return minimal data if all APIs fail
		return {
			ipAddress: null,
			country: null,
			countryCode: null,
			city: null,
			regionName: null,
			latitude: null,
			longitude: null,
			timezone: null,
			isp: null,
			locationSource: "ip",
		};
	}
};

/**
 * Get browser GPS location if available
 * @returns {Promise<Object|null>} GPS location data or null
 */
const getBrowserLocation = () => {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}

		// Timeout after 5 seconds
		const timeout = setTimeout(() => {
			resolve(null);
		}, 5000);

		navigator.geolocation.getCurrentPosition(
			(position) => {
				clearTimeout(timeout);
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					locationSource: "browser",
				});
			},
			(error) => {
				clearTimeout(timeout);
				console.log("Geolocation error:", error.message);
				resolve(null);
			},
			{
				enableHighAccuracy: false,
				timeout: 5000,
				maximumAge: 60000, // Cache for 1 minute
			}
		);
	});
};

/**
 * Check if an analytics record with the given fingerprint exists
 * @param {string} fingerprint - Browser fingerprint
 * @returns {Promise<Object|null>} Analytics document if exists, null otherwise
 */
export const getAnalyticsByFingerprint = async (fingerprint) => {
	try {
		const q = query(
			collection(db, ANALYTICS_COLLECTION),
			where("fingerprint", "==", fingerprint)
		);

		const querySnapshot = await getDocs(q);
		if (!querySnapshot.empty) {
			const doc = querySnapshot.docs[0];
			return {
				id: doc.id,
				...doc.data(),
			};
		}
		return null;
	} catch (error) {
		console.error("Error getting analytics by fingerprint:", error);
		throw error;
	}
};

/**
 * Create a new analytics record
 * @param {Object} analyticsData - Analytics data object
 * @returns {Promise<string>} Document ID of created analytics record
 */
export const createAnalytics = async (analyticsData) => {
	try {
		const docRef = await addDoc(collection(db, ANALYTICS_COLLECTION), {
			...analyticsData,
			firstVisit: serverTimestamp(),
			lastVisit: serverTimestamp(),
			visitCount: 1,
		});

		return docRef.id;
	} catch (error) {
		console.error("Error creating analytics:", error);
		throw error;
	}
};

/**
 * Update analytics record's last visit timestamp and increment visit count
 * @param {string} analyticsId - Analytics document ID
 * @returns {Promise<void>}
 */
export const updateAnalyticsVisit = async (analyticsId) => {
	try {
		const analyticsRef = doc(db, ANALYTICS_COLLECTION, analyticsId);
		const analyticsDoc = await getDoc(analyticsRef);

		if (analyticsDoc.exists()) {
			const currentData = analyticsDoc.data();
			await updateDoc(analyticsRef, {
				lastVisit: serverTimestamp(),
				visitCount: (currentData.visitCount || 1) + 1,
			});
		}
	} catch (error) {
		console.error("Error updating analytics visit:", error);
		throw error;
	}
};

/**
 * Get all analytics records
 * @returns {Promise<Array>} Array of analytics documents
 */
export const getAllAnalytics = async () => {
	try {
		const q = query(
			collection(db, ANALYTICS_COLLECTION),
			orderBy("firstVisit", "desc")
		);

		const querySnapshot = await getDocs(q);
		const analytics = [];

		querySnapshot.forEach((doc) => {
			analytics.push({
				id: doc.id,
				...doc.data(),
			});
		});

		return analytics;
	} catch (error) {
		console.error("Error getting analytics:", error);
		throw error;
	}
};

/**
 * Track analytics - main function to be called on app load
 * Only runs once per session using sessionStorage
 */
export const trackAnalytics = async () => {
	// Check if already tracked in this session
	if (typeof window === "undefined") return;

	const sessionKey = "analytics_tracked";
	if (sessionStorage.getItem(sessionKey)) {
		console.log("Analytics already tracked in this session");
		return;
	}

	try {
		// Generate fingerprint
		const fingerprint = generateFingerprint();
		if (!fingerprint) {
			console.error("Failed to generate fingerprint");
			return;
		}

		// Get user agent
		const userAgent = navigator.userAgent || "Unknown";

		// Get IP-based location
		const ipLocation = await getIPLocation();

		// Try to get browser GPS location (non-blocking)
		const browserLocation = await getBrowserLocation();

		// Merge location data (prefer browser GPS if available)
		const locationData = browserLocation
			? {
					...ipLocation,
					latitude: browserLocation.latitude,
					longitude: browserLocation.longitude,
					locationSource: "browser",
			  }
			: ipLocation;

		// Prepare analytics data
		const analyticsData = {
			fingerprint,
			userAgent,
			...locationData,
		};

		// Check if analytics record already exists
		const existingAnalytics = await getAnalyticsByFingerprint(fingerprint);

		if (existingAnalytics) {
			// Update existing analytics record
			await updateAnalyticsVisit(existingAnalytics.id);
			console.log("Analytics visit updated:", existingAnalytics.id);
		} else {
			// Create new analytics record
			const analyticsId = await createAnalytics(analyticsData);
			console.log("New analytics record created:", analyticsId);
		}

		// Mark as tracked in this session
		sessionStorage.setItem(sessionKey, "true");
	} catch (error) {
		console.error("Error tracking analytics:", error);
		// Don't block the app if tracking fails
	}
};
