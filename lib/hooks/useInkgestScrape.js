import { useMutation } from "@tanstack/react-query";
import { fetchScrapeMultiple, fetchScrapeSingle } from "../api/inkgestScrapeClient";

/**
 * React Query mutations wrapping Hono /scrape and /scrape-multiple (browser → NEXT_PUBLIC_INKGEST_GENERATE_URL).
 */
export function useInkgestScrape() {
	const scrapeOne = useMutation({
		mutationFn: (url) => fetchScrapeSingle(url),
	});
	const scrapeMany = useMutation({
		mutationFn: (urls) => fetchScrapeMultiple(urls),
	});
	return { scrapeOne, scrapeMany };
}
