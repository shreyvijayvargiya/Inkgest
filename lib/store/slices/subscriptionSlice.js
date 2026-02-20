import { createSlice } from "@reduxjs/toolkit";

/**
 * Convert Firestore Timestamp to ISO string (serializable)
 * @param {any} timestamp - Firestore Timestamp, Date, or null
 * @returns {string|null} ISO string or null
 */
const convertTimestamp = (timestamp) => {
	if (!timestamp) return null;
	
	// If it's a Firestore Timestamp, convert it
	if (timestamp.toDate && typeof timestamp.toDate === "function") {
		return timestamp.toDate().toISOString();
	}
	
	// If it's already a Date object
	if (timestamp instanceof Date) {
		return timestamp.toISOString();
	}
	
	// If it's already a string, return as is
	if (typeof timestamp === "string") {
		return timestamp;
	}
	
	// Try to convert to Date and then ISO string
	try {
		return new Date(timestamp).toISOString();
	} catch (error) {
		console.error("Error converting timestamp:", error);
		return null;
	}
};

const initialState = {
	isSubscribed: false,
	planName: null,
	planId: null,
	customerId: null,
	status: null, // active, canceled, expired
	expiresAt: null,
	loading: false,
	error: null,
};

const subscriptionSlice = createSlice({
	name: "subscription",
	initialState,
	reducers: {
		setSubscription: (state, action) => {
			state.isSubscribed = action.payload.isSubscribed || false;
			state.planName = action.payload.planName || null;
			state.planId = action.payload.planId || null;
			state.customerId = action.payload.customerId || null;
			state.status = action.payload.status || null;
			// Convert Timestamp to ISO string to ensure serializability
			state.expiresAt = convertTimestamp(action.payload.expiresAt);
			state.loading = false;
			state.error = null;
		},
		clearSubscription: (state) => {
			state.isSubscribed = false;
			state.planName = null;
			state.planId = null;
			state.customerId = null;
			state.status = null;
			state.expiresAt = null;
			state.loading = false;
			state.error = null;
		},
		setLoading: (state, action) => {
			state.loading = action.payload;
		},
		setError: (state, action) => {
			state.error = action.payload;
			state.loading = false;
		},
	},
});

export const { setSubscription, clearSubscription, setLoading, setError } =
	subscriptionSlice.actions;

export default subscriptionSlice.reducer;

