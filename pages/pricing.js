import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "../lib/store/hooks";
import { useSelector } from "react-redux";
import { useSubscription } from "../lib/hooks/useSubscription";
import LoginModal from "../lib/ui/LoginModal";
import ConfirmationModal from "../lib/ui/ConfirmationModal";
import {
	getUserCookie,
	removeUserCookie,
	setUserCookie,
} from "../lib/utils/cookies";
import { signInWithGoogle, onAuthStateChange } from "../lib/api/auth";
import { toast } from "react-toastify";

/* ─── Fonts ─── */
const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Outfit', sans-serif; background: #F7F5F0; -webkit-font-smoothing: antialiased; }
    button, input { font-family: 'Outfit', sans-serif; }
  `}</style>
);

const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
	sidebar: "#FDFCF9",
};

const PricingPage = () => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const authUnsubscribeRef = useRef(null);
	const reduxUser = useSelector((state) => state.user?.user ?? null);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [showCancelModal, setShowCancelModal] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Fetch subscription data
	useSubscription();
	const subscription = useAppSelector((state) => state.subscription);

	// Fetch user with React Query - checks cookie and sets up auth listener
	// Uses same queryKey as Navbar to share cache
	const { data: user } = useQuery({
		queryKey: ["currentUser"],
		queryFn: async () => {
			// Check for existing user in cookie first
			const cookieUser = getUserCookie();

			// Set up auth state listener to update query cache only once
			// This runs once when the query is first executed
			if (!authUnsubscribeRef.current) {
				const unsubscribe = onAuthStateChange(async (firebaseUser) => {
					if (firebaseUser) {
						const userData = {
							uid: firebaseUser.uid,
							email: firebaseUser.email,
							displayName:
								firebaseUser.displayName ||
								firebaseUser.email?.split("@")[0] ||
								"User",
							photoURL: firebaseUser.photoURL || null,
							provider:
								firebaseUser.providerData[0]?.providerId === "google.com"
									? "google"
									: "email",
						};
						setUserCookie(userData);
						// Update query cache with new user data
						queryClient.setQueryData(["currentUser"], userData);
					} else {
						removeUserCookie();
						// Update query cache to null
						queryClient.setQueryData(["currentUser"], null);
					}
				});

				// Store unsubscribe in a ref for cleanup
				authUnsubscribeRef.current = unsubscribe;
			}

			// Return initial user from cookie
			return cookieUser;
		},
		enabled: true,
		staleTime: Infinity, // Auth state is managed by Firebase listener
		gcTime: Infinity, // Keep in cache indefinitely
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	const handleGoogleLogin = async () => {
		try {
			await signInWithGoogle();
			// Invalidate user query to refetch after login
			queryClient.invalidateQueries({ queryKey: ["currentUser"] });
			toast.success("Logged in successfully!");
		} catch (error) {
			console.error("Google login error:", error);
			toast.error("Failed to login with Google. Please try again.");
		}
	};
	console.log(reduxUser, user);

	const plans = [
		{
			id: "4c4f2fa6-8cdf-4716-b56d-2a86e294bc78",
			name: "Free",
			price: "$0",
			period: "month",
			description: "Try inkgest with no commitment",
			features: [
				"3 drafts per month",
				"Newsletter, blog & thread formats",
				"InkgestURL scraping",
				"AI-powered writing",
				"Basic editor",
			],
			popular: false,
			type: "free",
		},
		{
			id: "9c912dd8-9153-48f9-bd30-2b6c97c184c8",
			name: "Pro",
			price: "$12",
			period: "month",
			description: "Unlimited drafts for serious creators",
			features: [
				"Unlimited drafts",
				"All content formats",
				"Multiple URL sources per draft",
				"Priority AI generation",
				"Full editor with save",
				"Priority support",
			],
			popular: true,
			type: "subscription",
		},
	];

	const handleCheckout = async (planId) => {
		// Check if user is logged in
		const user = getUserCookie();
		if (!user) {
			setShowLoginModal(true);
			return;
		}

		// Validate planId is provided
		if (!planId) {
			toast.error("Plan ID is required for checkout");
			console.error("Checkout attempted without planId");
			return;
		}

		// User is authenticated, proceed with checkout
		// planId is the Polar product ID stored in Firestore
		console.log("Initiating checkout with planId:", planId);
		try {
			const response = await fetch("/api/polar/checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					planId: planId, // This is the Polar product ID from the plans array
					customerId: subscription.customerId, // Optional: existing customer ID
				}),
			});

			const data = await response.json();

			if (response.ok && data.checkoutUrl) {
				window.location.href = data.checkoutUrl;
			} else {
				throw new Error(data.error || "Failed to create checkout");
			}
		} catch (error) {
			console.error("Error creating checkout:", error);
			alert("Failed to start checkout. Please try again.");
		}
	};

	const handleCancelSubscription = async () => {
		if (!subscription.customerId) {
			toast.error("Unable to cancel subscription. Customer ID not found.");
			return;
		}

		setIsCancelling(true);
		try {
			const response = await fetch("/api/polar/cancel-subscription", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					customerId: subscription.customerId,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success(
					"Subscription cancelled successfully. You'll have access until the end of your billing period.",
				);
				setShowCancelModal(false);
				// Invalidate subscription query to refetch updated data
				queryClient.invalidateQueries({ queryKey: ["subscription"] });
			} else {
				throw new Error(data.error || "Failed to cancel subscription");
			}
		} catch (error) {
			console.error("Error cancelling subscription:", error);
			toast.error(
				error.message || "Failed to cancel subscription. Please try again.",
			);
		} finally {
			setIsCancelling(false);
		}
	};

	const handleRefreshSubscription = async () => {
		setIsRefreshing(true);
		try {
			// Invalidate and refetch subscription data
			await queryClient.invalidateQueries({ queryKey: ["subscription"] });
			toast.success("Subscription data refreshed");
		} catch (error) {
			console.error("Error refreshing subscription:", error);
			toast.error("Failed to refresh subscription data");
		} finally {
			setIsRefreshing(false);
		}
	};

	// Format date for display
	const formatDate = (dateString) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch (error) {
			return "Invalid date";
		}
	};

	// Find the current plan from plans array based on planId
	const currentPlan = subscription.planId
		? plans.find((plan) => plan.id === subscription.planId)
		: null;

	const checkMark = "M20 6L9 17l-5-5";

	return (
		<>
			<Head>
				<title>Pricing — inkgest</title>
				<meta
					name="description"
					content="Simple, transparent pricing for inkgest."
				/>
			</Head>
			<FontLink />
			<div
				style={{
					minHeight: "100vh",
					background: T.base,
					fontFamily: "'Outfit', sans-serif",
				}}
			>
				{/* ── TOP BAR ── */}
				<div
					style={{
						height: 56,
						background: T.surface,
						borderBottom: `1px solid ${T.border}`,
						display: "flex",
						alignItems: "center",
						padding: "0 32px",
						gap: 16,
					}}
				>
					<a
						href="/app"
						style={{
							fontFamily: "'Instrument Serif',serif",
							fontSize: 20,
							color: T.accent,
							textDecoration: "none",
							display: "flex",
							alignItems: "center",
							gap: 7,
						}}
					>
						<motion.span
							whileHover={{ scale: 1.3 }}
							style={{
								width: 8,
								height: 8,
								borderRadius: "50%",
								background: T.warm,
								display: "inline-block",
							}}
						/>
						inkgest
					</a>
					<div style={{ flex: 1 }} />
					<motion.button
						whileHover={{ background: "#F0ECE5" }}
						whileTap={{ scale: 0.97 }}
						onClick={() => router.push("/app")}
						style={{
							background: "transparent",
							border: `1px solid ${T.border}`,
							borderRadius: 9,
							padding: "6px 14px",
							fontSize: 13,
							fontWeight: 600,
							color: T.muted,
							cursor: "pointer",
						}}
					>
						← Back to app
					</motion.button>
					{reduxUser || user ? (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								fontSize: 13,
								color: T.muted,
							}}
						>
							<div
								style={{
									width: 28,
									height: 28,
									borderRadius: "50%",
									background: T.border,
									overflow: "hidden",
								}}
							>
								{(reduxUser?.photoURL || user?.photoURL) && (
									<img
										src={reduxUser?.photoURL || user?.photoURL}
										alt=""
										style={{
											width: "100%",
											height: "100%",
											objectFit: "cover",
										}}
									/>
								)}
							</div>
							{reduxUser?.displayName || user?.displayName}
						</div>
					) : (
						<motion.button
							whileHover={{ scale: 1.03 }}
							whileTap={{ scale: 0.97 }}
							onClick={() => setShowLoginModal(true)}
							style={{
								background: T.accent,
								color: "white",
								border: "none",
								padding: "7px 16px",
								borderRadius: 9,
								fontSize: 13,
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							Sign in
						</motion.button>
					)}
				</div>

				{/* ── HERO ── */}
				<div style={{ textAlign: "center", padding: "64px 24px 48px" }}>
					<p
						style={{
							fontSize: 12,
							fontWeight: 700,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							color: T.warm,
							marginBottom: 14,
						}}
					>
						Pricing
					</p>
					<h1
						style={{
							fontFamily: "'Instrument Serif',serif",
							fontSize: "clamp(32px, 5vw, 52px)",
							color: T.accent,
							letterSpacing: "-1px",
							lineHeight: 1.1,
							marginBottom: 16,
						}}
					>
						Simple, honest pricing
					</h1>
					<p
						style={{
							fontSize: 16,
							color: T.muted,
							maxWidth: 460,
							margin: "0 auto",
						}}
					>
						Start for free. Upgrade when you need more. No hidden fees, no
						lock-in.
					</p>
				</div>

				{/* ── ACTIVE SUBSCRIPTION CARD ── */}
				{(user || reduxUser) && subscription.isSubscribed && (
					<div
						style={{ maxWidth: 680, margin: "0 auto 32px", padding: "0 24px" }}
					>
						<motion.div
							initial={{ opacity: 0, y: -12 }}
							animate={{ opacity: 1, y: 0 }}
							style={{
								background: T.accent,
								borderRadius: 16,
								padding: "24px 28px",
								color: "white",
								display: "flex",
								alignItems: "flex-start",
								justifyContent: "space-between",
								gap: 16,
							}}
						>
							<div>
								<p
									style={{
										fontSize: 11,
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.08em",
										color: "rgba(255,255,255,0.5)",
										marginBottom: 8,
									}}
								>
									Current Plan
								</p>
								<p
									style={{
										fontFamily: "'Instrument Serif',serif",
										fontSize: 22,
										marginBottom: 4,
									}}
								>
									{subscription.planName || "Pro"}
								</p>
								<div style={{ display: "flex", gap: 20, marginTop: 10 }}>
									<div>
										<p
											style={{
												fontSize: 11,
												color: "rgba(255,255,255,0.5)",
												marginBottom: 2,
											}}
										>
											Status
										</p>
										<p
											style={{
												fontSize: 13,
												fontWeight: 600,
												color:
													subscription.status === "active"
														? "#86EFAC"
														: "#FCA5A5",
											}}
										>
											{subscription.status || "active"}
										</p>
									</div>
									<div>
										<p
											style={{
												fontSize: 11,
												color: "rgba(255,255,255,0.5)",
												marginBottom: 2,
											}}
										>
											Renews
										</p>
										<p style={{ fontSize: 13, fontWeight: 600 }}>
											{formatDate(subscription.expiresAt)}
										</p>
									</div>
								</div>
							</div>
							<motion.button
								whileHover={{ background: "rgba(255,255,255,0.12)" }}
								whileTap={{ scale: 0.97 }}
								onClick={handleRefreshSubscription}
								disabled={isRefreshing}
								title="Refresh"
								style={{
									background: "rgba(255,255,255,0.08)",
									border: "none",
									borderRadius: 9,
									padding: "8px 10px",
									cursor: "pointer",
									color: "white",
									display: "flex",
									alignItems: "center",
								}}
							>
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									style={{
										animation: isRefreshing
											? "spin 1s linear infinite"
											: "none",
									}}
								>
									<path d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
								</svg>
							</motion.button>
						</motion.div>
					</div>
				)}

				{/* ── PLAN CARDS ── */}
				<div
					style={{
						maxWidth: 760,
						margin: "0 auto",
						padding: "0 24px 80px",
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
						gap: 20,
					}}
				>
					{plans.map((plan, idx) => (
						<motion.div
							key={plan.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: idx * 0.1 }}
							style={{
								background: plan.popular ? T.accent : T.surface,
								border: `1.5px solid ${plan.popular ? T.accent : T.border}`,
								borderRadius: 16,
								padding: "32px 28px",
								position: "relative",
							}}
						>
							{plan.popular && (
								<div
									style={{
										position: "absolute",
										top: -13,
										left: "50%",
										transform: "translateX(-50%)",
									}}
								>
									<span
										style={{
											background: T.warm,
											color: "white",
											fontSize: 11,
											fontWeight: 700,
											padding: "3px 12px",
											borderRadius: 100,
											whiteSpace: "nowrap",
										}}
									>
										Most popular
									</span>
								</div>
							)}

							{/* Plan header */}
							<div style={{ marginBottom: 24 }}>
								<p
									style={{
										fontSize: 12,
										fontWeight: 700,
										textTransform: "uppercase",
										letterSpacing: "0.08em",
										color: plan.popular ? "rgba(255,255,255,0.5)" : T.muted,
										marginBottom: 6,
									}}
								>
									{plan.name}
								</p>
								<div
									style={{
										display: "flex",
										alignItems: "baseline",
										gap: 4,
										marginBottom: 8,
									}}
								>
									<span
										style={{
											fontFamily: "'Instrument Serif',serif",
											fontSize: 44,
											color: plan.popular ? "white" : T.accent,
											lineHeight: 1,
										}}
									>
										{plan.price}
									</span>
									{plan.period && (
										<span
											style={{
												fontSize: 14,
												color: plan.popular ? "rgba(255,255,255,0.5)" : T.muted,
											}}
										>
											/{plan.period}
										</span>
									)}
								</div>
								<p
									style={{
										fontSize: 13,
										color: plan.popular ? "rgba(255,255,255,0.65)" : T.muted,
										lineHeight: 1.5,
									}}
								>
									{plan.description}
								</p>
							</div>

							{/* Features */}
							<ul style={{ listStyle: "none", marginBottom: 28 }}>
								{plan.features.map((f, i) => (
									<li
										key={i}
										style={{
											display: "flex",
											alignItems: "flex-start",
											gap: 10,
											marginBottom: 10,
										}}
									>
										<svg
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke={plan.popular ? T.warm : "#3D7A35"}
											strokeWidth="2.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											style={{ flexShrink: 0, marginTop: 2 }}
										>
											<path d={checkMark} />
										</svg>
										<span
											style={{
												fontSize: 13,
												color: plan.popular
													? "rgba(255,255,255,0.8)"
													: T.accent,
												lineHeight: 1.5,
											}}
										>
											{f}
										</span>
									</li>
								))}
							</ul>

							{/* CTA button */}
							{plan.type === "free" ? (
								<motion.button
									whileHover={{ background: "#F0ECE5" }}
									whileTap={{ scale: 0.97 }}
									onClick={() => router.push("/app")}
									style={{
										width: "100%",
										padding: "13px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 700,
										cursor: "pointer",
										background: T.base,
										border: `1.5px solid ${T.border}`,
										color: T.accent,
										transition: "all 0.18s",
									}}
								>
									Start for free →
								</motion.button>
							) : subscription.isSubscribed &&
							  subscription.status === "active" &&
							  subscription.planId === plan.id ? (
								<div
									style={{ display: "flex", flexDirection: "column", gap: 8 }}
								>
									<div
										style={{
											width: "100%",
											padding: "13px",
											borderRadius: 11,
											fontSize: 14,
											fontWeight: 700,
											background: "rgba(255,255,255,0.12)",
											color: "white",
											textAlign: "center",
											border: "1.5px solid rgba(255,255,255,0.2)",
										}}
									>
										✓ Active plan
									</div>
									<motion.button
										whileHover={{ background: "#FEE2E2" }}
										whileTap={{ scale: 0.97 }}
										onClick={() => setShowCancelModal(true)}
										style={{
											width: "100%",
											padding: "10px",
											borderRadius: 11,
											fontSize: 13,
											fontWeight: 600,
											cursor: "pointer",
											background: "transparent",
											border: "1.5px solid rgba(239,68,68,0.4)",
											color: "#FCA5A5",
											transition: "all 0.18s",
										}}
									>
										Cancel subscription
									</motion.button>
								</div>
							) : user || reduxUser ? (
								<motion.button
									whileHover={{
										scale: 1.02,
										y: -1,
										boxShadow: "0 8px 24px rgba(193,123,47,0.3)",
									}}
									whileTap={{ scale: 0.97 }}
									onClick={() => handleCheckout(plan.id)}
									style={{
										width: "100%",
										padding: "13px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 700,
										cursor: "pointer",
										background: T.warm,
										border: "none",
										color: "white",
										transition: "all 0.18s",
									}}
								>
									Subscribe — {plan.price}/mo →
								</motion.button>
							) : (
								<motion.button
									whileHover={{
										scale: 1.02,
										y: -1,
										boxShadow: "0 8px 24px rgba(193,123,47,0.3)",
									}}
									whileTap={{ scale: 0.97 }}
									onClick={() => setShowLoginModal(true)}
									style={{
										width: "100%",
										padding: "13px",
										borderRadius: 11,
										fontSize: 14,
										fontWeight: 700,
										cursor: "pointer",
										background: T.warm,
										border: "none",
										color: "white",
										transition: "all 0.18s",
									}}
								>
									Sign in to subscribe →
								</motion.button>
							)}
						</motion.div>
					))}
				</div>

				{/* ── FAQ row ── */}
				<div
					style={{ maxWidth: 680, margin: "0 auto 80px", padding: "0 24px" }}
				>
					<div
						style={{
							background: T.surface,
							border: `1px solid ${T.border}`,
							borderRadius: 16,
							padding: "28px 32px",
						}}
					>
						<p
							style={{
								fontSize: 12,
								fontWeight: 700,
								textTransform: "uppercase",
								letterSpacing: "0.08em",
								color: T.warm,
								marginBottom: 20,
							}}
						>
							Common questions
						</p>
						{[
							[
								"What counts as a draft?",
								"Each time you click 'Generate draft' it uses one of your monthly drafts.",
							],
							[
								"Does the free plan renew monthly?",
								"Yes — your 3 free drafts reset on the 1st of each month.",
							],
							[
								"Can I cancel anytime?",
								"Absolutely. Pro subscriptions can be cancelled at any time with no penalty.",
							],
						].map(([q, a]) => (
							<div key={q} style={{ marginBottom: 18 }}>
								<p
									style={{
										fontSize: 14,
										fontWeight: 600,
										color: T.accent,
										marginBottom: 4,
									}}
								>
									{q}
								</p>
								<p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
									{a}
								</p>
							</div>
						))}
					</div>
				</div>
			</div>

			<LoginModal
				isOpen={showLoginModal}
				onClose={() => setShowLoginModal(false)}
			/>

			<ConfirmationModal
				isOpen={showCancelModal}
				onClose={() => setShowCancelModal(false)}
				onConfirm={handleCancelSubscription}
				title="Cancel Subscription"
				message="Are you sure you want to cancel? You'll keep Pro access until the end of the billing period."
				confirmText={isCancelling ? "Cancelling..." : "Yes, cancel"}
				cancelText="Keep subscription"
				variant="danger"
			/>
		</>
	);
};

export default PricingPage;
