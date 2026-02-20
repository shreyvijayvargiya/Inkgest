/**
 * Convert AST (Abstract Syntax Tree) to TOON format
 * TOON format is a text-based hierarchical representation of code structures
 * @param {Object} ast - AST tree structure
 * @param {number} indent - Current indentation level
 * @returns {string} TOON format string
 */
export const astToToon = (ast, indent = 0) => {
	if (!ast) return "";

	const indentStr = "  ".repeat(indent);
	let toon = "";

	if (ast.type === "file") {
		// File representation in TOON format
		toon += `${indentStr}📄 ${ast.name}\n`;
		toon += `${indentStr}  path: ${ast.path}\n`;
		toon += `${indentStr}  size: ${ast.size} bytes\n`;
		toon += `${indentStr}  lines: ${ast.lines}\n`;
		toon += `${indentStr}  extension: ${ast.extension || "none"}\n`;

		// Include content if available
		if (ast.content) {
			toon += `${indentStr}  content:\n`;
			const contentLines = ast.content.split("\n");
			contentLines.forEach((line, index) => {
				// Limit line length for display
				const displayLine =
					line.length > 100 ? line.substring(0, 100) + "..." : line;
				toon += `${indentStr}    ${index + 1}: ${displayLine}\n`;
			});
		}

		if (ast.error) {
			toon += `${indentStr}  error: ${ast.error}\n`;
		}
	} else if (ast.type === "directory") {
		// Directory representation in TOON format
		toon += `${indentStr}📁 ${ast.name}\n`;
		toon += `${indentStr}  path: ${ast.path}\n`;
		toon += `${indentStr}  files: ${ast.fileCount}\n`;
		toon += `${indentStr}  lines: ${ast.lineCount}\n`;

		// Process children
		if (ast.children && ast.children.length > 0) {
			toon += `${indentStr}  children:\n`;
			ast.children.forEach((child) => {
				toon += astToToon(child, indent + 2);
			});
		}
	}

	return toon;
};

/**
 * Convert AST to TOON format (compact version without content)
 * @param {Object} ast - AST tree structure
 * @param {number} indent - Current indentation level
 * @returns {string} TOON format string
 */
export const astToToonCompact = (ast, indent = 0) => {
	if (!ast) return "";

	const indentStr = "  ".repeat(indent);
	let toon = "";

	if (ast.type === "file") {
		toon += `${indentStr}📄 ${ast.name} (${ast.size} bytes, ${ast.lines} lines)\n`;
	} else if (ast.type === "directory") {
		toon += `${indentStr}📁 ${ast.name} (${ast.fileCount} files, ${ast.lineCount} lines)\n`;

		if (ast.children && ast.children.length > 0) {
			ast.children.forEach((child) => {
				toon += astToToonCompact(child, indent + 1);
			});
		}
	}

	return toon;
};
