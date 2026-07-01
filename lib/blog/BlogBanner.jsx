/** True when banner is a site-relative or absolute image URL. */
export function isBannerImageUrl(banner) {
	if (!banner || typeof banner !== "string") return false;
	return banner.startsWith("/") || /^https?:\/\//i.test(banner);
}

/**
 * Renders an image `src` or a centered emoji block for text banners (e.g. "📡").
 */
export default function BlogBanner({ banner, variant = "card" }) {
	const isImg = isBannerImageUrl(banner);
	if (isImg) {
		return (
			<img
				src={banner}
				alt=""
				className={
					variant === "card"
						? "w-full h-full object-cover opacity-95 group-hover:scale-[1.02] transition-transform duration-500"
						: "w-full h-full object-cover"
				}
			/>
		);
	}
	const size =
		variant === "hero"
			? "text-6xl sm:text-7xl md:text-8xl"
			: "text-5xl sm:text-6xl md:text-7xl";
	return (
		<div
			className={`w-full h-full min-h-[8rem] flex items-center justify-center bg-gradient-to-br from-[#F5EFE6] to-[#E8E4DC] ${
				variant === "card"
					? "group-hover:scale-[1.02] transition-transform duration-500"
					: ""
			}`}
		>
			<span
				className={`${size} leading-none select-none`}
				role="img"
				aria-label="Post banner"
			>
				{String(banner).trim()}
			</span>
		</div>
	);
}
