import { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

/**
 * Create a new GitHub repository
 */
export async function createGitHubRepo(
	token,
	username,
	repoName,
	description = ""
) {
	const octokit = new Octokit({ auth: token });

	try {
		// Check if repo already exists
		try {
			await octokit.repos.get({
				owner: username,
				repo: repoName,
			});
			throw new Error("Repository already exists");
		} catch (error) {
			if (error.status !== 404) throw error;
		}

		// Create new repository
		const repo = await octokit.repos.createForAuthenticatedUser({
			name: repoName,
			description: description,
			private: false,
			auto_init: false,
		});

		return repo.data;
	} catch (error) {
		throw new Error(`Failed to create GitHub repository: ${error.message}`);
	}
}

/**
 * Push code to GitHub repository using multiple fallback strategies
 * Strategy 1: Try git push with small batch commits
 * Strategy 2: If that fails, use GitHub Contents API (slower but more reliable)
 */
export async function pushToGitHub(sourceDir, token, username, repoName) {
	// Try Strategy 1: Git push with batch commits
	try {
		return await pushUsingGit(sourceDir, token, username, repoName);
	} catch (error) {
		console.warn("Git push failed, trying GitHub Contents API...", error.message);
		// Fallback to Strategy 2: GitHub Contents API
		return await pushUsingContentsAPI(sourceDir, token, username, repoName);
	}
}

/**
 * Strategy 1: Push using git with very small batch commits
 */
async function pushUsingGit(sourceDir, token, username, repoName) {
	const git = simpleGit(sourceDir);
	const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
	const COMMIT_BATCH_SIZE = 10; // Very small batches: 10 files at a time
	const PUSH_AFTER_COMMITS = 3; // Push after every 3 commits

	console.log("Strategy 1: Using git push with batch commits...");
	
	// Initialize git repository
	await git.init();
	await git.addConfig("user.name", username);
	await git.addConfig("user.email", `${username}@users.noreply.github.com`);

	// Configure git for large pushes
	await git.addConfig("http.postBuffer", "524288000"); // 500MB buffer
	await git.addConfig("http.maxRequestBuffer", "100M");
	await git.addConfig("core.compression", "6");
	await git.addConfig("pack.windowMemory", "256m");
	await git.addConfig("pack.packSizeLimit", "2g");

	// Add remote
	const remoteUrl = `https://${token}@github.com/${username}/${repoName}.git`;
	await git.addRemote("origin", remoteUrl);

	// Get all files
	const allFiles = getAllFiles(sourceDir);
	const validFiles = allFiles.filter((file) => {
		try {
			const stats = fs.statSync(file);
			return stats.size <= MAX_FILE_SIZE && stats.size > 0;
		} catch {
			return false;
		}
	});

	console.log(`Processing ${validFiles.length} files in batches of ${COMMIT_BATCH_SIZE}...`);

	// Commit and push in very small batches
	let commitCount = 0;
	for (let i = 0; i < validFiles.length; i += COMMIT_BATCH_SIZE) {
		const batch = validFiles.slice(i, i + COMMIT_BATCH_SIZE);
		const batchNum = Math.floor(i / COMMIT_BATCH_SIZE) + 1;
		
		console.log(`Batch ${batchNum}: Processing ${batch.length} files...`);

		// Add files in this batch
		for (const file of batch) {
			try {
				const relativePath = path.relative(sourceDir, file);
				await git.add(relativePath);
			} catch (addError) {
				console.warn(`Failed to add file: ${file}`);
			}
		}

		// Commit this batch
		try {
			const commitMessage =
				commitCount === 0
					? "Initial commit: SaaS boilerplate deployment"
					: `Add files (batch ${batchNum})`;
			
			await git.commit(commitMessage);
			commitCount++;

			// Push frequently to avoid accumulation
			if (commitCount % PUSH_AFTER_COMMITS === 0 || i + COMMIT_BATCH_SIZE >= validFiles.length) {
				console.log(`Pushing to GitHub (commit ${commitCount})...`);
				await git.push("origin", "main", ["--set-upstream"], {
					timeout: { block: 180000 }, // 3 minutes per push
				});
			}
		} catch (commitError) {
			if (!commitError.message.includes("nothing to commit")) {
				throw commitError;
			}
		}

		// Delay between batches
		if (i + COMMIT_BATCH_SIZE < validFiles.length) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	// Final push
	if (commitCount % PUSH_AFTER_COMMITS !== 0) {
		await git.push("origin", "main", ["--set-upstream"], {
			timeout: { block: 180000 },
		});
	}

	console.log(`Successfully pushed ${validFiles.length} files!`);
	return true;
}

/**
 * Strategy 2: Push using GitHub Contents API (slower but more reliable for large repos)
 * This uploads files one by one using GitHub's API
 */
async function pushUsingContentsAPI(sourceDir, token, username, repoName) {
	const octokit = new Octokit({ auth: token });
	const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB per file for API
	const BATCH_SIZE = 10; // Process 10 files at a time

	console.log("Strategy 2: Using GitHub Contents API...");

	// Get all files
	const allFiles = getAllFiles(sourceDir);
	const validFiles = allFiles.filter((file) => {
		try {
			const stats = fs.statSync(file);
			return stats.size <= MAX_FILE_SIZE && stats.size > 0;
		} catch {
			return false;
		}
	});

	if (validFiles.length === 0) {
		throw new Error("No valid files to upload");
	}

	console.log(`Uploading ${validFiles.length} files using Contents API...`);

	// Upload files in batches
	for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
		const batch = validFiles.slice(i, i + BATCH_SIZE);
		const batchNum = Math.floor(i / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(validFiles.length / BATCH_SIZE);

		console.log(`Uploading batch ${batchNum}/${totalBatches}...`);

		// Upload files in parallel within batch
		const uploadPromises = batch.map(async (file) => {
			try {
				const relativePath = path
					.relative(sourceDir, file)
					.replace(/\\/g, "/");
				
				if (!relativePath || relativePath.startsWith(".git/")) {
					return null;
				}

				const content = fs.readFileSync(file);
				const contentBase64 = content.toString("base64");

				// Check if file exists
				try {
					await octokit.repos.getContent({
						owner: username,
						repo: repoName,
						path: relativePath,
					});
					// File exists, update it
					await octokit.repos.createOrUpdateFileContents({
						owner: username,
						repo: repoName,
						path: relativePath,
						message: `Add/Update ${relativePath}`,
						content: contentBase64,
						encoding: "base64",
					});
				} catch (error) {
					if (error.status === 404) {
						// File doesn't exist, create it
						await octokit.repos.createOrUpdateFileContents({
							owner: username,
							repo: repoName,
							path: relativePath,
							message: `Add ${relativePath}`,
							content: contentBase64,
							encoding: "base64",
						});
					} else {
						throw error;
					}
				}

				return true;
			} catch (error) {
				console.warn(`Failed to upload ${file}:`, error.message);
				return null;
			}
		});

		await Promise.all(uploadPromises);

		// Rate limiting delay
		if (i + BATCH_SIZE < validFiles.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	console.log(`Successfully uploaded ${validFiles.length} files using Contents API!`);
	return true;
}

/**
 * Get all files in a directory recursively
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
	const files = fs.readdirSync(dirPath);

	files.forEach((file) => {
		const filePath = path.join(dirPath, file);
		if (fs.statSync(filePath).isDirectory()) {
			// Skip node_modules, .git, .next, etc.
			if (
				!file.startsWith(".") &&
				file !== "node_modules" &&
				file !== ".next" &&
				file !== "dist" &&
				file !== "build"
			) {
				arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
			}
		} else {
			arrayOfFiles.push(filePath);
		}
	});

	return arrayOfFiles;
}

/**
 * Reconstruct files from AST to a directory
 * Filters out large files to avoid GitHub size limits
 */
export async function reconstructFilesFromAST(ast, targetDir) {
	const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB limit per file
	let skippedFiles = 0;

	async function processNode(node) {
		if (node.type === "file") {
			// Skip files that were marked as skipped in AST
			if (node.skipped) {
				console.warn(
					`Skipping file: ${node.path} (${node.reason || "marked as skipped"})`
				);
				skippedFiles++;
				return;
			}

			const filePath = path.join(targetDir, node.path);
			const dir = path.dirname(filePath);

			// Skip if file is too large
			if (node.size && node.size > MAX_FILE_SIZE) {
				console.warn(`Skipping large file: ${node.path} (${node.size} bytes)`);
				skippedFiles++;
				return;
			}

			// Create directory if needed
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			// Write file content
			if (node.content) {
				// Double-check content size
				const contentSize = Buffer.byteLength(node.content, "utf-8");
				if (contentSize > MAX_FILE_SIZE) {
					console.warn(
						`Skipping large file content: ${node.path} (${contentSize} bytes)`
					);
					skippedFiles++;
					return;
				}
				fs.writeFileSync(filePath, node.content, "utf-8");
			}
		} else if (node.type === "directory" && node.children) {
			// Create directory
			const dirPath = path.join(targetDir, node.path);
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
			}

			// Process children recursively
			for (const child of node.children) {
				await processNode(child);
			}
		}
	}

	await processNode(ast);

	if (skippedFiles > 0) {
		console.warn(
			`Skipped ${skippedFiles} large files (>1MB) to avoid GitHub size limits`
		);
	}
}
