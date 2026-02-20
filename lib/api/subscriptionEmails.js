import { Resend } from "resend";
import fs from "fs";
import path from "path";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send subscription confirmation email after payment
 * @param {Object} params - Email parameters
 * @param {string} params.customerEmail - Customer email address
 * @param {string} params.customerName - Customer name
 * @param {string} params.planName - Subscription plan name
 * @param {number} params.amount - Payment amount
 * @param {string} params.currency - Payment currency
 * @param {string} params.paymentId - Payment ID
 * @param {string} [params.expiresAt] - Next billing date (optional)
 * @returns {Promise<Object>} Resend API response
 */
export async function sendSubscriptionConfirmationEmail({
	customerEmail,
	customerName = "Customer",
	planName,
	amount,
	currency = "usd",
	paymentId,
	expiresAt,
}) {
	try {
		// Read HTML template
		const htmlPath = path.join(
			process.cwd(),
			"public",
			"html",
			"send-subscription-confirm-email.html"
		);
		let htmlContent = fs.readFileSync(htmlPath, "utf-8");

		// Replace placeholders with actual values
		htmlContent = htmlContent.replace(
			/\{\{customerName\}\}/g,
			customerName || "Customer"
		);
		htmlContent = htmlContent.replace(/\{\{planName\}\}/g, planName || "Pro");
		htmlContent = htmlContent.replace(
			/\{\{amount\}\}/g,
			(amount / 100).toFixed(2)
		); // Convert cents to dollars
		htmlContent = htmlContent.replace(
			/\{\{currency\}\}/g,
			currency.toUpperCase()
		);
		htmlContent = htmlContent.replace(/\{\{paymentId\}\}/g, paymentId || "N/A");

		// Handle optional expiresAt
		if (expiresAt) {
			const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
			const formattedDate = date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
			// Replace the conditional block with the actual date row
			htmlContent = htmlContent.replace(
				/\{\{#if expiresAt\}\}[\s\S]*?\{\{expiresAt\}\}[\s\S]*?\{\{\/if\}\}/g,
				(match) => {
					return match
						.replace(/\{\{#if expiresAt\}\}/g, "")
						.replace(/\{\{\/if\}\}/g, "")
						.replace(/\{\{expiresAt\}\}/g, formattedDate);
				}
			);
		} else {
			// Remove the conditional block if expiresAt is not provided
			htmlContent = htmlContent.replace(
				/\{\{#if expiresAt\}\}[\s\S]*?\{\{\/if\}\}/g,
				""
			);
		}

		// Remove any remaining placeholder syntax
		htmlContent = htmlContent.replace(/\{\{[^}]+\}\}/g, "");

		// Send email using Resend
		const data = await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
			to: [customerEmail],
			subject: `Payment Confirmed - ${planName} Subscription`,
			html: htmlContent,
		});

		console.log("Subscription confirmation email sent:", data);
		return data;
	} catch (error) {
		console.error("Error sending subscription confirmation email:", error);
		throw error;
	}
}

/**
 * Send subscription cancellation email
 * @param {Object} params - Email parameters
 * @param {string} params.customerEmail - Customer email address
 * @param {string} params.customerName - Customer name
 * @param {string} params.planName - Subscription plan name
 * @param {string} [params.expiresAt] - Access expiration date (optional)
 * @returns {Promise<Object>} Resend API response
 */
export async function sendSubscriptionCancellationEmail({
	customerEmail,
	customerName = "Customer",
	planName,
	expiresAt,
}) {
	try {
		// Read HTML template
		const htmlPath = path.join(
			process.cwd(),
			"public",
			"html",
			"send-subscription-cancellation-email.html"
		);
		let htmlContent = fs.readFileSync(htmlPath, "utf-8");

		// Replace placeholders with actual values
		htmlContent = htmlContent.replace(
			/\{\{customerName\}\}/g,
			customerName || "Customer"
		);
		htmlContent = htmlContent.replace(/\{\{planName\}\}/g, planName || "Pro");

		// Handle optional expiresAt
		if (expiresAt) {
			const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
			const formattedDate = date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
			// Replace the conditional block with the actual date row
			htmlContent = htmlContent.replace(
				/\{\{#if expiresAt\}\}[\s\S]*?\{\{expiresAt\}\}[\s\S]*?\{\{\/if\}\}/g,
				(match) => {
					return match
						.replace(/\{\{#if expiresAt\}\}/g, "")
						.replace(/\{\{\/if\}\}/g, "")
						.replace(/\{\{expiresAt\}\}/g, formattedDate);
				}
			);
		} else {
			// Remove the conditional block if expiresAt is not provided
			htmlContent = htmlContent.replace(
				/\{\{#if expiresAt\}\}[\s\S]*?\{\{\/if\}\}/g,
				""
			);
		}

		// Remove any remaining placeholder syntax
		htmlContent = htmlContent.replace(/\{\{[^}]+\}\}/g, "");

		// Send email using Resend
		const data = await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
			to: [customerEmail],
			subject: `Subscription Cancelled - ${planName}`,
			html: htmlContent,
		});

		console.log("Subscription cancellation email sent:", data);
		return data;
	} catch (error) {
		console.error("Error sending subscription cancellation email:", error);
		throw error;
	}
}

/**
 * Send subscription upgrade email
 * @param {Object} params - Email parameters
 * @param {string} params.customerEmail - Customer email address
 * @param {string} params.customerName - Customer name
 * @param {string} params.oldPlanName - Previous subscription plan name
 * @param {string} params.newPlanName - New subscription plan name
 * @param {number} params.amount - New payment amount
 * @param {string} params.currency - Payment currency
 * @param {string} [params.expiresAt] - Next billing date (optional)
 * @returns {Promise<Object>} Resend API response
 */
export async function sendSubscriptionUpgradeEmail({
	customerEmail,
	customerName = "Customer",
	oldPlanName,
	newPlanName,
	amount,
	currency = "usd",
	expiresAt,
}) {
	try {
		// Read HTML template
		const htmlPath = path.join(
			process.cwd(),
			"public",
			"html",
			"send-subscription-upgrade-email.html"
		);
		let htmlContent = fs.readFileSync(htmlPath, "utf-8");

		// Replace placeholders with actual values
		htmlContent = htmlContent.replace(
			/\{\{customerName\}\}/g,
			customerName || "Customer"
		);
		htmlContent = htmlContent.replace(
			/\{\{oldPlanName\}\}/g,
			oldPlanName || "Previous Plan"
		);
		htmlContent = htmlContent.replace(
			/\{\{newPlanName\}\}/g,
			newPlanName || "Pro"
		);
		htmlContent = htmlContent.replace(
			/\{\{amount\}\}/g,
			(amount / 100).toFixed(2)
		); // Convert cents to dollars
		htmlContent = htmlContent.replace(
			/\{\{currency\}\}/g,
			currency.toUpperCase()
		);

		// Handle optional expiresAt
		if (expiresAt) {
			const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
			const formattedDate = date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
			// Replace the conditional block with the actual date row
			htmlContent = htmlContent.replace(
				/\{\{#if expiresAt\}\}[\s\S]*?\{\{expiresAt\}\}[\s\S]*?\{\{\/if\}\}/g,
				(match) => {
					return match
						.replace(/\{\{#if expiresAt\}\}/g, "")
						.replace(/\{\{\/if\}\}/g, "")
						.replace(/\{\{expiresAt\}\}/g, formattedDate);
				}
			);
		} else {
			// Remove the conditional block if expiresAt is not provided
			htmlContent = htmlContent.replace(
				/\{\{#if expiresAt\}\}[\s\S]*?\{\{\/if\}\}/g,
				""
			);
		}

		// Remove any remaining placeholder syntax
		htmlContent = htmlContent.replace(/\{\{[^}]+\}\}/g, "");

		// Send email using Resend
		const data = await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || "connect@ihatereading.in",
			to: [customerEmail],
			subject: `Subscription Upgraded to ${newPlanName}! 🎉`,
			html: htmlContent,
		});

		console.log("Subscription upgrade email sent:", data);
		return data;
	} catch (error) {
		console.error("Error sending subscription upgrade email:", error);
		throw error;
	}
}
