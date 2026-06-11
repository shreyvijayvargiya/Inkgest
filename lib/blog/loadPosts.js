import fs from "fs";
import path from "path";
import { BLOG_POSTS } from "./blogs";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export function getAllPostsMeta() {
	return BLOG_POSTS.map(
		({ slug, title, description, banner, tags, publishedAt }) => ({
			slug,
			title,
			description,
			banner,
			tags,
			publishedAt,
		})
	);
}

export function getPostSlugs() {
	return BLOG_POSTS.map((p) => p.slug);
}

export function getPostBySlug(slug) {
	const entry = BLOG_POSTS.find((p) => p.slug === slug);
	if (!entry) return null;

	const filePath = path.join(CONTENT_DIR, entry.file);
	if (!fs.existsSync(filePath)) {
		console.warn(`[blog] Missing markdown file: ${filePath}`);
		return null;
	}

	const content = fs.readFileSync(filePath, "utf8");

	return {
		slug: entry.slug,
		title: entry.title,
		description: entry.description,
		banner: entry.banner,
		tags: entry.tags,
		publishedAt: entry.publishedAt,
		content,
	};
}
