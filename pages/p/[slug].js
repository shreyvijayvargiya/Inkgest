/**
 * Public blog page — /p/[slug]
 * Renders a published Inkgest blog post with full SEO meta tags.
 * Uses getServerSideProps for SSR (SEO-friendly) + React Query for client-side refresh.
 * Optional `?theme=<id>` applies an export theme to the shell and renders themed HTML inline (no iframe).
 */
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import {
	THEMES,
	buildThemedArticleFragment,
	PREVIEW_INTERACTION_SCRIPT,
	resolvePublicThemeId,
} from "../../lib/blogExportThemes";
import normalizeYoutubeEmbedsInHtml from "../../lib/utils/normalizeYoutubeEmbeds";
import { useHydrateMermaid } from "../../lib/hooks/useHydrateMermaid";

/* ── Fetch helper ── */
async function fetchPublicDoc(slug) {
	const res = await fetch(`/api/getPublicDoc?slug=${encodeURIComponent(slug)}`);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || "Not found");
	}
	return res.json();
}

/* ── SSR: fetch for SEO ── */
export async function getServerSideProps(ctx) {
	const { slug } = ctx.params;
	try {
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(ctx.req
				? `${ctx.req.headers["x-forwarded-proto"] || "https"}://${ctx.req.headers.host}`
				: "");
		const res = await fetch(
			`${baseUrl}/api/getPublicDoc?slug=${encodeURIComponent(slug)}`,
		);
		if (!res.ok) return { notFound: true };
		const data = await res.json();
		const body = normalizeYoutubeEmbedsInHtml(data.body || "");
		const rawTheme =
			typeof ctx.query?.theme === "string"
				? ctx.query.theme
				: Array.isArray(ctx.query?.theme)
					? ctx.query.theme[0]
					: "";
		const initialResolvedTheme = resolvePublicThemeId(rawTheme);
		return {
			props: {
				initialData: { ...data, body },
				slug,
				initialResolvedTheme,
			},
		};
	} catch {
		return { notFound: true };
	}
}

/* ── Styles ── */
const PAGE_STYLE = `
	@import url('https://fonts.googleapis.com/css2?family=Comic:wght@300;400;500;600;700&family=Comic:wght@400;500;600;700&display=swap');
	*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
	body { font-family: 'Comic', sans-serif; background: #F7F5F0; color: #57534E; -webkit-font-smoothing: antialiased; }
	::-webkit-scrollbar { width: 5px; }
	::-webkit-scrollbar-thumb { background: #E8E4DC; border-radius: 10px; }

	/* Themed public preview: title matches export theme h1 */
	.ink-public-themed-title { margin: 0 0 14px; }

	/* Prose content styles */
	.ink-prose h1 { font-size: 2rem; font-weight: 700; color: #292524; margin: 0 0 12px; line-height: 1.25; }
	.ink-prose h2 { font-size: 1.45rem; font-weight: 700; color: #292524; margin: 32px 0 10px; }
	.ink-prose h3 { font-size: 1.15rem; font-weight: 600; color: #292524; margin: 24px 0 8px; }
	.ink-prose p  { font-size: 1rem; line-height: 1.8; margin: 0 0 14px; color: #57534E; }
	.ink-prose ul, .ink-prose ol { padding-left: 22px; margin: 0 0 14px; }
	.ink-prose li { margin-bottom: 5px; line-height: 1.7; }
	.ink-prose blockquote { border-left: 3px solid #D97706; padding: 8px 16px; background: #FFFBEB; border-radius: 0 8px 8px 0; margin: 16px 0; color: #78716C; font-style: italic; }
	.ink-prose pre  { background: #1C1917; color: #F5F5F4; border-radius: 10px; padding: 16px 20px; overflow-x: auto; font-size: 13px; margin: 16px 0; }
	.ink-prose code { font-family: 'Fira Code', 'JetBrains Mono', monospace; font-size: 13px; background: #F0ECE5; padding: 2px 5px; border-radius: 4px; color: #D97706; }
	.ink-prose pre code { background: transparent; color: inherit; padding: 0; }
	.ink-prose img  { max-width: 100%; border-radius: 10px; margin: 16px 0; display: block; }
	.ink-prose a    { color: #D97706; text-decoration: underline; }
	.ink-prose hr   { border: none; border-top: 1px solid #E7E2DA; margin: 24px 0; }
	.ink-prose table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
	.ink-prose th   { background: #F0ECE5; padding: 8px 12px; text-align: left; font-weight: 600; border: 1px solid #E7E2DA; }
	.ink-prose td   { padding: 8px 12px; border: 1px solid #E7E2DA; }
	.ink-prose figure { margin: 16px 0; }
	.ink-prose iframe { max-width: 100%; width: 100%; aspect-ratio: 16 / 9; height: auto; min-height: 200px; border: 0; border-radius: 10px; display: block; }
	.ink-prose [data-ink-infographic-wrap],
	.ink-prose .ink-infographic-slot {
		margin: 22px auto;
		max-width: 560px;
		width: 100%;
		display: block;
	}
	.ink-prose iframe[data-ink-infographic="1"] {
		aspect-ratio: auto;
		min-height: 440px;
		height: auto;
		max-height: none;
	}
	.ink-prose .ink-mermaid-slot { margin: 22px auto; max-width: 100%; overflow-x: auto; text-align: center; }
	.ink-prose .ink-mermaid-slot pre.mermaid { margin: 0 auto; display: inline-block; max-width: 100%; text-align: left; background: #FAFAF9; border: 1px solid #E8E4DC; border-radius: 10px; padding: 12px 14px; font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.45; color: #292524; }
	.ink-prose .ink-mermaid-slot svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }

	/* Toggle group */
	details[data-block="draft-toggle"] summary::-webkit-details-marker { display: none; }
	details[data-block="draft-toggle"] summary { list-style: none; cursor: pointer; }
`;

