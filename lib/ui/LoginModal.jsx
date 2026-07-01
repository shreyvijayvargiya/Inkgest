import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, User } from "lucide-react";
import { useDispatch } from "react-redux";
import {
	signInWithGoogle,
	signOutUser,
	onAuthStateChange,
} from "../api/auth";
import {
	setUserCookie,
	getUserCookie,
	removeUserCookie,
} from "../utils/cookies";
import { setUser, clearUser } from "../store/slices/userSlice";
import { toast } from "sonner";
import { useRouter } from "next/router";
import {
	getUserCredits,
	FREE_CREDIT_LIMIT,
	formatRenewalDate,
} from "../utils/credits";

const CREDIT_COSTS = [
	{ label: "AI Draft / Newsletter", cost: "1 credit" },
	{ label: "URL Scrape", cost: "1 credit" },
	{ label: "Table Creator (scrape + AI)", cost: "2 credits" },
	{ label: "AI Chat message", cost: "¼ credit" },
	{ label: "Blank Draft", cost: "Free" },
];

const DOT_COUNT = 48;

function AnimatedDotsBackground() {
	return (
		<div
			className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-6 gap-3 p-3 opacity-40"
			aria-hidden
		>
			{Array.from({ length: DOT_COUNT }).map((_, i) => (
				<motion.span
					key={i}
					className="h-1 w-1 justify-self-center self-center rounded-full bg-zinc-800/35"
					animate={{
						opacity: [0.15, 0.65, 0.15],
						scale: [0.75, 1.35, 0.75],
					}}
					transition={{
						duration: 2.2 + (i % 4) * 0.35,
						repeat: Infinity,
						ease: "easeInOut",
						delay: (i % 12) * 0.12,
					}}
				/>
			))}
		</div>
	);
}

