import React, { useState } from "react";
import Head from "next/head";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Send } from "lucide-react";
import { toast } from "react-toastify";

const ContactPage = () => {
	const [formData, setFormData] = useState({
		name: "",
		email: "",
		subject: "",
		message: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/messages/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success("Message sent successfully! We'll get back to you soon.");
				setFormData({ name: "", email: "", subject: "", message: "" });
			} else {
				throw new Error(data.error || "Failed to send message");
			}
		} catch (error) {
			console.error("Error sending message:", error);
			toast.error(error.message || "Failed to send message. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		});
	};

	return (
		<>
			<Head>
				<title>Contact Us - YourApp</title>
				<meta
					name="description"
					content="Get in touch with us. We'd love to hear from you."
				/>
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />

				<section className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
					<div className="max-w-4xl mx-auto">
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-zinc-900 mb-4">
								Get in Touch
							</h1>
							<p className="text-lg text-zinc-600">
								Have a question? We'd love to hear from you.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
							{/* Contact Info */}
							<div className="space-y-6">
								<div className="p-6 bg-white border border-zinc-200 rounded-xl">
									<div className="flex items-start gap-4">
										<div className="p-3 bg-zinc-900 text-white rounded-xl">
											<Mail className="w-5 h-5" />
										</div>
										<div>
											<h3 className="font-semibold text-zinc-900 mb-1">
												Email
											</h3>
											<p className="text-sm text-zinc-600">
												support@yourapp.com
											</p>
										</div>
									</div>
								</div>
								<div className="p-6 bg-white border border-zinc-200 rounded-xl">
									<div className="flex items-start gap-4">
										<div className="p-3 bg-zinc-900 text-white rounded-xl">
											<MessageSquare className="w-5 h-5" />
										</div>
										<div>
											<h3 className="font-semibold text-zinc-900 mb-1">
												Response Time
											</h3>
											<p className="text-sm text-zinc-600">
												We typically respond within 24 hours
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Contact Form */}
							<form
								onSubmit={handleSubmit}
								className="p-6 bg-white border border-zinc-200 rounded-xl space-y-4"
							>
								<div>
									<label className="block text-sm font-medium text-zinc-900 mb-1">
										Name
									</label>
									<input
										type="text"
										name="name"
										value={formData.name}
										onChange={handleChange}
										required
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-900 mb-1">
										Email
									</label>
									<input
										type="email"
										name="email"
										value={formData.email}
										onChange={handleChange}
										required
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-900 mb-1">
										Subject
									</label>
									<input
										type="text"
										name="subject"
										value={formData.subject}
										onChange={handleChange}
										required
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-zinc-900 mb-1">
										Message
									</label>
									<textarea
										name="message"
										value={formData.message}
										onChange={handleChange}
										required
										rows={5}
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100"
									/>
								</div>
								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
								>
									<Send className="w-4 h-4" />
									{isSubmitting ? "Sending..." : "Send Message"}
								</button>
							</form>
						</div>
					</div>
				</section>

				<Footer />
			</div>
		</>
	);
};

export default ContactPage;
