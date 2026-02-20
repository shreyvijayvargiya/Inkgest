import React from "react";
import Head from "next/head";
import Link from "next/link";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";
import { FileText, Shield, Scale } from "lucide-react";

const LegalPage = () => {
	const legalDocuments = [
		{
			icon: Shield,
			title: "Privacy Policy",
			description:
				"Learn how we collect, use, and protect your personal information.",
			href: "/privacy",
		},
		{
			icon: FileText,
			title: "Terms and Conditions",
			description:
				"Read our terms of service and understand your rights and obligations.",
			href: "/terms-and-conditions",
		},
		{
			icon: Scale,
			title: "Cookie Policy",
			description:
				"Understand how we use cookies and tracking technologies on our website.",
			href: "/cookies",
		},
	];

	return (
		<>
			<Head>
				<title>Legal - YourApp</title>
				<meta
					name="description"
					content="Access our legal documents including privacy policy, terms and conditions, and cookie policy."
				/>
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />

				<section className="flex-1 py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50">
					<div className="max-w-6xl mx-auto">
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-zinc-900 mb-4">
								Legal Information
							</h1>
							<p className="text-lg text-zinc-600 max-w-2xl mx-auto">
								Access our legal documents and policies. We are committed to
								transparency and protecting your rights.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
							{legalDocuments.map((doc, index) => {
								const Icon = doc.icon;
								return (
									<Link
										key={index}
										href={doc.href}
										className="group p-6 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors"
									>
										<div className="flex items-start gap-4">
											<div className="p-3 bg-zinc-900 text-white rounded-xl flex-shrink-0 group-hover:bg-zinc-800 transition-colors">
												<Icon className="w-5 h-5" />
											</div>
											<div className="flex-1">
												<h3 className="text-lg font-semibold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors">
													{doc.title}
												</h3>
												<p className="text-sm text-zinc-600">
													{doc.description}
												</p>
											</div>
										</div>
									</Link>
								);
							})}
						</div>

						<div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
							<h2 className="text-2xl font-semibold text-zinc-900 mb-4">
								Legal Compliance
							</h2>
							<p className="text-zinc-700 leading-relaxed mb-6">
								We are committed to maintaining the highest standards of legal
								compliance and protecting the rights of our users. Our legal
								documents are regularly reviewed and updated to ensure they
								reflect current best practices and applicable laws.
							</p>

							<h3 className="text-xl font-semibold text-zinc-900 mt-6 mb-3">
								Questions or Concerns?
							</h3>
							<p className="text-zinc-700 leading-relaxed mb-4">
								If you have any questions about our legal documents or need to
								contact us regarding legal matters, please reach out to our
								legal team:
							</p>
							<div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
								<p className="text-zinc-700">
									<strong>Email:</strong> legal@yourapp.com
									<br />
									<strong>Address:</strong> [Your Company Address]
								</p>
							</div>
						</div>
					</div>
				</section>

				<Footer />
			</div>
		</>
	);
};

export default LegalPage;
