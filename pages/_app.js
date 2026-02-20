import React from "react";
import { useRouter } from "next/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";
import "react-toastify/dist/ReactToastify.css";
import "../styles/globals.css";
import { store, persistor } from "../lib/store/store";
import SEO from "../lib/modules/SEO";
import AnalyticsTracker from "../lib/ui/AnalyticsTracker";
import PostHogProvider from "../lib/ui/PostHogProvider";

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000, // 5 minutes
		},
	},
});

const MyApp = ({ Component, pageProps }) => {
	const router = useRouter();
	const isAdminRoute = router.pathname.startsWith("/admin");

	// Only wrap with Redux for app routes (not admin)
	const AppComponent = isAdminRoute ? (
		<Component {...pageProps} />
	) : (
		<Provider store={store}>
			<PersistGate loading={null} persistor={persistor}>
				<Component {...pageProps} />
			</PersistGate>
		</Provider>
	);

	return (
		<QueryClientProvider client={queryClient}>
			{/* PostHog Provider - Session Replays & Product Analytics */}
			<PostHogProvider>
				{/* Automatic SEO tags based on route - configured in lib/config/seo.js */}
				<SEO />
				{/* Analytics Tracker - tracks once per session */}
				<AnalyticsTracker />
				{AppComponent}
				<ToastContainer
					position="top-right"
					autoClose={3000}
					hideProgressBar={false}
					newestOnTop={false}
					closeOnClick
					rtl={false}
					pauseOnFocusLoss
					draggable
					pauseOnHover
					theme="light"
				/>
				{/* Vercel Analytics - Web Performance & Visitor Metrics */}
				<Analytics />
			</PostHogProvider>
		</QueryClientProvider>
	);
};

export default MyApp;
