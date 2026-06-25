import { theme } from "../../lib/utils/theme";

export default function Footer() {
	const T = theme;
	return (
		<footer style={{ background: T.accent, padding: "56px 24px 36px" }}>
			<div className="max-w-6xl mx-auto">
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						marginBottom: 48,
						gap: 40,
						flexWrap: "wrap",
					}}
				>
					<div>
						<div
							style={{
								fontFamily: "'Comic', sans-serif",
								fontSize: 24,
								color: "white",
								display: "flex",
								alignItems: "center",
								gap: 8,
								marginBottom: 10,
							}}
						>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: T.warm,
									display: "inline-block",
								}}
							/>
							inkgest
						</div>
						<p
							style={{
								fontSize: 13,
								color: "rgba(255,255,255,0.4)",
								maxWidth: 200,
								lineHeight: 1.6,
								fontFamily: "'Comic', sans-serif",
							}}
						>
							Turn any URL into a newsletter, email, or blog post, infographics
							etc
						</p>
					</div>
					<div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
						{[
							{
								title: "Connect",
								links: [
									{
										href: "https://x.com/treyvijay",
										label: "X (@treyvijay)",
									},
									{
										href: "mailto:shreyvijayvargiya26@gmail.com",
										label: "Email",
									},
								],
							},
						].map((col) => (
							<div key={col.title}>
								<p
									style={{
										fontSize: 12,
										fontWeight: 700,
										textTransform: "",
										letterSpacing: "0.1em",
										color: "rgba(255,255,255,0.35)",
										marginBottom: 16,
										fontFamily: "'Comic', sans-serif",
									}}
								>
									{col.title}
								</p>
								{col.links.map((item) => (
									<a
										key={item.href}
										href={item.href}
										target={
											item.href.startsWith("mailto:") ? undefined : "_blank"
										}
										rel={
											item.href.startsWith("mailto:")
												? undefined
												: "noopener noreferrer"
										}
										style={{
											display: "flex",
											alignItems: "center",
											minHeight: 48,
											fontSize: 14,
											color: "rgba(255,255,255,0.6)",
											textDecoration: "none",
											marginBottom: 4,
											fontFamily: "'Comic', sans-serif",
											transition: "color 0.2s",
										}}
										onMouseEnter={(e) => (e.target.style.color = "white")}
										onMouseLeave={(e) =>
											(e.target.style.color = "rgba(255,255,255,0.6)")
										}
									>
										{item.label}
									</a>
								))}
							</div>
						))}
					</div>
				</div>
				<div
					style={{
						borderTop: "1px solid rgba(255,255,255,0.1)",
						paddingTop: 28,
						display: "flex",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: 12,
					}}
				>
					<span
						style={{
							fontSize: 13,
							color: "rgba(255,255,255,0.3)",
							fontFamily: "'Comic', sans-serif",
						}}
					>
						© 2025 inkgest. All rights reserved.
					</span>
					<span
						style={{
							fontSize: 13,
							color: "rgba(255,255,255,0.3)",
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Made for writers who publish on a deadline. Built using{" "}
						<a
							href="https://buildsaas.dev"
							target="_blank"
							className="inline-flex items-center min-h-12 px-0.5 rounded-sm underline-offset-2"
							style={{ color: T.surface }}
							rel="noopener noreferrer"
						>
							Buildsaas
						</a>
					</span>
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 my-4 max-w-6xl mx-auto border-t border-white/10 pt-4">
				<p className="text-sm text-white">Listed/Features on</p>
				<div className="flex items-center gap-2">
					<a
						href="https://startupfa.me/s/inkgest?utm_source=inkgest.com"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center min-h-12 py-2 px-1 rounded-xl"
					>
						<img
							src="https://startupfa.me/badges/featured/default-small.webp"
							alt="Inkgest — Featured on Startup Fame"
							width={224}
							height={36}
							className="block max-h-9 w-auto"
						/>
					</a>
					<a href="https://sellwithboost.com" target="_blank" rel="noopener noreferrer">
						<img src="https://sellwithboost.com/badge/listing.svg" alt="Listed on Sell With boost" style="height: 40px; width: auto;" />
					</a>
				</div>
			</div>
		</footer>
	);
}
