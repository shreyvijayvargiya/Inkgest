import { useMutation } from "@tanstack/react-query";
import {
	fetchScrapeMultiple,
	fetchScrapeSingle,
	fetchScrapeYoutube,
	fetchTranslate,
} from "../api/inkgestScrapeClient";

/**
 * React Query mutations wrapping Hono scrape + translate (browser → NEXT_PUBLIC_INKGEST_GENERATE_URL).
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
	const translate = useMutation({
		mutationFn: ({ idToken, markdown, language }) =>
			fetchTranslate({ idToken, markdown, language }),
	});
	return { scrapeOne, scrapeMany, scrapeYoutube, translate };
}
