import { Resend } from "resend";
import { markMessageAsReplied } from "../../../lib/api/messages";

const resend = new Resend(
	process.env.RESEND_API_KEY || "re_V1pvhE6X_HbnDpnVWBhiATKSxtGrTmCTy"
);

/**
 * Reply to a message via email
 * POST /api/messages/reply
 * Body: { to: string, toName: string, subject: string, content: string, originalMessage?: string }
 */
export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { to, toName, subject, content, originalMessage, messageId } =
			req.body;

		// Validate required fields
		if (!to || !subject || !content) {
			return res.status(400).json({
				error: "Missing required fields: to, subject, content",
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(to)) {
			return res.status(400).json({ error: "Invalid email format" });
		}

		// Build email content
		let htmlContent = content;

		// If original message is provided, include it in the reply
		if (originalMessage) {
			htmlContent += `
				<br><br>
				<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;">
				<div style="color: #71717a; font-size: 14px;">
					<p style="margin: 0 0 10px 0;"><strong>Original Message:</strong></p>
					<div style="background: #fafafa; padding: 15px; border-radius: 8px; border-left: 3px solid #d4d4d8;">
						${originalMessage.replace(/\n/g, "<br>")}
					</div>
				</div>
			`;
		}

		// Send email using Resend
		const emailData = await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
			to: [to],
			subject: subject,
			html: htmlContent,
			replyTo: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
		});

		// Mark message as replied in Firestore if messageId is provided
		if (messageId) {
			try {
				await markMessageAsReplied(messageId);
			} catch (error) {
				console.error("Error marking message as replied:", error);
				// Don't fail the request if marking as replied fails
			}
		}

		return res.status(200).json({
			success: true,
			message: "Reply sent successfully",
			data: emailData,
		});
	} catch (error) {
		console.error("Error sending reply:", error);
		return res.status(500).json({
			success: false,
			error: error.message || "Failed to send reply",
		});
	}
}
