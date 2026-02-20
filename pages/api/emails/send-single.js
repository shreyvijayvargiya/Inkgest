import { Resend } from "resend";

const resend = new Resend(
	process.env.RESEND_API_KEY || "re_V1pvhE6X_HbnDpnVWBhiATKSxtGrTmCTy"
);

/**
 * Send email to a single user
 * POST /api/emails/send-single
 * Body: { email: string, name?: string, subject: string, content: string }
 */
export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { email, name, subject, content } = req.body;

		// Validate required fields
		if (!email || !subject || !content) {
			return res.status(400).json({
				error: "Missing required fields: email, subject, content",
			});
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: "Invalid email format" });
		}

		console.log("Sending email to single user:", { email, name, subject });

		// Send email using Resend
		const emailData = await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
			to: [email],
			subject: subject,
			html: content,
		});

		console.log("Email sent successfully:", emailData);

		return res.status(200).json({
			success: true,
			message: "Email sent successfully",
			data: emailData,
		});
	} catch (error) {
		console.error("Error sending email:", error);
		return res.status(500).json({
			success: false,
			error: error.message || "Failed to send email",
		});
	}
}

