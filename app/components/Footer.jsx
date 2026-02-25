import React, { useState } from "react";
import Link from "next/link";
import { Mail, Twitter, Github, Linkedin, Send, Sparkles } from "lucide-react";
import { addSubscriber } from "../../lib/api/subscribers";
import { toast } from "sonner";

const Footer = () => {
	const currentYear = new Date().getFullYear();
	const [newsletterEmail, setNewsletterEmail] = useState("");
	const [newsletterName, setNewsletterName] = useState("");
	const [isSubscribing, setIsSubscribing] = useState(false);

	const handleNewsletterSubmit = async (e) => {
		e.preventDefault();
		if (!newsletterEmail) {
			toast.warning("Email is required");
			return;
		}

		setIsSubscribing(true);
		try {
			await addSubscriber({
				email: newsletterEmail,
				name: newsletterName || newsletterEmail.split("@")[0],
			});
			toast.success("Successfully subscribed to newsletter!");
			setNewsletterEmail("");
			setNewsletterName("");
		} catch (error) {
			console.error("Error subscribing:", error);
			toast.error(error.message || "Failed to subscribe. Please try again.");
		} finally {
			setIsSubscribing(false);
		}
	};

	const footerLinks = {
		Product: [
			{ href: "/#features", label: "Features" },
			{ href: "/pricing", label: "Pricing" },
			{ href: "/blog", label: "Blog" },
			{ href: "/docs", label: "Documentation" },
		],
		Company: [
			{ href: "/about", label: "About Us" },
			{ href: "/contact", label: "Contact" },
			{ href: "/careers", label: "Careers" },
			{ href: "/changelog", label: "Changelog" },
		],
		Legal: [
			{ href: "/legal", label: "Legal Center" },
			{ href: "/privacy", label: "Privacy Policy" },
			{ href: "/terms-and-conditions", label: "Terms of Service" },
			{ href: "/cookies", label: "Cookie Policy" },
		],
	};

	return (
		<footer className="bg-white border-t border-zinc-100">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
					{/* Brand & Newsletter */}
					<div className="lg:col-span-4 space-y-8">
						<div>
							<Link href="/" className="flex items-center gap-2 mb-4">
								<span className="text-xl font-bold tracking-tight text-zinc-900 uppercase">
									YourApp
								</span>
							</Link>
							<p className="text-zinc-500 max-w-sm leading-relaxed">
								The high-performance Inkgest for modern developers. Build,
								launch, and scale your next idea with confidence.
							</p>
						</div>

						<div className="space-y-4">
							<h4 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">
								Subscribe to updates
							</h4>
							<form
								onSubmit={handleNewsletterSubmit}
								className="flex flex-col sm:flex-row gap-2 max-w-md"
							>
								<div className="relative flex-1">
									<input
										type="email"
										placeholder="email@example.com"
										value={newsletterEmail}
										onChange={(e) => setNewsletterEmail(e.target.value)}
										required
										className="w-full pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm"
									/>
									<Sparkles className="absolute right-3 top-3.5 w-4 h-4 text-zinc-300" />
								</div>
								<button
									type="submit"
									disabled={isSubscribing}
									className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
								>
									{isSubscribing ? "..." : <Send className="w-4 h-4" />}
								</button>
							</form>
						</div>
					</div>

					{/* Links */}
					<div className="lg:col-span-1 hidden lg:block" />

					<div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
						{Object.entries(footerLinks).map(([category, links]) => (
							<div key={category}>
								<h4 className="text-sm font-bold text-zinc-900 mb-6 uppercase tracking-widest">
									{category}
								</h4>
								<ul className="space-y-4">
									{links.map((link) => (
										<li key={link.href}>
											<Link
												href={link.href}
												className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
											>
												{link.label}
											</Link>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>

				{/* Bottom Section */}
				<div className="mt-20 pt-10 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex items-center gap-6">
						<p className="text-sm text-zinc-500">
							© {currentYear} YourApp. All rights reserved.
						</p>
						<div className="hidden sm:flex items-center gap-4">
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-zinc-400 hover:text-zinc-900 transition-colors"
							>
								<Twitter className="w-5 h-5" />
							</a>
							<a
								href="https://github.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-zinc-400 hover:text-zinc-900 transition-colors"
							>
								<Github className="w-5 h-5" />
							</a>
							<a
								href="https://linkedin.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-zinc-400 hover:text-zinc-900 transition-colors"
							>
								<Linkedin className="w-5 h-5" />
							</a>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
						<span className="text-sm font-medium text-zinc-600">
							All Systems Operational
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
