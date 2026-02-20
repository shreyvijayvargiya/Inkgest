import React from "react";
import Head from "next/head";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";

const PrivacyPage = () => {
	return (
		<>
			<Head>
				<title>Privacy Policy - YourApp</title>
				<meta
					name="description"
					content="Read our privacy policy to understand how we collect, use, and protect your personal information."
				/>
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />

				<section className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50">
					<div className="max-w-4xl mx-auto">
						<div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
							<h1 className="text-4xl font-bold text-zinc-900 mb-4">
								Privacy Policy
							</h1>
							<p className="text-sm text-zinc-600 mb-8">
								Last updated:{" "}
								{new Date().toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</p>

							<div className="prose prose-zinc max-w-none space-y-6">
								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										1. Introduction
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										Welcome to YourApp. We are committed to protecting your
										personal information and your right to privacy. This Privacy
										Policy explains how we collect, use, disclose, and safeguard
										your information when you use our service.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										2. Information We Collect
									</h2>
									<h3 className="text-xl font-semibold text-zinc-900 mt-6 mb-3">
										2.1 Personal Information
									</h3>
									<p className="text-zinc-700 leading-relaxed mb-4">
										We may collect personal information that you voluntarily
										provide to us when you:
									</p>
									<ul className="list-disc list-inside text-zinc-700 space-y-2 ml-4">
										<li>Register for an account</li>
										<li>Subscribe to our newsletter</li>
										<li>Make a purchase or transaction</li>
										<li>Contact us for support</li>
										<li>Participate in surveys or promotions</li>
									</ul>

									<h3 className="text-xl font-semibold text-zinc-900 mt-6 mb-3">
										2.2 Automatically Collected Information
									</h3>
									<p className="text-zinc-700 leading-relaxed">
										When you visit our website, we automatically collect certain
										information about your device, including information about
										your web browser, IP address, time zone, and some of the
										cookies that are installed on your device.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										3. How We Use Your Information
									</h2>
									<p className="text-zinc-700 leading-relaxed mb-4">
										We use the information we collect to:
									</p>
									<ul className="list-disc list-inside text-zinc-700 space-y-2 ml-4">
										<li>Provide, operate, and maintain our service</li>
										<li>Improve, personalize, and expand our service</li>
										<li>Understand and analyze how you use our service</li>
										<li>
											Develop new products, services, features, and
											functionality
										</li>
										<li>
											Communicate with you for customer service and support
										</li>
										<li>Send you marketing and promotional communications</li>
										<li>Find and prevent fraud</li>
									</ul>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										4. Information Sharing and Disclosure
									</h2>
									<p className="text-zinc-700 leading-relaxed mb-4">
										We do not sell, trade, or rent your personal information to
										third parties. We may share your information in the
										following situations:
									</p>
									<ul className="list-disc list-inside text-zinc-700 space-y-2 ml-4">
										<li>
											<strong>Service Providers:</strong> We may share your
											information with third-party service providers who perform
											services on our behalf
										</li>
										<li>
											<strong>Legal Requirements:</strong> We may disclose your
											information if required by law or in response to valid
											requests by public authorities
										</li>
										<li>
											<strong>Business Transfers:</strong> We may share or
											transfer your information in connection with any merger,
											sale of company assets, or acquisition
										</li>
									</ul>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										5. Data Security
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										We use administrative, technical, and physical security
										measures to help protect your personal information. However,
										no method of transmission over the Internet or electronic
										storage is 100% secure, and we cannot guarantee absolute
										security.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										6. Your Privacy Rights
									</h2>
									<p className="text-zinc-700 leading-relaxed mb-4">
										Depending on your location, you may have the following
										rights regarding your personal information:
									</p>
									<ul className="list-disc list-inside text-zinc-700 space-y-2 ml-4">
										<li>The right to access your personal information</li>
										<li>
											The right to rectify inaccurate personal information
										</li>
										<li>
											The right to request deletion of your personal information
										</li>
										<li>
											The right to object to processing of your personal
											information
										</li>
										<li>The right to data portability</li>
									</ul>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										7. Cookies and Tracking Technologies
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										We use cookies and similar tracking technologies to track
										activity on our service and hold certain information. You
										can instruct your browser to refuse all cookies or to
										indicate when a cookie is being sent.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										8. Children's Privacy
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										Our service is not intended for children under the age of
										13. We do not knowingly collect personal information from
										children under 13. If you are a parent or guardian and
										believe your child has provided us with personal
										information, please contact us.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										9. Changes to This Privacy Policy
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										We may update our Privacy Policy from time to time. We will
										notify you of any changes by posting the new Privacy Policy
										on this page and updating the "Last updated" date.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										10. Contact Us
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										If you have any questions about this Privacy Policy, please
										contact us at:
									</p>
									<p className="text-zinc-700 leading-relaxed mt-2">
										Email: privacy@yourapp.com
										<br />
										Address: [Your Company Address]
									</p>
								</section>
							</div>
						</div>
					</div>
				</section>

				<Footer />
			</div>
		</>
	);
};

export default PrivacyPage;