/** Derive navbar / shell colors from an export theme (?theme= preview URLs). */
function shellTokensFromTheme(theme) {
	if (!theme) return null;
	const accent = theme.palette?.[2] ?? "#C17B2F";
	const muted = theme.palette?.[3] ?? "#78716C";
	const border =
		(typeof theme.hr === "string" &&
			theme.hr.match(/solid\s+(#[0-9A-Fa-f]{3,8})/i)?.[1]) ||
		(typeof theme.hr === "string" && theme.hr.match(/#[0-9A-Fa-f]{3,8}/i)?.[0]) ||
		"#E7E2DA";
	return {
		bg: theme.bg,
		text: theme.text,
		muted,
		accent,
		border,
		bodyFont: theme.bodyFont,
		fontUrl: theme.fontUrl || "",
		h1Css: theme.h1,
	};
}

function isRoughlyDarkBg(hex) {
	const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? "").trim());
	if (!m) return false;
	const n = parseInt(m[1], 16);
	const r = (n >> 16) & 255;
	const g = (n >> 8) & 255;
	const b = n & 255;
	return r * 0.299 + g * 0.587 + b * 0.114 < 130;
}

export default function PublicBlogPage({ initialData, slug, initialResolvedTheme = null }) {
	const router = useRouter();
	const currentSlug = router.query.slug || slug;
	const [clientReady, setClientReady] = useState(false);
	const [themedArticle, setThemedArticle] = useState(null);

	useEffect(() => {
		setClientReady(true);
	}, []);

	const themeKey = useMemo(() => {
		if (!router.isReady) return initialResolvedTheme;
		const q = router.query?.theme;
		const raw = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
		return resolvePublicThemeId(raw);
	}, [router.isReady, router.query?.theme, initialResolvedTheme]);

	const activeTheme = themeKey ? THEMES[themeKey] : null;
	const shell = useMemo(() => shellTokensFromTheme(activeTheme), [activeTheme]);
	const useThemeShell = Boolean(shell);

	const { data, isLoading, isError } = useQuery({
		queryKey: ["public-blog", currentSlug],
		queryFn: () => fetchPublicDoc(currentSlug),
		initialData,
		staleTime: 60 * 1000,
		retry: false,
	});

	const { title, description, body, publishedAt, updatedAt } = data || {};
	const safeBody = normalizeYoutubeEmbedsInHtml(body || "");

	useEffect(() => {
		if (!clientReady || !themeKey || !data) {
			setThemedArticle(null);
			return;
		}
		const theme = THEMES[themeKey];
		if (!theme) {
			setThemedArticle(null);
			return;
		}
		const parts = buildThemedArticleFragment(safeBody, theme);
		setThemedArticle(parts);
	}, [clientReady, themeKey, data, safeBody]);

	/** Tabs / code-copy inside themed blocks (same behaviour as export iframe). */
	useEffect(() => {
		if (!themeKey || typeof document === "undefined") return;
		const id = "ink-public-themed-delegation";
		if (document.getElementById(id)) return;
		const s = document.createElement("script");
		s.id = id;
		s.textContent = PREVIEW_INTERACTION_SCRIPT;
		document.body.appendChild(s);
		return () => {
			document.getElementById(id)?.remove();
		};
	}, [themeKey]);

	const showThemedInline = Boolean(
		clientReady &&
			themeKey &&
			themedArticle?.fragmentHtml &&
			themedArticle?.scopedCss,
	);

	const mermaidHydrateKey = useMemo(
		() =>
			`${currentSlug}|${safeBody?.length ?? 0}|${showThemedInline ? themedArticle?.fragmentHtml?.length ?? 0 : 0}|${themeKey ?? ""}`,
		[
			currentSlug,
			safeBody,
			showThemedInline,
			themedArticle?.fragmentHtml,
			themeKey,
		],
	);

	useHydrateMermaid(Boolean(clientReady && data), mermaidHydrateKey);

	const canonicalUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/p/${currentSlug}`
			: `/p/${currentSlug}`;

	/* ── Loading ── */
	if (isLoading && !data) {
		return (
			<>
				<style>{PAGE_STYLE}</style>
				<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
						<div style={{ width: 32, height: 32, border: "3px solid #E7E2DA", borderTopColor: "#D97706", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
						<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
						<p style={{ color: "#A8A29E", fontSize: 14 }}>Loading…</p>
					</div>
				</div>
			</>
		);
	}

	/* ── Error / Not found ── */
	if (isError || !data) {
		return (
			<>
				<Head><title>Not Found — Inkgest</title></Head>
				<style>{PAGE_STYLE}</style>
				<div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "40px 20px" }}>
					<p style={{ fontSize: 64, lineHeight: 1 }}>📄</p>
					<h1 style={{ fontSize: 22, fontWeight: 700, color: "#292524" }}>Page not found</h1>
					<p style={{ color: "#A8A29E", fontSize: 14, textAlign: "center", maxWidth: 300 }}>
						This blog post is either private, has been removed, or the URL is incorrect.
					</p>
					<Link href="/" style={{ color: "#D97706", fontSize: 14, textDecoration: "underline" }}>← Back to home</Link>
				</div>
			</>
		);
	}

	const publishDate = publishedAt
		? new Date(publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
		: null;

	return (
		<>
			<Head>
				<title>{title ? `${title} — Inkgest` : "Inkgest Blog"}</title>
				<meta name="description" content={description || (safeBody ? safeBody.replace(/<[^>]+>/g, "").slice(0, 155) : "A blog post published on Inkgest")} />
				<link rel="canonical" href={canonicalUrl} />

				{/* Open Graph */}
				<meta property="og:type" content="article" />
				<meta property="og:title" content={title || "Inkgest Blog"} />
				<meta property="og:description" content={description || (safeBody ? safeBody.replace(/<[^>]+>/g, "").slice(0, 155) : "")} />
				<meta property="og:url" content={canonicalUrl} />
				<meta property="og:site_name" content="Inkgest" />
				{publishedAt && <meta property="article:published_time" content={publishedAt} />}
				{updatedAt && <meta property="article:modified_time" content={updatedAt} />}

				{/* Twitter Card */}
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:title" content={title || "Inkgest Blog"} />
				<meta name="twitter:description" content={description || (safeBody ? safeBody.replace(/<[^>]+>/g, "").slice(0, 155) : "")} />

				{/* JSON-LD structured data */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "BlogPosting",
							headline: title,
							description: description || "",
							datePublished: publishedAt,
							dateModified: updatedAt || publishedAt,
							url: canonicalUrl,
							publisher: {
								"@type": "Organization",
								name: "Inkgest",
								url: typeof window !== "undefined" ? window.location.origin : "",
							},
						}),
					}}
				/>
				<style>{PAGE_STYLE}</style>
				{useThemeShell && shell.fontUrl ? (
					<link key={shell.fontUrl} rel="stylesheet" href={shell.fontUrl} />
				) : null}
				{useThemeShell && shell.h1Css ? (
					<style
						dangerouslySetInnerHTML={{
							__html: `.ink-public-themed-title { ${shell.h1Css} }`,
						}}
					/>
				) : null}
			</Head>

			{/* ── Page shell ── */}
			<div
				style={{
					minHeight: "100vh",
					background: useThemeShell ? shell.bg : "#F7F5F0",
					color: useThemeShell ? shell.text : undefined,
					fontFamily: useThemeShell ? shell.bodyFont : undefined,
				}}
			>
				{/* Navbar */}
				<nav
					style={{
						background: useThemeShell ? shell.bg : "#FFFFFF",
						borderBottom: `1px solid ${useThemeShell ? shell.border : "#E7E2DA"}`,
						padding: "12px 0",
						position: "sticky",
						top: 0,
						zIndex: 10,
					}}
				>
					<div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
							<span
								style={{
									fontSize: 18,
									fontWeight: 800,
									color: useThemeShell ? shell.accent : "#D97706",
									fontFamily: useThemeShell ? shell.bodyFont : "'Comic', sans-serif",
									letterSpacing: "-0.5px",
								}}
							>
								Inkgest
							</span>
						</Link>
						<Link
							href="/"
							style={{
								fontSize: 12,
								color: useThemeShell ? shell.muted : "#A8A29E",
								textDecoration: "none",
								display: "flex",
								alignItems: "center",
								gap: 4,
							}}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
							Back
						</Link>
					</div>
				</nav>

				{/* Article */}
				<main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 0 96px" }}>
					{/* Header */}
					<header style={{ marginBottom: 36 }}>
						<h1
							className={useThemeShell ? "ink-public-themed-title" : undefined}
							style={
								useThemeShell
									? undefined
									: {
											fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
											fontWeight: 800,
											color: "#1C1917",
											lineHeight: 1.2,
											marginBottom: 14,
											fontFamily: "'Comic', sans-serif",
										}
							}
						>
							{title || "Untitled"}
						</h1>
						{description && (
							<p
								style={{
									fontSize: 16,
									color: useThemeShell ? shell.muted : "#78716C",
									lineHeight: 1.65,
									marginBottom: 14,
								}}
							>
								{description}
							</p>
						)}
						<div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
							{publishDate && (
								<span
									style={{
										fontSize: 12,
										color: useThemeShell ? shell.muted : "#A8A29E",
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
									{publishDate}
								</span>
							)}
						</div>
					</header>

					{showThemedInline ? (
						<>
							<style
								dangerouslySetInnerHTML={{
									__html: themedArticle.scopedCss,
								}}
							/>
							<div
								className="ink-themed-post-root"
								dangerouslySetInnerHTML={{
									__html: themedArticle.fragmentHtml,
								}}
								suppressHydrationWarning
							/>
						</>
					) : themeKey && clientReady && data ? (
						<p
							style={{
								fontSize: 14,
								color: useThemeShell ? shell.muted : "#A8A29E",
								textAlign: "center",
							}}
						>
							Applying theme preview…
						</p>
					) : (
						<article
							className="ink-prose"
							dangerouslySetInnerHTML={{ __html: safeBody }}
							suppressHydrationWarning
						/>
					)}

					{/* Footer */}
					<footer
						style={{
							marginTop: 64,
							paddingTop: 24,
							borderTop: `1px solid ${useThemeShell ? shell.border : "#E7E2DA"}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: 12,
						}}
					>
						<span style={{ fontSize: 12, color: useThemeShell ? shell.muted : "#A8A29E" }}>
							Written with{" "}
							<Link href="/" style={{ color: useThemeShell ? shell.accent : "#D97706", textDecoration: "none", fontWeight: 600 }}>
								Inkgest
							</Link>
						</span>
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(window.location.href);
							}}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 5,
								padding: "6px 12px",
								borderRadius: 7,
								border: `1px solid ${useThemeShell ? shell.border : "#E7E2DA"}`,
								background:
									useThemeShell && isRoughlyDarkBg(shell.bg)
										? "rgba(255,255,255,0.08)"
										: useThemeShell
											? "rgba(255,255,255,0.92)"
											: "#FFFFFF",
								color: useThemeShell ? shell.muted : "#78716C",
								fontSize: 12,
								cursor: "pointer",
								fontWeight: 500,
							}}
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
							Copy link
						</button>
					</footer>
				</main>
			</div>
		</>
	);
}
