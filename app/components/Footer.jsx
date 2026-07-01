import { theme } from "../../lib/utils/theme";

export default function Footer() {
	const T = theme;
	return (
		<footer style={{ background: T.surface, padding: "56px 24px 36px" }}>
			<div className="max-w-6xl mx-auto text-black">
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
								maxWidth: 200,
								lineHeight: 1.6,
								fontFamily: "'Comic', sans-serif",
							}}
						>
							Inkgest: A writing pad of 21st century
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
											textDecoration: "none",
											marginBottom: 4,
											fontFamily: "'Comic', sans-serif",
											transition: "color 0.2s",
										}}
										onMouseEnter={(e) => (e.target.style.color = "black")}
										onMouseLeave={(e) =>
											(e.target.style.color = "black")
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
						borderTop: "1px solid #E2E2E2",
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
							fontFamily: "'Comic', sans-serif",
						}}
					>
						© 2025 inkgest. All rights reserved.
					</span>
					<span
						style={{
							fontSize: 13,
							fontFamily: "'Comic', sans-serif",
						}}
					>
						Made for writers who publish on a deadline. Built using{" "}
						<a
							href="https://buildsaas.dev"
							target="_blank"
							className="inline-flex items-center min-h-12 px-0.5 rounded-sm underline-offset-2"
							rel="noopener noreferrer"
						>
							Buildsaas
						</a>
					</span>
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 my-4 max-w-6xl mx-auto border-t border-zinc-200 pt-4">
				<p className="text-sm ">Listed/Features on</p>
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
					<a
						href="https://sellwithboost.com"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center min-h-12 py-2 px-1 rounded-xl"
					>
						<img
							src="https://sellwithboost.com/badge/listing.svg"
							alt="Listed on Sell With boost"
							width={120}
							height={40}
							className="block h-10 w-auto"
						/>
					</a>
				</div>
			</div>
		</footer>
	);
}
