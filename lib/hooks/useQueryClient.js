import { useQueryClient } from "@tanstack/react-query";

/**
 * Custom hook to get the QueryClient instance
 * This centralizes the useQueryClient hook usage
 * @returns {QueryClient} The QueryClient instance
 */
export const useAppQueryClient = () => {
	return useQueryClient();
};

