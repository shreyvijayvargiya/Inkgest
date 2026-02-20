import { createMessage } from "../../../lib/api/messages";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { name, email, subject, message } = req.body;

		if (!name || !email || !subject || !message) {
			return res.status(400).json({
				error: "All fields are required",
			});
		}

		const messageId = await createMessage({
			name,
			email,
			subject,
			message,
		});

		return res.status(200).json({
			success: true,
			messageId,
		});
	} catch (error) {
		console.error("Error creating message:", error);
		return res.status(500).json({
			error: "Internal server error",
		});
	}
}
