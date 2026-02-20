import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
	setSubscription,
	clearSubscription,
	setLoading,
} from "../store/slices/subscriptionSlice";
import { getCustomerSubscription } from "../api/customers";
import { getCurrentUserEmail } from "../utils/getCurrentUserEmail";

export const useSubscription = () => {
	const dispatch = useAppDispatch();
	const subscription = useAppSelector((state) => state.subscription);

	const { data: subscriptionData, isLoading } = useQuery({
		queryKey: ["subscription"],
		queryFn: async () => {
			try {
				const email = await getCurrentUserEmail();
				if (!email) {
					return null;
				}
				return await getCustomerSubscription(email);
			} catch (error) {
				console.error("Error fetching subscription:", error);
				return null;
			}
		},
		enabled: true,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	useEffect(() => {
		if (isLoading) {
			dispatch(setLoading(true));
		} else {
			dispatch(setLoading(false));
			if (subscriptionData) {
				dispatch(setSubscription(subscriptionData));
			} else {
				dispatch(clearSubscription());
			}
		}
	}, [subscriptionData, isLoading, dispatch]);

	return {
		...subscription,
		isLoading,
	};
};
