import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, LogOut, User } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
	signInWithEmail,
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
import { toast } from "react-toastify";
import SignupModal from "./SignupModal";
import { useRouter } from "next/router";

/* ── Design tokens ── */
const T = {
	base: "#F7F5F0",
	surface: "#FFFFFF",
	accent: "#1A1A1A",
	warm: "#C17B2F",
	muted: "#7A7570",
	border: "#E8E4DC",
};

const LoginModal = ({ isOpen, onClose }) => {
	const dispatch = useDispatch();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [user, setLocalUser] = useState(null);
	const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
	const subscription = useSelector((state) => state.subscription);
	const router = useRouter();

	// Check for existing user in cookie on mount and when modal opens
	useEffect(() => {
		const cookieUser = getUserCookie();
		if (cookieUser) {
			setLocalUser(cookieUser);
		} else {
			setLocalUser(null);
		}
	}, [isOpen]);

	// Listen for auth state changes
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
			} else {
				removeUserCookie();
				setLocalUser(null);
				dispatch(clearUser());
			}
		});

		return () => unsubscribe();
	}, [isOpen, dispatch]);

	const handleEmailLogin = async (e) => {
		e.preventDefault();
		if (!email || !password) {
			toast.error("Please enter both email and password");
			return;
		}

		setIsLoading(true);
		try {
			await signInWithEmail(email, password);
			// User state will be updated via onAuthStateChange
		} catch (error) {
			console.error("Login error:", error);
			toast.error(error.message || "Failed to login. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		setIsLoading(true);
		try {
			await signInWithGoogle();
			// User state will be updated via onAuthStateChange
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

	if (!isOpen && !isSignupModalOpen) return null;

	console.log(subscription, "user");
	return (
		<>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
						onClick={onClose}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
							style={{ backgroundColor: T.base }}
						>
							{/* Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<h3 className="text-lg text-zinc-900">
									{user ? "Account" : "Login"}
								</h3>
								<button
									onClick={onClose}
									className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Body */}
							<div className="p-6">
								{user ? (
									// User logged in - show user details
									<div className="space-y-4">
										<div className="flex items-center gap-4">
											{user.photoURL ? (
												<img
													src={user.photoURL}
													alt={user.displayName}
													className="w-16 h-16 rounded-full object-cover"
												/>
											) : (
												<div className="w-16 h-16 rounded-full bg-zinc-200 flex items-center justify-center">
													<User className="w-8 h-8 text-zinc-600" />
												</div>
											)}
											<div className="flex-1">
												<h4 className="text-lg font-semibold text-zinc-900">
													{user.displayName}
												</h4>
												<p className="text-sm text-zinc-600">{user.email}</p>
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 mt-1">
													{user.provider === "google" ? "Google" : "Email"}
												</span>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<h5 className="text-sm font-medium text-zinc-700">
												Subscription Status:
											</h5>
											<p className="text-sm text-zinc-600 p-2 rounded-full ">
												{subscription.isSubscribed ? (
													<span className="text-green-500">Active</span>
												) : (
													<span className="text-red-500 flex gap-2 items-center">
														Inactive{" "}
														<motion.button
															whileHover={{
																scale: 1.02,
																background: "#f5f0e8",
															}}
															onClick={() => router.push("/pricing")}
															whileTap={{ scale: 0.97 }}
															style={{
																display: "block",
																width: "100%",
																background: "white",
																color: T.accent,
																padding: "8px",
																borderRadius: 10,
																fontSize: 14,
																fontWeight: 700,
																border: "none",
																cursor: "pointer",
																fontFamily: "'Outfit', sans-serif",
															}}
														>
															Upgrade to Pro →
														</motion.button>
													</span>
												)}
											</p>
										</div>
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={handleLogout}
											disabled={isLoading}
											className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<LogOut className="w-4 h-4" />
											{isLoading ? "Logging out..." : "Logout"}
										</motion.button>
									</div>
								) : (
									// Login form
									<div className="space-y-4">
										<form onSubmit={handleEmailLogin} className="space-y-4">
											<div>
												<label
													htmlFor="email"
													className="block text-sm font-medium text-zinc-700 mb-1.5"
												>
													Email
												</label>
												<div className="relative">
													<Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
													<input
														id="email"
														type="email"
														value={email}
														onChange={(e) => setEmail(e.target.value)}
														placeholder="Enter your email"
														className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
														required
													/>
												</div>
											</div>
											<div>
												<label
													htmlFor="password"
													className="block text-sm font-medium text-zinc-700 mb-1.5"
												>
													Password
												</label>
												<div className="relative">
													<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
													<input
														id="password"
														type="password"
														value={password}
														onChange={(e) => setPassword(e.target.value)}
														placeholder="Enter your password"
														className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
														required
													/>
												</div>
											</div>
											<motion.button
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												type="submit"
												disabled={isLoading}
												className="w-full px-4 py-2.5 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isLoading ? "Logging in..." : "Login"}
											</motion.button>
										</form>

										<div className="relative">
											<div className="absolute inset-0 flex items-center">
												<div className="w-full border-t border-zinc-300"></div>
											</div>
											<div className="relative flex justify-center text-sm">
												<span className="px-2 bg-white text-zinc-500">
													Or continue with
												</span>
											</div>
										</div>

										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											onClick={handleGoogleLogin}
											disabled={isLoading}
											className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-zinc-700 bg-white hover:bg-zinc-50 rounded-xl font-medium transition-colors border border-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<svg
												className="w-5 h-5"
												viewBox="0 0 24 24"
												fill="none"
												xmlns="http://www.w3.org/2000/svg"
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
											{isLoading ? "Logging in..." : "Google"}
										</motion.button>

										<div className="text-center mt-4">
											<p className="text-sm text-zinc-600">
												Don't have an account?{" "}
												<button
													type="button"
													onClick={() => {
														setIsSignupModalOpen(true);
														onClose();
													}}
													className="text-zinc-900 font-medium hover:underline"
												>
													sign up
												</button>
											</p>
										</div>
									</div>
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
			<SignupModal
				isOpen={isSignupModalOpen}
				onClose={() => setIsSignupModalOpen(false)}
			/>
		</>
	);
};

export default LoginModal;
