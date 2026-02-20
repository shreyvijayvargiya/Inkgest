import React from "react";
import Head from "next/head";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";
import { motion } from "framer-motion";
import {
	Zap,
	Shield,
	Rocket,
	Sparkles,
	Database,
	CreditCard,
	Users,
	BarChart3,
} from "lucide-react";

const FeaturesPage = () => {
	const features = [
		{
			icon: Zap,
			title: "Lightning Fast Performance",
			description:
				"Built with Next.js 15 and React 18 for optimal performance and SEO. Server-side rendering and static generation included.",
		},
		{
			icon: Shield,
			title: "Secure Authentication",
			description:
				"Complete authentication system with email/password and Google OAuth. Role-based access control included.",
		},
		{
			icon: CreditCard,
			title: "Payment Integration",
			description:
				"Seamless payment processing with Polar. Subscription management, webhooks, and customer management built-in.",
		},
		{
			icon: Database,
			title: "Database Ready",
			description:
				"Firebase Firestore integration with Supabase alternative. Real-time data synchronization included.",
		},
		{
			icon: Users,
			title: "User Management",
			description:
				"Complete user management system with teams, roles, and permissions. Admin panel included.",
		},
		{
			icon: BarChart3,
			title: "Analytics Dashboard",
			description:
				"Beautiful analytics dashboard with charts and metrics. Track your business KPIs in real-time.",
		},
		{
			icon: Rocket,
			title: "Scalable Architecture",
			description:
				"Built to scale from startup to enterprise. Clean code architecture and best practices.",
		},
		{
			icon: Sparkles,
			title: "Modern UI/UX",
			description:
				"Beautiful, responsive design with Tailwind CSS. Framer Motion animations included.",
		},
	];

	return (
		<>
			<Head>
				<title>Features - YourApp</title>
				<meta
					name="description"
					content="Discover all the features included in our Inkgest template."
				/>
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />

				<section className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
					<div className="max-w-6xl mx-auto">
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-zinc-900 mb-4">
								Everything You Need to Launch
							</h1>
							<p className="text-lg text-zinc-600 max-w-2xl mx-auto">
								Our Inkgest template includes all the essential features to get
								your product to market faster.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{features.map((feature, index) => {
								const Icon = feature.icon;
								return (
									<motion.div
										key={index}
										initial={{ opacity: 0, y: 20 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ delay: index * 0.1 }}
										className="p-6 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors"
									>
										<div className="flex items-start gap-4">
											<div className="p-3 bg-zinc-900 text-white rounded-xl flex-shrink-0">
												<Icon className="w-5 h-5" />
											</div>
											<div>
												<h3 className="text-lg font-semibold text-zinc-900 mb-2">
													{feature.title}
												</h3>
												<p className="text-sm text-zinc-600">
													{feature.description}
												</p>
											</div>
										</div>
									</motion.div>
								);
							})}
						</div>
					</div>
				</section>

				<Footer />
			</div>
		</>
	);
};

export default FeaturesPage;
