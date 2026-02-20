# Emailing

Inkgest: Link to Gest uses Resend for sending transactional emails. This document covers email setup, sending emails, and email templates.

## Email Service: Resend

Resend is a modern email API service that provides excellent deliverability and developer experience.

### Setup

1. **Sign up for Resend**
   - Visit [resend.com](https://resend.com)
   - Create an account
   - Verify your domain

2. **Get API Key**
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key to your `.env.local`:

   ```env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=your_email@yourdomain.com
   ```

3. **Domain Verification**
   - Add DNS records as instructed by Resend
   - Wait for verification (usually a few minutes)
   - Use verified domain in `RESEND_FROM_EMAIL`

## Email Types

### 1. Newsletter Emails

Send emails to all active subscribers.

**API Endpoint**: `POST /api/emails/send`

**Usage**:

```javascript
const response = await fetch("/api/emails/send", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		emailId: "email_document_id",
		subject: "Newsletter Subject",
		content: "<h1>Newsletter Content</h1><p>Your HTML content here</p>",
	}),
});
```

**Features**:

- Batch sending (50 recipients per batch)
- Automatic retry on failure
- Statistics tracking
- Updates email status in Firestore

### 2. User Emails

Send emails to all authenticated users with verified emails.

**API Endpoint**: `POST /api/emails/send-to-users`

**Usage**:

```javascript
const response = await fetch("/api/emails/send-to-users", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		emailId: "email_document_id",
		subject: "User Update",
		content: "<p>Content here</p>",
	}),
});
```

### 3. Single Email

Send email to a single recipient.

**API Endpoint**: `POST /api/emails/send-single`

**Usage**:

```javascript
const response = await fetch("/api/emails/send-single", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		email: "recipient@example.com",
		name: "Recipient Name",
		subject: "Email Subject",
		content: "<p>Email content</p>",
	}),
});
```

### 4. Message Replies

Reply to contact form messages.

**API Endpoint**: `POST /api/messages/reply`

**Usage**:

```javascript
const response = await fetch("/api/messages/reply", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		to: "user@example.com",
		toName: "User Name",
		subject: "Re: Original Subject",
		content: "<p>Reply content</p>",
		originalMessage: "Original message text",
		messageId: "message_id",
	}),
});
```

## Subscription Emails

Automated emails sent for subscription events.

### Confirmation Email

Sent when a subscription is created or payment succeeds.

**Location**: `lib/api/subscriptionEmails.js`

**Function**: `sendSubscriptionConfirmationEmail()`

**Parameters**:

```javascript
{
  customerEmail: 'customer@example.com',
  customerName: 'Customer Name',
  planName: 'Pro Plan',
  amount: 29.99,
  currency: 'usd',
  paymentId: 'payment_id',
  expiresAt: '2024-12-31'
}
```

**Template**: `public/html/send-subscription-confirm-email.html`

### Cancellation Email

Sent when a subscription is canceled.

**Function**: `sendSubscriptionCancellationEmail()`

**Parameters**:

```javascript
{
  customerEmail: 'customer@example.com',
  customerName: 'Customer Name',
  planName: 'Pro Plan',
  expiresAt: '2024-12-31'
}
```

**Template**: `public/html/send-subscription-cancellation-email.html`

### Upgrade Email

Sent when a subscription is upgraded.

**Function**: `sendSubscriptionUpgradeEmail()`

**Parameters**:

```javascript
{
  customerEmail: 'customer@example.com',
  customerName: 'Customer Name',
  oldPlanName: 'Basic Plan',
  newPlanName: 'Pro Plan',
  amount: 29.99,
  currency: 'usd',
  expiresAt: '2024-12-31'
}
```

**Template**: `public/html/send-subscription-upgrade-email.html`

## Email Management

### Creating Emails

Use the Admin panel Email tab to create and manage emails:

1. Navigate to Admin → Emails
2. Click "Create New Email"
3. Use the Tiptap editor to compose content
4. Save as draft or send immediately

### Email Status

- **Draft**: Email is saved but not sent
- **Sent**: Email has been sent to recipients

### Email Tracking

After sending, emails are updated with:

- `status`: Changed to "sent"
- `recipients`: Number of recipients
- `publishedAt`: Timestamp of sending

## Email Templates

Email templates are stored in `public/html/`:

- `send-subscription-confirm-email.html`
- `send-subscription-cancellation-email.html`
- `send-subscription-upgrade-email.html`

### Template Variables

Templates use placeholder variables that are replaced at send time:

- `{{customerName}}`: Customer's name
- `{{planName}}`: Subscription plan name
- `{{amount}}`: Payment amount
- `{{currency}}`: Currency code
- `{{expiresAt}}`: Subscription expiration date
- `{{paymentId}}`: Payment ID
- `{{oldPlanName}}`: Previous plan (upgrade emails)
- `{{newPlanName}}`: New plan (upgrade emails)

### Customizing Templates

1. Edit HTML files in `public/html/`
2. Use inline CSS for styling
3. Test with sample data
4. Ensure responsive design

## Email Content

### HTML Content

All emails use HTML content. You can:

- Use the Tiptap editor in Admin panel
- Write HTML directly
- Use markdown (converted to HTML)

### Best Practices

1. **Subject Lines**: Keep them clear and concise
2. **Content**: Use proper HTML structure
3. **Images**: Use absolute URLs for images
4. **Links**: Use full URLs (https://)
5. **Testing**: Always test before sending to all subscribers
6. **Unsubscribe**: Include unsubscribe links for newsletters

## Batch Sending

Emails are sent in batches of 50 recipients (Resend limit).

**Process**:

1. Fetch all recipients
2. Split into batches of 50
3. Send each batch sequentially
4. Track success/failure for each batch
5. Return statistics

**Error Handling**:

- Failed batches are logged
- Successful batches continue
- Partial success is reported

## Email API Functions

### Client-Side Functions

**Location**: `lib/api/emails.js`

```javascript
// Get all emails
getAllEmails(status?: 'draft' | 'sent')

// Get email by ID
getEmailById(id: string)

// Create email
createEmail(emailData: {
  subject: string,
  content: string,
  status?: 'draft' | 'sent'
})

// Update email
updateEmail(id: string, updates: object)

// Delete email
deleteEmail(id: string)

// Mark email as sent
markEmailAsSent(id: string, recipientCount: number)
```

## Testing Emails

### Development Testing

1. Use `send-single` endpoint for testing
2. Send to your own email address
3. Check spam folder if needed
4. Verify HTML rendering

### Production Testing

1. Create a test subscriber list
2. Send test emails to small group
3. Verify delivery and formatting
4. Check analytics in Resend dashboard

## Email Limits

### Resend Limits

- **Free Tier**: 3,000 emails/month
- **Pro Tier**: 50,000 emails/month
- **Batch Size**: 50 recipients per request
- **Rate Limit**: Check Resend documentation

### Best Practices

1. Monitor email usage
2. Implement rate limiting
3. Handle errors gracefully
4. Queue emails if needed for high volume

## Troubleshooting

### Emails Not Sending

1. Check Resend API key
2. Verify domain is verified
3. Check email format
4. Review error logs
5. Check Resend dashboard for errors

### Emails Going to Spam

1. Verify domain with SPF/DKIM records
2. Use verified sender email
3. Avoid spam trigger words
4. Include unsubscribe link
5. Test with email testing tools

### Batch Sending Issues

1. Check recipient count
2. Verify subscriber status
3. Check API rate limits
4. Review error responses

## Environment Variables

```env
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Email Analytics

Resend provides analytics in their dashboard:

- Delivery rates
- Open rates (if tracking enabled)
- Click rates (if tracking enabled)
- Bounce rates
- Spam reports

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Email Validation**: Validate email addresses before sending
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Unsubscribe**: Always provide unsubscribe mechanism
5. **Privacy**: Comply with GDPR and email regulations
