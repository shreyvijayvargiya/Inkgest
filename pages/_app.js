import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { Analytics } from "@vercel/analytics/react";
import "../styles/globals.css";
import { store, persistor } from "../lib/store/store";
import SEO from "../lib/modules/SEO";
import AnalyticsTracker from "../lib/ui/AnalyticsTracker";
import PostHogProvider from "../lib/ui/PostHogProvider";
import { Toaster } from "sonner";

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
	return (
		<QueryClientProvider client={queryClient}>
			{/* PostHog Provider - Session Replays & Product Analytics */}
			<PostHogProvider>
				<Provider store={store}>
					<PersistGate loading={null} persistor={persistor}>
						{/* Automatic SEO tags based on route - configured in lib/config/seo.js */}
						<SEO />
						{/* Analytics Tracker - tracks once per session */}
						<AnalyticsTracker />
						<Component {...pageProps} />
					</PersistGate>
				</Provider>
				<Toaster />
				{/* Vercel Analytics - Web Performance & Visitor Metrics */}
				<Analytics />
			</PostHogProvider>
		</QueryClientProvider>
	);
};

export default MyApp;
