import { Resend } from "resend";
import { getUsersWithVerifiedEmails } from "../../../lib/api/users";
import { markEmailAsSent } from "../../../lib/api/emails";

const resend = new Resend(
	process.env.RESEND_API_KEY || "re_V1pvhE6X_HbnDpnVWBhiATKSxtGrTmCTy"
);

/**
 * Send email to authenticated users in batches
 * POST /api/emails/send-to-users
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

		// Get all users with verified emails
		const users = await getUsersWithVerifiedEmails();

		if (users.length === 0) {
			return res.status(400).json({
				error: "No users with verified emails found",
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

		for (let i = 0; i < users.length; i += BATCH_SIZE) {
			const batch = users.slice(i, i + BATCH_SIZE);
			const to = batch.map((user) => user.email).filter(Boolean);

			if (to.length === 0) continue;

			try {
				const data = await resend.emails.send({
					...emailData,
					to: to,
				});

				successCount += to.length;
				batches.push({
					batchNumber: Math.floor(i / BATCH_SIZE) + 1,
					recipients: to.length,
					messageId: data.id,
				});
			} catch (error) {
				errorCount += to.length;
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
			message: `Email sent to ${successCount} users`,
			stats: {
				totalUsers: users.length,
				successCount,
				errorCount,
				batches: batches.length,
			},
			batches,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error("Error sending emails to users:", error);
		return res.status(500).json({
			error: "Failed to send emails",
			message: error.message,
		});
	}
}
