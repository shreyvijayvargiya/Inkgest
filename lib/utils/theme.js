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
	base: colors.stone[100],
	surface: colors.white,
	accent: colors.zinc[900],
	warm: colors.amber[600],
	muted: colors.stone[500],
	border: colors.stone[200],
	sidebar: colors.stone[50],
	green: colors.green[800],
	greenBg: colors.green[100],
	red: colors.red[800],
	redBg: colors.red[100],
};

/**
 * Get the theme object. Use this to read colors across app/landing/table pages.
 * Usage: const T = getTheme();
 */
export const getTheme = () => theme;
