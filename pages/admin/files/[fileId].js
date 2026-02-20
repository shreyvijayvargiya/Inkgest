import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAssetByFileId } from "../../../lib/api/assets";
import { Loader2 } from "lucide-react";

const FilePage = () => {
	const router = useRouter();
	const { fileId } = router.query;
	const [asset, setAsset] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (fileId) {
			fetchAsset();
		}
	}, [fileId]);

	const fetchAsset = async () => {
		try {
			setLoading(true);
			setError(null);
			const assetData = await getAssetByFileId(fileId);
			setAsset(assetData);
		} catch (err) {
			console.error("Error fetching asset:", err);
			setError("File not found");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50">
				<Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
			</div>
		);
	}

	if (error || !asset) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-50">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-zinc-900 mb-2">
						File Not Found
					</h1>
					<p className="text-zinc-600">
						The file you're looking for doesn't exist or has been removed.
					</p>
				</div>
			</div>
		);
	}

	// Determine if it's an image, video, or other file
	const isImage = asset.type?.startsWith("image/");
	const isVideo = asset.type?.startsWith("video/");
	const isPDF = asset.type === "application/pdf";

	return (
		<div className="min-h-screen w-full bg-zinc-900 flex items-center justify-center p-0 m-0">
			{isImage && (
				<img
					src={asset.url}
					alt={asset.name}
					className="max-w-full max-h-screen w-auto h-auto object-contain"
				/>
			)}

			{isVideo && (
				<video
					src={asset.url}
					controls
					className="max-w-full max-h-screen w-auto h-auto"
				>
					Your browser does not support the video tag.
				</video>
			)}

			{isPDF && (
				<iframe
					src={asset.url}
					className="w-full h-screen border-0"
					title={asset.name}
				/>
			)}

			{!isImage && !isVideo && !isPDF && (
				<div className="flex items-center justify-center min-h-screen">
					<a
						href={asset.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
					>
						Download File
					</a>
				</div>
			)}
		</div>
	);
};

export default FilePage;