function GoogleIcon({ className }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

const LoginModal = ({ isOpen, onClose }) => {
	const dispatch = useDispatch();
	const [isLoading, setIsLoading] = useState(false);
	const [user, setLocalUser] = useState(null);
	const [credits, setCredits] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const cookieUser = getUserCookie();
		setLocalUser(cookieUser || null);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

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
				setLocalUser(userData);
				dispatch(setUser(userData));
				getUserCredits(firebaseUser.uid).then(setCredits).catch(() => {});
			} else {
				removeUserCookie();
				setLocalUser(null);
				setCredits(null);
				dispatch(clearUser());
			}
		});

		return () => unsubscribe();
	}, [isOpen, dispatch]);

	const handleGoogleLogin = async () => {
		setIsLoading(true);
		try {
			await signInWithGoogle();
		} catch (error) {
			console.error("Google login error:", error);
			toast.error(
				error.message || "Failed to login with Google. Please try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = async () => {
		setIsLoading(true);
		try {
			await signOutUser();
			removeUserCookie();
			setLocalUser(null);
			dispatch(clearUser());
			toast.success("Logged out successfully!");
			onClose();
		} catch (error) {
			console.error("Logout error:", error);
			toast.error("Failed to logout. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen) return null;

	const creditUsageRatio = credits
		? Math.min(1, credits.creditsUsed / credits.creditsLimit)
		: 0;
	const creditsExhausted =
		credits && credits.creditsUsed >= credits.creditsLimit;
	const creditsWarning =
		credits &&
		!creditsExhausted &&
		credits.creditsUsed >= credits.creditsLimit * 0.8;

	return (
		<AnimatePresence>
			{!user && <AnimatedDotsBackground />}
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						onClick={(e) => e.stopPropagation()}
						className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#F7F5F0] shadow-2xl"
					>
						

						<div className="relative z-10 flex items-center justify-between border-b border-[#E8E4DC] p-4">
							<h3 className="text-lg text-zinc-900">
								{user ? "Account" : "Login"}
							</h3>
							<button
								type="button"
								onClick={onClose}
								className="p-2 text-zinc-400 transition-colors hover:text-zinc-600"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="relative z-10 p-6">
							{user ? (
								<div className="flex flex-col gap-4">
									<div className="flex items-center gap-3.5">
										{user.photoURL ? (
											<img
												src={user.photoURL}
												alt={user.displayName}
												className="h-[52px] w-[52px] shrink-0 rounded-full border-2 border-[#E8E4DC] object-cover"
											/>
										) : (
											<div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#E8E4DC]">
												<User className="h-[22px] w-[22px] text-[#7A7570]" />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="mb-0.5 truncate text-[15px] font-bold text-[#1A1A1A]">
												{user.displayName}
											</p>
											<p className="truncate text-xs text-[#7A7570]">
												{user.email}
											</p>
										</div>
										{credits?.plan === "pro" ? (
											<span className="shrink-0 rounded-full border border-[#F5C97A] bg-[#FEF3E2] px-2.5 py-0.5 text-[11px] font-bold text-[#C17B2F]">
												Pro ✦
											</span>
										) : (
											<span className="shrink-0 rounded-full border border-[#E8E4DC] bg-[#F7F5F0] px-2.5 py-0.5 text-[11px] font-bold text-[#7A7570]">
												Free
											</span>
										)}
									</div>

									<div className="rounded-xl border border-[#E8E4DC] bg-[#F7F5F0] px-4 py-3.5">
										{credits?.plan === "pro" ? (
											<div className="flex items-center justify-between">
												<div>
													<p className="mb-0.5 text-[13px] font-bold text-[#1A1A1A]">
														Unlimited credits
													</p>
													<p className="text-[11.5px] text-[#7A7570]">
														Pro plan — no monthly limits
													</p>
												</div>
												<span className="text-xl">∞</span>
											</div>
										) : (
											<>
												<div className="mb-2 flex items-baseline justify-between">
													<p className="text-[13px] font-bold text-[#1A1A1A]">
														Monthly credits
													</p>
													<p
														className={`text-xs font-bold ${
															creditsExhausted
																? "text-red-500"
																: "text-[#1A1A1A]"
														}`}
													>
														{credits
															? `${+credits.creditsUsed.toFixed(2)} / ${credits.creditsLimit}`
															: `— / ${FREE_CREDIT_LIMIT}`}
													</p>
												</div>

												<div className="mb-2 h-[7px] overflow-hidden rounded-full bg-[#E8E4DC]">
													<motion.div
														className={`h-full w-full origin-left rounded-full ${
															creditsExhausted
																? "bg-red-500"
																: creditsWarning
																	? "bg-[#C17B2F]"
																	: "bg-[#4A7C59]"
														}`}
														initial={{ scaleX: 0 }}
														animate={{ scaleX: creditUsageRatio }}
														transition={{
															duration: 0.6,
															ease: "easeOut",
														}}
													/>
												</div>

												<p className="mb-3 text-[11px] text-[#7A7570]">
													{credits
														? creditsExhausted
															? "No credits left this month."
															: `${+(credits.creditsLimit - credits.creditsUsed).toFixed(2)} credits remaining · renews ${credits.renewsAt ? formatRenewalDate(credits.renewsAt) : "monthly"}`
														: "Loading…"}
												</p>

												<div className="flex flex-col gap-1.5 border-t border-[#E8E4DC] pt-2.5">
													{CREDIT_COSTS.map((row) => (
														<div
															key={row.label}
															className="flex items-center justify-between"
														>
															<span className="text-[11.5px] text-[#7A7570]">
																{row.label}
															</span>
															<span
																className={`rounded-full border px-1.5 py-px text-[11px] font-bold ${
																	row.cost === "Free"
																		? "border-[#E8E4DC] bg-[#DCFCE7] text-[#4A7C59]"
																		: "border-[#E8E4DC] bg-white text-[#1A1A1A]"
																}`}
															>
																{row.cost}
															</span>
														</div>
													))}
												</div>
											</>
										)}
									</div>

									{credits?.plan !== "pro" && (
										<motion.button
											type="button"
											whileHover={{ scale: 1.02, y: -1 }}
											whileTap={{ scale: 0.97 }}
											onClick={() => {
												router.push("/pricing");
												onClose();
											}}
											className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border-none bg-[#1A1A1A] px-4 py-2.5 font-['Comic',sans-serif] text-[13px] font-bold text-white"
										>
											<span>✦</span> Upgrade to Pro — unlimited credits
										</motion.button>
									)}

									<motion.button
										type="button"
										whileHover={{ scale: 1.01 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleLogout}
										disabled={isLoading}
										className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#E8E4DC] bg-transparent px-4 py-2 font-['Comic',sans-serif] text-[13px] font-semibold text-[#7A7570] disabled:cursor-not-allowed disabled:opacity-50"
									>
										<LogOut className="h-3.5 w-3.5" />
										{isLoading ? "Logging out…" : "Log out"}
									</motion.button>
								</div>
							) : (
								<div className="flex flex-col items-center gap-6 text-center">
									<div className="flex flex-col items-center gap-2">
										<motion.span
											className="inline-block h-2.5 w-2.5 rounded-full bg-[#C17B2F]"
											animate={{ scale: [1, 1.2, 1] }}
											transition={{
												duration: 2,
												repeat: Infinity,
												ease: "easeInOut",
											}}
										/>
										<h2 className="font-['Comic',sans-serif] text-2xl font-semibold tracking-tight text-[#1A1A1A]">
											inkgest
										</h2>
										<p className="max-w-xs text-sm text-[#7A7570]">
											Sign in with Google to start drafting newsletters from
											URLs.
										</p>
									</div>

									<motion.button
										type="button"
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleGoogleLogin}
										disabled={isLoading}
										className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
									>
										<GoogleIcon className="h-5 w-5" />
										{isLoading ? "Signing in…" : "Continue with Google"}
									</motion.button>

									<p className="max-w-[280px] text-[11px] leading-relaxed text-[#7A7570]">
										By continuing, you agree to our{" "}
										<a
											href="/"
											className="underline underline-offset-2 transition-colors hover:text-[#1A1A1A]"
										>
											Terms & Conditions
										</a>
										.
									</p>
								</div>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default LoginModal;
