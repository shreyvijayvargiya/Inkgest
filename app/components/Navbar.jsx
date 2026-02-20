import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, User, ChevronDown, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAppQueryClient } from "../../lib/hooks/useQueryClient";
import { useSubscription } from "../../lib/hooks/useSubscription";
import LoginModal from "../../lib/ui/LoginModal";
import {
	getUserCookie,
	removeUserCookie,
	setUserCookie,
} from "../../lib/utils/cookies";
import { signOutUser, onAuthStateChange } from "../../lib/api/auth";
import { toast } from "react-toastify";

const Navbar = () => {
	const router = useRouter();
	const queryClient = useAppQueryClient();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const dropdownRef = useRef(null);
	const authUnsubscribeRef = useRef(null);
	const subscription = useSubscription();

	// Fetch user with React Query - checks cookie and sets up auth listener
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

	// Cleanup auth listener on unmount
	useEffect(() => {
		return () => {
			if (authUnsubscribeRef.current) {
				authUnsubscribeRef.current();
				authUnsubscribeRef.current = null;
			}
		};
	}, []);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		};

		if (isDropdownOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isDropdownOpen]);

	const handleLogout = async () => {
		try {
			// Remove cookie first
			removeUserCookie();

			// Clear React Query cache immediately
			queryClient.setQueryData(["currentUser"], null);

			// Sign out from Firebase (this will trigger auth state change)
			await signOutUser();

			// Ensure cache is cleared (in case auth listener hasn't fired yet)
			queryClient.setQueryData(["currentUser"], null);

			// Invalidate query to force refetch if needed
			await queryClient.invalidateQueries({ queryKey: ["currentUser"] });

			setIsDropdownOpen(false);
			toast.success("Logged out successfully!");
		} catch (error) {
			console.error("Logout error:", error);
			// Even if signOut fails, clear local state
			removeUserCookie();
			queryClient.setQueryData(["currentUser"], null);
			toast.error("Failed to logout. Please try again.");
		}
	};

	const navLinks = [
		{ href: "/", label: "Home" },
		{ href: "/features", label: "Features" },
		{ href: "/blog", label: "Blog" },
		{ href: "/pricing", label: "Pricing" },
		{ href: "/contact", label: "Contact" },
		{ href: "/docs", label: "Docs" },
	];

	const isActive = (href) => {
		if (href === "/") {
			return router.pathname === "/";
		}
		return router.pathname.startsWith(href);
	};

	return (
		<>
			<nav className="sticky top-0 z-50 glass-morphism border-b border-zinc-200/50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						{/* Logo */}
						<Link href="/" className="flex items-center">
							<span className="text-lg font-semibold -rotate-3 text-zinc-900 p-1 border border-dashed border-zinc-200">
								YourApp
							</span>
						</Link>

						{/* Desktop Navigation */}
						<div className="hidden md:flex items-center gap-6">
							{navLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className={`text-sm font-medium transition-colors ${isActive(link.href)
											? "text-zinc-900"
											: "text-zinc-600 hover:text-zinc-900"
										}`}
								>
									{link.label}
								</Link>
							))}
						</div>

						{/* Right Side Actions */}
						<div className="hidden md:flex items-center gap-4">
							{user ? (
								// User is logged in - show dropdown
								<div className="relative" ref={dropdownRef}>
									<button
										onClick={() => setIsDropdownOpen(!isDropdownOpen)}
										className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200/50 rounded-xl transition-colors"
									>
										{user.photoURL ? (
											<img
												src={user.photoURL}
												alt={user.displayName}
												className="w-4 h-4 rounded-full"
											/>
										) : (
											<div className="w-4 h-4 rounded-full bg-zinc-300 flex items-center justify-center">
												<User className="w-4 h-4 text-zinc-600" />
											</div>
										)}
										<span className="text-sm font-medium text-zinc-900">
											{user.displayName}
										</span>
										<ChevronDown className="w-4 h-4 text-zinc-600" />
									</button>

									{/* Dropdown Menu */}
									<AnimatePresence>
										{isDropdownOpen && (
											<motion.div
												initial={{ opacity: 0, y: -10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
												className="absolute top-full right-0 mt-2 w-64 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden"
											>
												{/* Avatar and Email */}
												<div className="p-4 border-b border-zinc-200 text-center">
													{user.photoURL ? (
														<img
															src={user.photoURL}
															alt={user.displayName}
															className="w-16 h-16 rounded-full mx-auto mb-2"
														/>
													) : (
														<div className="w-16 h-16 rounded-full bg-zinc-300 flex items-center justify-center mx-auto mb-2">
															<User className="w-8 h-8 text-zinc-600" />
														</div>
													)}
													<p className="text-sm font-medium text-zinc-900">
														{user.displayName}
													</p>
													<p className="text-xs text-zinc-600 mt-1">
														{user.email}
													</p>
												</div>

												{/* Subscription Status */}
												<div className="p-4 border-b border-zinc-200">
													<p className="text-xs text-zinc-500 mb-1">
														Subscription Status
													</p>
													{subscription.isSubscribed &&
														subscription.status === "active" ? (
														<p className="text-sm font-medium text-green-600">
															Active - {subscription.planName || "Pro"}
														</p>
													) : (
														<p className="text-sm text-zinc-600">
															No active subscription
														</p>
													)}
												</div>

												{/* Logout Button */}
												<button
													onClick={handleLogout}
													className="w-full p-4 flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
												>
													<LogOut className="w-4 h-4" />
													Logout
												</button>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							) : (
								<button
									onClick={() => setShowLoginModal(true)}
									className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
								>
									<LogIn className="w-4 h-4" />
									Get Started
								</button>
							)}
						</div>

						{/* Mobile Menu Button */}
						<button
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							className="md:hidden p-2 text-zinc-600 hover:text-zinc-900"
						>
							{isMobileMenuOpen ? (
								<X className="w-6 h-6" />
							) : (
								<Menu className="w-6 h-6" />
							)}
						</button>
					</div>
				</div>

				{/* Mobile Menu */}
				<AnimatePresence>
					{isMobileMenuOpen && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							className="md:hidden border-t border-zinc-200 bg-white"
						>
							<div className="px-4 py-4 space-y-3">
								{navLinks.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										onClick={() => setIsMobileMenuOpen(false)}
										className={`block text-sm font-medium transition-colors ${isActive(link.href)
												? "text-zinc-900"
												: "text-zinc-600 hover:text-zinc-900"
											}`}
									>
										{link.label}
									</Link>
								))}
								{user ? (
									<div className="mt-2 space-y-3">
										{/* User Info */}
										<div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
											{user.photoURL ? (
												<img
													src={user.photoURL}
													alt={user.displayName}
													className="w-10 h-10 rounded-full"
												/>
											) : (
												<div className="w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center">
													<User className="w-5 h-5 text-zinc-600" />
												</div>
											)}
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-zinc-900 truncate">
													{user.displayName}
												</p>
												<p className="text-xs text-zinc-600 truncate">
													{user.email}
												</p>
											</div>
										</div>

										{/* Subscription Status */}
										<div className="p-3 bg-zinc-50 rounded-xl">
											<p className="text-xs text-zinc-500 mb-1">
												Subscription Status
											</p>
											{subscription.isSubscribed &&
												subscription.status === "active" ? (
												<p className="text-sm font-medium text-green-600">
													Active - {subscription.planName || "Pro"}
												</p>
											) : (
												<p className="text-sm text-zinc-600">
													No active subscription
												</p>
											)}
										</div>

										{/* Logout Button */}
										<button
											onClick={() => {
												handleLogout();
												setIsMobileMenuOpen(false);
											}}
											className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
										>
											<LogOut className="w-4 h-4" />
											Logout
										</button>
									</div>
								) : (
									<button
										onClick={() => {
											setShowLoginModal(true);
											setIsMobileMenuOpen(false);
										}}
										className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors mt-2"
									>
										<LogIn className="w-4 h-4" />
										Get Started
									</button>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</nav>

			<LoginModal
				isOpen={showLoginModal}
				onClose={() => setShowLoginModal(false)}
			/>
		</>
	);
};

export default Navbar;
