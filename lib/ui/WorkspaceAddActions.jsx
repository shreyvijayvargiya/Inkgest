import { FolderPlus, FilePlus } from "lucide-react";

export default function WorkspaceAddActions({ onAddFolder, onAddFile }) {
	if (!onAddFolder && !onAddFile) return null;
	return (
		<div className="flex items-center gap-1">
			{onAddFolder && (
				<button
					type="button"
					title="New folder"
					onClick={onAddFolder}
					className="flex items-center justify-center w-7 h-7 rounded-xl border border-[#E8E4DC] bg-[#FAFAF8] text-[#888888] hover:bg-[#F0ECE5] hover:text-[#111111] cursor-pointer"
				>
					<FolderPlus className="w-3.5 h-3.5" aria-hidden />
				</button>
			)}
			{onAddFile && (
				<button
					type="button"
					title="New draft"
					onClick={onAddFile}
					className="flex items-center justify-center w-7 h-7 rounded-xl border border-[#E8E4DC] bg-[#FAFAF8] text-[#888888] hover:bg-[#F0ECE5] hover:text-[#111111] cursor-pointer"
				>
					<FilePlus className="w-3.5 h-3.5" aria-hidden />
				</button>
			)}
		</div>
	);
}
