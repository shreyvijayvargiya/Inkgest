/**
 * Main export module
 * Provides unified interface for all export functions
 */

export * from "./utils";
export * from "./csv";
export * from "./json";
export * from "./pdf";
export * from "./excel";

/**
 * Export data in specified format
 * @param {string} format - Export format ('csv', 'json', 'pdf', 'excel')
 * @param {string} dataType - Type of data (blogs, emails, etc.)
 * @param {Array} data - Data array
 * @param {Object} options - Export options
 * @returns {Promise<void>}
 */
export const exportData = async (format, dataType, data, options = {}) => {
	const { filename } = options;

	switch (format.toLowerCase()) {
		case "csv": {
			const { exportDataToCSV, downloadCSV } = await import("./csv");
			const csvContent = exportDataToCSV(dataType, data);
			downloadCSV(csvContent, filename || `${dataType}-export.csv`);
			break;
		}
		case "json": {
			const { exportDataToJSON, downloadJSON } = await import("./json");
			const jsonContent = exportDataToJSON(data, options);
			downloadJSON(jsonContent, filename || `${dataType}-export.json`);
			break;
		}
		case "pdf": {
			const { exportDataToPDF, downloadPDF } = await import("./pdf");
			const pdfBlob = exportDataToPDF(dataType, data);
			downloadPDF(pdfBlob, filename || `${dataType}-export.pdf`);
			break;
		}
		case "excel":
		case "xlsx": {
			const { exportDataToExcel, downloadExcel } = await import("./excel");
			const excelBlob = await exportDataToExcel(dataType, data);
			downloadExcel(excelBlob, filename || `${dataType}-export.xlsx`);
			break;
		}
		default:
			throw new Error(`Unsupported export format: ${format}`);
	}
};
