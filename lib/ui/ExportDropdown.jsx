import React, { useState } from "react";
import { Download, FileText, FileSpreadsheet, File, FileJson2 } from "lucide-react";
import AnimatedDropdown from "./AnimatedDropdown";
import { exportData } from "../api/export";
import { toast } from "sonner";

const ExportDropdown = ({ dataType, data, className = "" }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isExporting, setIsExporting] = useState(false);

	const exportOptions = [
		{
			value: "csv",
			label: "Export as CSV",
			icon: FileText,
			color: "bg-green-100 text-green-600",
		},
		{
			value: "json",
			label: "Export as JSON",
			icon: FileJson2,
			color: "bg-blue-100 text-blue-600",
		},
		{
			value: "pdf",
			label: "Export as PDF",
			icon: File,
			color: "bg-red-100 text-red-600",
		},
		{
			value: "excel",
			label: "Export as Excel",
			icon: FileSpreadsheet,
			color: "bg-emerald-100 text-emerald-600",
		},
	];

	const handleExport = async (format) => {
		if (!data || data.length === 0) {
			toast.error("No data to export");
			setIsOpen(false);
			return;
		}

		setIsExporting(true);
		try {
			await exportData(format, dataType, data, {
				filename: `${dataType}-export`,
			});
			toast.success(`Exported ${data.length} items as ${format.toUpperCase()}`);
		} catch (error) {
			console.error("Export error:", error);
			toast.error(error.message || "Failed to export data");
		} finally {
			setIsExporting(false);
			setIsOpen(false);
		}
	};

	const renderButton = () => {
		return (
			<button
				onClick={() => setIsOpen(!isOpen)}
				disabled={isExporting || !data || data.length === 0}
				className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium border border-zinc-100 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
			>
				<Download className="w-3.5 h-3.5" />
				{isExporting ? "Exporting..." : "Export"}
			</button>
		);
	};

	const renderOption = (option, isSelected) => {
		const Icon = option.icon;
		return (
			<button
				key={option.value}
				onClick={() => handleExport(option.value)}
				disabled={isExporting}
				className={`w-full px-4 py-1.5 text-left flex items-center gap-2 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
						? "bg-zinc-50 text-zinc-900 font-medium"
						: "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
					}`}
			>
				<div className={`p-1 rounded ${option.color}`}>
					<Icon className="w-3 h-3" />
				</div>
				<span>{option.label}</span>
			</button>
		);
	};

	return (
		<AnimatedDropdown
			isOpen={isOpen}
			onToggle={() => setIsOpen(!isOpen)}
			onSelect={handleExport}
			options={exportOptions}
			className="relative"
			buttonClassName="hidden"
			dropdownClassName="min-w-[160px]"
			renderButton={renderButton}
			renderOption={renderOption}
		/>
	);
};

export default ExportDropdown;
