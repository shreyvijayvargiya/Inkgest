import React from "react";
import Head from "next/head";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";

const TermsAndConditionsPage = () => {
	return (
		<>
			<Head>
				<title>Terms and Conditions - YourApp</title>
				<meta
					name="description"
					content="Read our terms and conditions to understand the rules and regulations for using our service."
				/>
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />

				<section className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-zinc-50">
					<div className="max-w-4xl mx-auto">
						<div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 md:p-12">
							<h1 className="text-4xl font-bold text-zinc-900 mb-4">
								Terms and Conditions
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
										1. Agreement to Terms
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										By accessing or using our service, you agree to be bound by
										these Terms and Conditions. If you disagree with any part of
										these terms, then you may not access the service.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										2. Use License
									</h2>
									<p className="text-zinc-700 leading-relaxed mb-4">
										Permission is granted to temporarily use our service for
										personal, non-commercial transitory viewing only. This is
										the grant of a license, not a transfer of title, and under
										this license you may not:
									</p>
									<ul className="list-disc list-inside text-zinc-700 space-y-2 ml-4">
										<li>Modify or copy the materials</li>
										<li>
											Use the materials for any commercial purpose or for any
											public display
										</li>
										<li>
											Attempt to reverse engineer any software contained in the
											service
										</li>
										<li>
											Remove any copyright or other proprietary notations from
											the materials
										</li>
										<li>
											Transfer the materials to another person or "mirror" the
											materials on any other server
										</li>
									</ul>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										3. User Accounts
									</h2>
									<p className="text-zinc-700 leading-relaxed mb-4">
										When you create an account with us, you must provide
										information that is accurate, complete, and current at all
										times. You are responsible for safeguarding the password and
										for all activities that occur under your account.
									</p>
									<p className="text-zinc-700 leading-relaxed">
										You agree not to disclose your password to any third party.
										You must notify us immediately upon becoming aware of any
										breach of security or unauthorized use of your account.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										4. Subscription and Payment
									</h2>
									<h3 className="text-xl font-semibold text-zinc-900 mt-6 mb-3">
										4.1 Subscription Terms
									</h3>
									<p className="text-zinc-700 leading-relaxed mb-4">
										Some parts of our service are billed on a subscription
										basis. You will be billed in advance on a recurring and
										periodic basis.
									</p>

									<h3 className="text-xl font-semibold text-zinc-900 mt-6 mb-3">
										4.2 Payment Terms
									</h3>
									<p className="text-zinc-700 leading-relaxed mb-4">
										Payment is due on the billing date specified in your
										subscription. If payment is not received by the due date, we
										reserve the right to suspend or terminate your access to the
										service.
									</p>

									<h3 className="text-xl font-semibold text-zinc-900 mt-6 mb-3">
										4.3 Refunds
									</h3>
									<p className="text-zinc-700 leading-relaxed">
										Refund policies are subject to our discretion and may vary
										based on the type of subscription. Please contact us for
										specific refund information.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										5. Prohibited Uses
									</h2>
									<p className="text-zinc-700 leading-relaxed mb-4">
										You may not use our service:
									</p>
									<ul className="list-disc list-inside text-zinc-700 space-y-2 ml-4">
										<li>
											In any way that violates any applicable national or
											international law or regulation
										</li>
										<li>
											To transmit, or procure the sending of, any advertising or
											promotional material
										</li>
										<li>
											To impersonate or attempt to impersonate the company,
											employees, or other users
										</li>
										<li>
											In any way that infringes upon the rights of others, or in
											any way is illegal, threatening, fraudulent, or harmful
										</li>
										<li>
											To engage in any other conduct that restricts or inhibits
											anyone's use or enjoyment of the service
										</li>
									</ul>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										6. Intellectual Property
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										The service and its original content, features, and
										functionality are and will remain the exclusive property of
										YourApp and its licensors. The service is protected by
										copyright, trademark, and other laws.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										7. Termination
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										We may terminate or suspend your account and bar access to
										the service immediately, without prior notice or liability,
										for any reason whatsoever, including without limitation if
										you breach the Terms.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										8. Disclaimer
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										The information on this service is provided on an "as is"
										basis. To the fullest extent permitted by law, we exclude
										all representations, warranties, and conditions relating to
										our service and the use of this service.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										9. Limitation of Liability
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										In no event shall YourApp, nor its directors, employees,
										partners, agents, suppliers, or affiliates, be liable for
										any indirect, incidental, special, consequential, or
										punitive damages, including without limitation, loss of
										profits, data, use, goodwill, or other intangible losses,
										resulting from your use of the service.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										10. Governing Law
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										These Terms shall be interpreted and governed by the laws of
										[Your Jurisdiction], without regard to its conflict of law
										provisions.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										11. Changes to Terms
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										We reserve the right, at our sole discretion, to modify or
										replace these Terms at any time. If a revision is material,
										we will provide at least 30 days notice prior to any new
										terms taking effect.
									</p>
								</section>

								<section>
									<h2 className="text-2xl font-semibold text-zinc-900 mt-8 mb-4">
										12. Contact Information
									</h2>
									<p className="text-zinc-700 leading-relaxed">
										If you have any questions about these Terms and Conditions,
										please contact us at:
									</p>
									<p className="text-zinc-700 leading-relaxed mt-2">
										Email: legal@yourapp.com
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

export default TermsAndConditionsPage;
