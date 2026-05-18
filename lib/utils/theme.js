import colors from "tailwindcss/colors";

const tailwindColors = colors;
/**
 * Tailwind color variables — edit here to change app colors.
 * stone = brown-ish neutrals
 */

/**
 * Theme — maps to Tailwind variables above.
 * Usage: const T = getTheme(); then T.base, T.warm, etc.
 */
export const theme = {
	base: "#F2F2F2",
	surface: "#FFFFFF",
	accent: "#111111",
	warm: "#111111",       // was amber — now near-black for monochrome
	warmBg: "#F0F0F0",     // was amber-50 — now light gray
	muted: "#888888",
	border: "#E2E2E2",
	sidebar: "#F8F8F8",
	green: "#166534",
	greenBg: "#DCFCE7",
	red: "#991B1B",
	redBg: "#FEE2E2",
};

/**
 * Get the theme object. Use this to read colors across app/landing/table pages.
 * Usage: const T = getTheme();
 */
export const getTheme = () => theme;
