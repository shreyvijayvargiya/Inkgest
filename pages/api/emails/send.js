import { Resend } from "resend";
import { getActiveSubscribers } from "../../../lib/api/subscribers";
import { markEmailAsSent } from "../../../lib/api/emails";

const resend = new Resend(
	process.env.RESEND_API_KEY || "re_V1pvhE6X_HbnDpnVWBhiATKSxtGrTmCTy"
);

/**
 * Send email to subscribers in batches
 * POST /api/emails/send
 * Body: { emailId: string, subject: string, content: string }
 */
export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { emailId, subject, content } = req.body;

		if (!emailId || !subject || !content) {
			return res.status(400).json({
				error: "Missing required fields: emailId, subject, content",
			});
		}

		// Get all active subscribers
		const subscribers = await getActiveSubscribers();

		if (subscribers.length === 0) {
			return res.status(400).json({
				error: "No active subscribers found",
			});
		}

		// Prepare email data
		const emailData = {
			from: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
			subject: subject,
			html: content,
		};

		// Send emails in batches (Resend allows up to 50 recipients per batch)
		const BATCH_SIZE = 50;
		const batches = [];
		let successCount = 0;
		let errorCount = 0;
		const errors = [];

		for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
			const batch = subscribers.slice(i, i + BATCH_SIZE);
			const to = batch.map((sub) => sub.email);

			try {
				const data = await resend.emails.send({
					...emailData,
					to: to,
				});

				successCount += batch.length;
				batches.push({
					batchNumber: Math.floor(i / BATCH_SIZE) + 1,
					recipients: batch.length,
					messageId: data.id,
				});
			} catch (error) {
				errorCount += batch.length;
				errors.push({
					batchNumber: Math.floor(i / BATCH_SIZE) + 1,
					error: error.message,
				});
				console.error(
					`Error sending batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
					error
				);
			}
		}

		// Mark email as sent in Firestore
		if (successCount > 0) {
			await markEmailAsSent(emailId, successCount);
		}

		return res.status(200).json({
			success: true,
			message: `Email sent to ${successCount} subscribers`,
			stats: {
				totalSubscribers: subscribers.length,
				successCount,
				errorCount,
				batches: batches.length,
			},
			batches,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error("Error sending emails:", error);
		return res.status(500).json({
			error: "Failed to send emails",
			message: error.message,
		});
	}
}
