import Link from "next/link";
import { getAllPostsMeta } from "../../lib/blog/loadPosts";
import Footer from "../../app/components/Footer";

export default function BlogIndex({ posts }) {
	return (
		<div className="min-h-screen bg-[#F7F5F0]">
			<header className="border-b border-[#E8E4DC] bg-[#F7F5F0]/95 backdrop-blur-sm sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
					<Link
						href="/"
						className="text-sm font-medium text-[#5A5550] hover:text-[#1A1A1A] transition-colors"
					>
						← Inkgest
					</Link>
					<span className="text-xs uppercase tracking-widest text-[#9A9590]">
						Blog
					</span>
				</div>
			</header>
			<main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
				<div className="max-w-2xl mb-12 sm:mb-14">
					<h1 className="text-3xl sm:text-4xl font-semibold text-[#1A1A1A] tracking-tight mb-3">
						Blog
					</h1>
					<p className="text-[#5A5550] text-[15px] leading-relaxed">
						Product notes, guides, and ideas for faster newsletter and content
						workflows.
					</p>
				</div>

				<ul className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 list-none p-0 m-0">
					{posts.map((post) => (
						<li key={post.slug}>
							<article className="group h-full flex flex-col rounded-2xl border border-[#E8E4DC] bg-white/80 overflow-hidden shadow-sm hover:shadow-md hover:border-[#D4CFC4] transition-all duration-300">
								<Link href={`/blog/${post.slug}`} className="block shrink-0">
									<div className="aspect-[16/10] bg-[#F0ECE5] relative overflow-hidden">
										<img
											src={post.banner}
											alt=""
											className="w-full h-full object-cover opacity-95 group-hover:scale-[1.02] transition-transform duration-500"
										/>
									</div>
								</Link>
								<div className="p-5 sm:p-6 flex flex-col flex-1">
									{post.publishedAt && (
										<time
											dateTime={post.publishedAt}
											className="text-xs text-[#9A9590] mb-2 block"
										>
											{post.publishedAt}
										</time>
									)}
									<h2 className="text-lg font-semibold text-[#1A1A1A] leading-snug mb-2 group-hover:text-[#C17B2F] transition-colors">
										<Link href={`/blog/${post.slug}`}>{post.title}</Link>
									</h2>
									<p className="text-[#5A5550] text-sm leading-relaxed mb-4 flex-1">
										{post.description}
									</p>
									<div className="flex flex-wrap gap-2 mt-auto">
										{post.tags.map((tag) => (
											<span
												key={tag}
												className="text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-[#F0ECE5] text-[#6A655E]"
											>
												{tag}
											</span>
										))}
									</div>
								</div>
							</article>
						</li>
					))}
				</ul>
			</main>
			<Footer />
		</div>
	);
}

export async function getStaticProps() {
	const posts = getAllPostsMeta();

	return {
		props: {
			posts,
			customSEO: {
				title: "Blog — Inkgest",
				description:
					"Guides and notes on AI-assisted newsletters, content workflows, and getting the most out of Inkgest.",
				keywords: "Inkgest, blog, newsletter, AI content, email",
				ogImage: "/inkgest-logo.png",
				ogType: "website",
			},
		},
	};
}
