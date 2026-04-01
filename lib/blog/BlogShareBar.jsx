import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Linkedin } from "lucide-react";

function XIcon({ className }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden
		>
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

export default function BlogShareBar({ title, slug, shareUrl: shareUrlProp }) {
	const [href, setHref] = useState(shareUrlProp || "");
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!shareUrlProp && typeof window !== "undefined") {
			setHref(window.location.href);
		}
	}, [shareUrlProp]);

	const getUrl = useCallback(() => {
		if (href) return href;
		if (typeof window !== "undefined") {
			return window.location.href;
		}
		return "";
	}, [href]);

	const copyLink = async () => {
		const toCopy =
			getUrl() ||
			(typeof window !== "undefined"
				? `${window.location.origin}/blog/${slug}`
				: "");
		if (!toCopy) return;
		try {
			await navigator.clipboard.writeText(toCopy);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// ignore
		}
	};

	const openTwitter = () => {
		const u = getUrl();
		if (!u) return;
		const q = new URLSearchParams({
			url: u,
			text: title,
		});
		window.open(
			`https://twitter.com/intent/tweet?${q}`,
			"_blank",
			"noopener,noreferrer",
		);
	};

	const openLinkedIn = () => {
		const u = getUrl();
		if (!u) return;
		const q = new URLSearchParams({ url: u });
		window.open(
			`https://www.linkedin.com/sharing/share-offsite/?${q}`,
			"_blank",
			"noopener,noreferrer",
		);
	};

	return (
		<div className="flex flex-wrap items-center gap-2 mb-6">
			<span className="text-xs uppercase tracking-wide text-[#9A9590] mr-1">
				Share
			</span>
			<button
				type="button"
				onClick={copyLink}
				className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-1.5 text-sm font-medium text-[#5A5550] hover:border-[#C17B2F]/50 hover:text-[#1A1A1A] transition-colors"
			>
				{copied ? (
					<Check className="w-4 h-4 text-[#2d7a4d]" strokeWidth={2} />
				) : (
					<Copy className="w-4 h-4" strokeWidth={2} />
				)}
				{copied ? "Copied" : "Copy link"}
			</button>
			<button
				type="button"
				onClick={openTwitter}
				className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-1.5 text-sm font-medium text-[#5A5550] hover:border-[#C17B2F]/50 hover:text-[#1A1A1A] transition-colors"
				aria-label="Share on X"
			>
				<XIcon className="w-4 h-4" />X
			</button>
			<button
				type="button"
				onClick={openLinkedIn}
				className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E4DC] bg-white px-3 py-1.5 text-sm font-medium text-[#5A5550] hover:border-[#C17B2F]/50 hover:text-[#1A1A1A] transition-colors"
				aria-label="Share on LinkedIn"
			>
				<Linkedin className="w-4 h-4" strokeWidth={2} />
				LinkedIn
			</button>
		</div>
	);
}
