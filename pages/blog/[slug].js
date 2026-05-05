import Link from "next/link";
import Head from "next/head";
import { getPostSlugs, getPostBySlug } from "../../lib/blog/loadPosts";
import { absoluteUrl } from "../../lib/blog/absoluteUrl";
import BlogMarkdown from "../../lib/blog/BlogMarkdown";
import BlogShareBar from "../../lib/blog/BlogShareBar";
import BlogBanner, {
	isBannerImageUrl,
} from "../../lib/blog/BlogBanner";

export default function BlogPost({ post, jsonLd, shareUrl }) {
	if (!post) return null;

	return (
		<>
			<Head>
				<meta property="og:type" content="article" />
				<meta
					property="article:published_time"
					content={post.publishedAt || ""}
				/>
				{post.tags.map((tag) => (
					<meta property="article:tag" content={tag} key={tag} />
				))}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
			</Head>

			<div className="min-h-screen bg-[#F7F5F0]">
				<header className="border-b border-[#E8E4DC] bg-[#F7F5F0]/95 backdrop-blur-sm sticky top-0 z-10">
					<div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
						<Link
							href="/blog"
							className="text-sm font-medium text-[#5A5550] hover:text-[#1A1A1A] transition-colors shrink-0"
						>
							← All posts
						</Link>
						<Link
							href="/"
							className="text-xs text-[#9A9590] hover:text-[#5A5550] transition-colors"
						>
							Inkgest
						</Link>
					</div>
				</header>

				<article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
					<header className="mb-10">
						{post.publishedAt && (
							<time
								dateTime={post.publishedAt}
								className="text-sm text-[#9A9590] block mb-3"
							>
								{post.publishedAt}
							</time>
						)}
						<h1 className="text-3xl sm:text-[2rem] font-semibold text-[#1A1A1A] tracking-tight leading-tight mb-4">
							{post.title}
						</h1>
						<p className="text-lg text-[#5A5550] leading-relaxed mb-4">
							{post.description}
						</p>
						<BlogShareBar
							title={post.title}
							slug={post.slug}
							shareUrl={shareUrl}
						/>
						<div className="aspect-[21/9] rounded-xl overflow-hidden border border-[#E8E4DC] bg-[#F0ECE5]">
							<BlogBanner banner={post.banner} variant="hero" />
						</div>
						<div className="flex flex-wrap gap-2 mt-6">
							{post.tags.map((tag) => (
								<span
									key={tag}
									className="text-[11px]  tracking-wide px-2.5 py-1 rounded-md bg-[#F0ECE5] text-[#6A655E]"
								>
									{tag}
								</span>
							))}
						</div>
					</header>

					<div className="border-t border-[#E8E4DC] pt-10">
						<BlogMarkdown content={post.content} />
					</div>
				</article>
			</div>
		</>
	);
}

export async function getStaticPaths() {
	const slugs = getPostSlugs();
	return {
		paths: slugs.map((slug) => ({ params: { slug } })),
		fallback: false,
	};
}

export async function getStaticProps({ params }) {
	const post = getPostBySlug(params.slug);

	if (!post) {
		return { notFound: true };
	}

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
	const path = `/blog/${post.slug}`;
	const canonicalUrl = siteUrl
		? `${siteUrl.replace(/\/$/, "")}${path}`
		: path;
	const ogImageAbs = isBannerImageUrl(post.banner)
		? absoluteUrl(post.banner)
		: absoluteUrl("/inkgest-logo.png");

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "BlogPosting",
		headline: post.title,
		description: post.description,
		...(ogImageAbs ? { image: [ogImageAbs] } : {}),
		...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
		...(canonicalUrl.startsWith("http")
			? {
					mainEntityOfPage: {
						"@type": "WebPage",
						"@id": canonicalUrl,
					},
				}
			: {}),
		publisher: {
			"@type": "Organization",
			name: "Inkgest",
			...(siteUrl
				? {
						logo: {
							"@type": "ImageObject",
							url: `${siteUrl.replace(/\/$/, "")}/inkgest-logo.png`,
						},
					}
				: {}),
		},
	};

	const shareUrl = canonicalUrl.startsWith("http") ? canonicalUrl : null;

	return {
		props: {
			post,
			jsonLd,
			shareUrl,
			customSEO: {
				title: `${post.title} — Inkgest`,
				description: post.description,
				keywords: post.tags.join(", "),
				ogImage: ogImageAbs || post.banner,
				ogType: "article",
			},
		},
	};
}
