import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Coins } from "lucide-react";
import {
	getCreditsSettings,
	updateCreditsSettings,
} from "../../../lib/api/settings";
import { getCachedUserRole } from "../../../lib/utils/getUserRole";
import { toast } from "sonner";

const CreditsSettingsTab = ({ queryClient }) => {
	const queryClientInstance = queryClient;
	const [freeCreditLimit, setFreeCreditLimit] = useState(10);

	const { data: settings, isLoading } = useQuery({
		queryKey: ["creditsSettings"],
		queryFn: getCreditsSettings,
	});

	useEffect(() => {
		if (settings?.freeCreditLimit != null) {
			setFreeCreditLimit(settings.freeCreditLimit);
		}
	}, [settings?.freeCreditLimit]);

	const updateMutation = useMutation({
		mutationFn: (data) => updateCreditsSettings(data),
		onSuccess: () => {
			queryClientInstance?.invalidateQueries?.({
				queryKey: ["creditsSettings"],
			});
			toast.success("Credit limit updated successfully");
		},
		onError: (err) => {
			toast.error(err?.message || "Failed to update credit limit");
		},
	});

	const isAdmin = getCachedUserRole() === "admin";

	const handleSave = () => {
		const num = parseInt(freeCreditLimit, 10);
		if (isNaN(num) || num < 1 || num > 1000) {
			toast.error("Please enter a valid number between 1 and 1000");
			return;
		}
		updateMutation.mutate({ freeCreditLimit: num });
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-48 bg-zinc-200 rounded" />
					<div className="h-12 w-full max-w-xs bg-zinc-200 rounded" />
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 max-w-2xl">
			<div className="flex items-center gap-2 mb-6">
				<Coins className="w-5 h-5 text-zinc-600" />
				<h2 className="text-lg font-semibold text-zinc-900">
					Usage Credit Limits
				</h2>
			</div>

			<div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
				<label className="block text-sm font-medium text-zinc-700 mb-2">
					Free plan monthly credit limit
				</label>
				<p className="text-xs text-zinc-500 mb-3">
					Free users receive this many credits per month. Pro users have
					unlimited credits.
				</p>
				<div className="flex items-center gap-3">
					<input
						type="number"
						min={1}
						max={1000}
						value={freeCreditLimit}
						onChange={(e) => setFreeCreditLimit(e.target.value)}
						disabled={!isAdmin}
						className="w-24 px-3 py-2 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500"
					/>
					<span className="text-sm text-zinc-600">credits / month</span>
					{isAdmin && (
						<button
							onClick={handleSave}
							disabled={updateMutation.isPending}
							className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 disabled:opacity-60"
						>
							<Save className="w-4 h-4" />
							{updateMutation.isPending ? "Saving…" : "Save"}
						</button>
					)}
				</div>
				{!isAdmin && (
					<p className="text-xs text-amber-600 mt-2">
						Only admins can change this setting.
					</p>
				)}
			</div>
		</div>
	);
};

export default CreditsSettingsTab;
