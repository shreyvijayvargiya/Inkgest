import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User } from "lucide-react";
import {
	signUpWithEmail,
	onAuthStateChange,
} from "../api/auth";
import {
	setUserCookie,
	getUserCookie,
} from "../utils/cookies";
import { toast } from "sonner";
import LoginModal from "./LoginModal";

const SignupModal = ({ isOpen, onClose }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [user, setUser] = useState(null);
	const [error, setError] = useState("");
	const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

	// Check for existing user in cookie on mount and when modal opens
	useEffect(() => {
		const cookieUser = getUserCookie();
		if (cookieUser) {
			setUser(cookieUser);
		} else {
			setUser(null);
		}
		// Clear error when modal opens/closes
		setError("");
	}, [isOpen]);

	// Clear error when email changes
	useEffect(() => {
		setError("");
	}, [email]);

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
				setUser(userData);
				toast.success("Account created successfully!");
				onClose();
			}
		});

		return () => unsubscribe();
	}, [isOpen, onClose]);

	const handleSignup = async (e) => {
		e.preventDefault();
		setError("");

		if (!email || !password || !displayName) {
			const errorMsg = "Please fill in all fields";
			setError(errorMsg);
			toast.error(errorMsg);
			return;
		}

		if (password.length < 6) {
			const errorMsg = "Password must be at least 6 characters long";
			setError(errorMsg);
			toast.error(errorMsg);
			return;
		}

		setIsLoading(true);
		try {
			await signUpWithEmail(email, password, displayName);
			// User state will be updated via onAuthStateChange
		} catch (error) {
			console.error("Signup error:", error);
			const errorMsg = error.message || "Failed to create account. Please try again.";
			setError(errorMsg);
			// Only show toast for non-email-already-exists errors
			if (!errorMsg.includes("already exists")) {
				toast.error(errorMsg);
			}
		} finally {
			setIsLoading(false);
		}
	};

	if (!isOpen && !isLoginModalOpen) return null;

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
						>
							{/* Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<h3 className="text-lg text-zinc-900">
									Create Account
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
									// User logged in - show success message
									<div className="space-y-4 text-center">
										<div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
											<User className="w-8 h-8 text-green-600" />
										</div>
										<h4 className="text-lg font-semibold text-zinc-900">
											Account Created!
										</h4>
										<p className="text-sm text-zinc-600">
											Welcome, {user.displayName}!
										</p>
									</div>
								) : (
									// Signup form
									<form onSubmit={handleSignup} className="space-y-4">
										<div>
											<label
												htmlFor="displayName"
												className="block text-sm font-medium text-zinc-700 mb-1.5"
											>
												Full Name
											</label>
											<div className="relative">
												<User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
												<input
													id="displayName"
													type="text"
													value={displayName}
													onChange={(e) => setDisplayName(e.target.value)}
													placeholder="Enter your full name"
													className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
													required
												/>
											</div>
										</div>
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
													placeholder="Enter your password (min. 6 characters)"
													className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 focus:border-transparent text-zinc-900"
													required
													minLength={6}
												/>
											</div>
										</div>
										{error && (
											<div className="p-3 bg-red-50 border border-red-200 rounded-xl">
												<p className="text-sm text-red-600">{error}</p>
											</div>
										)}
										<motion.button
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											type="submit"
											disabled={isLoading}
											className="w-full px-4 py-2.5 text-sm text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{isLoading ? "Creating account..." : "Sign Up"}
										</motion.button>

										<div className="text-center mt-4">
											<p className="text-sm text-zinc-600">
												Already a user?{" "}
												<button
													type="button"
													onClick={() => {
														setIsLoginModalOpen(true);
														onClose();
													}}
													className="text-zinc-900 font-medium hover:underline"
												>
													Login
												</button>
											</p>
										</div>
									</form>
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
			<LoginModal
				isOpen={isLoginModalOpen}
				onClose={() => setIsLoginModalOpen(false)}
			/>
		</>
	);
};

export default SignupModal;

