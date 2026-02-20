import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";
import { motion } from "framer-motion";
import { Calendar, ArrowRight, Search } from "lucide-react";
import { getAllBlogs } from "../lib/api/blog";
import { addSubscriber } from "../lib/api/subscribers";
import { toast } from "react-toastify";

const BlogPage = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [showSubscribeModal, setShowSubscribeModal] = useState(false);
	const [subscribeForm, setSubscribeForm] = useState({ email: "", name: "" });
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data: blogs = [], isLoading } = useQuery({
		queryKey: ["blogs"],
		queryFn: () => getAllBlogs("published"),
	});

	const filteredBlogs = blogs.filter((blog) =>
		blog.title?.toLowerCase().includes(searchQuery.toLowerCase())
	);

	

	const formatDate = (date) => {
		if (!date) return "N/A";
		const d = date?.toDate ? date.toDate() : new Date(date);
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<>
			<Head>
				<title>Blog - YourApp</title>
				<meta
					name="description"
					content="Read our latest blog posts and stay updated with news and insights."
				/>
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />

				<section className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
					<div className="max-w-4xl mx-auto">
						{/* Header */}
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-zinc-900 mb-4">Blog</h1>
							<p className="text-lg text-zinc-600">
								Latest articles, updates, and insights
							</p>
						</div>

						{/* Search */}
						<div className="flex justify-end mb-8">
							<div className="relative w-fit">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
								<input
									type="text"
									placeholder="Search blog posts..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-fit min-w-[250px] pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100"
								/>
							</div>
						</div>

						{/* Blog List */}
						{isLoading ? (
							<div className="text-center py-12 text-zinc-600">Loading...</div>
						) : filteredBlogs.length === 0 ? (
							<div className="text-center py-12 text-zinc-600">
								{searchQuery
									? "No blog posts found matching your search."
									: "No blog posts yet. Check back soon!"}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{filteredBlogs.map((blog, index) => (
									<motion.article
										key={blog.id}
										initial={{ opacity: 0, y: 20 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{ delay: index * 0.1 }}
										className="flex flex-col p-6 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-md transition-all"
									>
										{blog.bannerImage && (
											<img
												src={blog.bannerImage}
												alt={blog.title}
												className="w-full h-48 object-cover rounded-xl mb-4"
											/>
										)}
										<div className="flex items-center gap-2 text-xs text-zinc-600 mb-2">
											<Calendar className="w-3 h-3" />
											{formatDate(blog.createdAt)}
											{blog.author && (
												<>
													<span>•</span>
													<span>{blog.author}</span>
												</>
											)}
										</div>
										<h2 className="text-xl font-bold text-zinc-900 mb-3 flex-1">
											{blog.title}
										</h2>
										<Link
											href={
												blog.slug ? `/blog/${blog.slug}` : `/blog/id/${blog.id}`
											}
											className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900 hover:text-zinc-600 transition-colors mt-auto"
										>
											Read More
											<ArrowRight className="w-4 h-4" />
										</Link>
									</motion.article>
								))}
							</div>
						)}
					</div>
				</section>

				<Footer />
			</div>
		</>
	);
};

export default BlogPage;
