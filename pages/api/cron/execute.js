import {
	getAllCronJobs,
	markCronJobCompleted,
	markCronJobFailed,
} from "../../../lib/api/cronJobs";
import { publishBlog } from "../../../lib/api/blog";
import { getEmailById, markEmailAsSent } from "../../../lib/api/emails";
import { getActiveSubscribers } from "../../../lib/api/subscribers";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Execute scheduled CRON jobs
 * This endpoint should be called by an external CRON service
 * POST /api/cron/execute
 * Headers: { 'Authorization': 'Bearer YOUR_SECRET_TOKEN' }
 */
export default async function handler(req, res) {
	// Verify authorization (use a secret token)
	const authToken = req.headers.authorization?.replace("Bearer ", "");
	const expectedToken = process.env.CRON_SECRET_TOKEN;

	// If CRON_SECRET_TOKEN is set, require it. Otherwise, allow without auth for development
	if (expectedToken && authToken !== expectedToken) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	// Allow both GET (for testing) and POST (for production CRON services)
	if (req.method !== "POST" && req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const now = new Date();
		const cronJobs = await getAllCronJobs();

		// Filter jobs that are scheduled and due
		const dueJobs = cronJobs.filter((job) => {
			if (job.status !== "scheduled") return false;
			const scheduledDate = job.scheduledDate?.toDate
				? job.scheduledDate.toDate()
				: new Date(job.scheduledDate);
			return scheduledDate <= now;
		});

		const results = {
			processed: 0,
			success: 0,
			failed: 0,
			errors: [],
		};

		for (const job of dueJobs) {
			try {
				if (job.type === "blog") {
					// Publish the blog
					await publishBlog(job.itemId);
					await markCronJobCompleted(job.id);
					results.success++;
					results.processed++;
				} else if (job.type === "email") {
					// Get email details and send
					const email = await getEmailById(job.itemId);

					if (email && email.subject && email.content) {
						const subscribers = await getActiveSubscribers();

						if (subscribers.length > 0) {
							// Send email in batches
							const BATCH_SIZE = 50;
							let successCount = 0;

							for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
								const batch = subscribers.slice(i, i + BATCH_SIZE);
								const to = batch.map((sub) => sub.email);

								try {
									await resend.emails.send({
										from:
											process.env.RESEND_FROM_EMAIL ||
											"connect@ihatereading.in",
										to: to,
										subject: email.subject,
										html: email.content,
									});
									successCount += batch.length;
								} catch (error) {
									console.error(`Error sending email batch:`, error);
								}
							}

							if (successCount > 0) {
								await markEmailAsSent(job.itemId, successCount);
								await markCronJobCompleted(job.id);
								results.success++;
								results.processed++;
								console.log(
									`[CRON] Successfully sent email ${job.itemId} to ${successCount} recipients`
								);
							} else {
								throw new Error("Failed to send email to any recipients");
							}
						} else {
							throw new Error("No active subscribers found");
						}
					} else {
						throw new Error("Email data incomplete");
					}
				}
			} catch (error) {
				console.error(`Error processing CRON job ${job.id}:`, error);
				await markCronJobFailed(job.id, error.message);
				results.failed++;
				results.processed++;
				results.errors.push({
					jobId: job.id,
					type: job.type,
					error: error.message,
				});
			}
		}

		return res.status(200).json({
			success: true,
			message: `Processed ${results.processed} CRON jobs`,
			results,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Error executing CRON jobs:", error);
		return res.status(500).json({
			error: "Failed to execute CRON jobs",
			message: error.message,
		});
	}
}
