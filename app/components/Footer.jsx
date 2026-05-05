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
								fontFamily: "'Outfit', sans-serif",
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
								fontFamily: "'Outfit', sans-serif",
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
									"https://x.com/treyvijay",
									"mailto:shreyvijayvargiya26@gmail.com",
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
										fontFamily: "'Outfit', sans-serif",
									}}
								>
									{col.title}
								</p>
								{col.links.map((l) => (
									<a
										key={l}
										href={l}
										style={{
											display: "block",
											fontSize: 14,
											color: "rgba(255,255,255,0.6)",
											textDecoration: "none",
											marginBottom: 10,
											fontFamily: "'Outfit', sans-serif",
											transition: "color 0.2s",
										}}
										onMouseEnter={(e) => (e.target.style.color = "white")}
										onMouseLeave={(e) =>
											(e.target.style.color = "rgba(255,255,255,0.6)")
										}
									>
										{l}
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
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						© 2025 inkgest. All rights reserved.
					</span>
					<span
						style={{
							fontSize: 13,
							color: "rgba(255,255,255,0.3)",
							fontFamily: "'Outfit', sans-serif",
						}}
					>
						Made for writers who publish on a deadline. Built using{" "}
						<a
							href="https://buildsaas.dev"
							target="_blank"
							className="text-orange-500"
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
					<a href="https://startupfa.me/s/inkgest?utm_source=inkgest.com" target="_blank"><img src="https://startupfa.me/badges/featured/default-small.webp" alt="Inkgest - Featured on Startup Fame" width="224" height="36" /></a>
				</div>
			</div>
		</footer>
	);
}
