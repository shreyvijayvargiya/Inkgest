import { useMutation } from "@tanstack/react-query";
import {
	fetchScrapeMultiple,
	fetchScrapeSingle,
	fetchScrapeYoutube,
} from "../api/inkgestScrapeClient";

/**
 * React Query mutations wrapping Hono /scrape, /scrape-multiple, /scrape-youtube (browser → NEXT_PUBLIC_INKGEST_GENERATE_URL).
 */
export function useInkgestScrape() {
	const scrapeOne = useMutation({
		mutationFn: (url) => fetchScrapeSingle(url),
	});
	const scrapeMany = useMutation({
		mutationFn: (urls) => fetchScrapeMultiple(urls),
	});
	const scrapeYoutube = useMutation({
		mutationFn: (url) => fetchScrapeYoutube(url),
	});
	return { scrapeOne, scrapeMany, scrapeYoutube };
}
