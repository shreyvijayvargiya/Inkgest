import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSEOConfig, getCanonicalUrl } from "../config/seo";

/**
 * SEO Component
 * Automatically applies SEO tags based on the current route
 * Uses the centralized SEO_CONFIG for easy management
 */
const SEO = ({ customSEO = null }) => {
	const router = useRouter();
	const seoConfig = customSEO || getSEOConfig(router.pathname);
	const canonicalUrl = getCanonicalUrl(router.asPath);

	return (
		<Head>
			{/* Basic Meta Tags */}
			<title>{seoConfig.title}</title>
			<meta name="description" content={seoConfig.description} />
			{seoConfig.keywords && (
				<meta name="keywords" content={seoConfig.keywords} />
			)}

			{/* Canonical URL */}
			<link rel="canonical" href={canonicalUrl} />

			{/* Robots */}
			{seoConfig.noindex ? (
				<meta name="robots" content="noindex, nofollow" />
			) : (
				<meta name="robots" content="index, follow" />
			)}

			{/* Open Graph / Facebook */}
			<meta property="og:type" content={seoConfig.ogType || "website"} />
			<meta property="og:url" content={canonicalUrl} />
			<meta property="og:title" content={seoConfig.title} />
			<meta property="og:description" content={seoConfig.description} />
			{seoConfig.ogImage && (
				<meta property="og:image" content={seoConfig.ogImage} />
			)}

			{/* Twitter */}
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:url" content={canonicalUrl} />
			<meta name="twitter:title" content={seoConfig.title} />
			<meta name="twitter:description" content={seoConfig.description} />
			{seoConfig.ogImage && (
				<meta name="twitter:image" content={seoConfig.ogImage} />
			)}

			{/* Additional Meta Tags */}
			{seoConfig.author && <meta name="author" content={seoConfig.author} />}
			{seoConfig.viewport && (
				<meta name="viewport" content={seoConfig.viewport} />
			)}
		</Head>
	);
};

export default SEO;

