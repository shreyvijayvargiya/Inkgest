# APIs

This document describes all API endpoints, their usage, and implementation details.

## API Routes Overview

All API routes are located in `pages/api/` and follow Next.js API route conventions.

## Email APIs

### POST `/api/emails/send`

Send email to all active subscribers.

**Request Body**:
```json
{
  "emailId": "string",
  "subject": "string",
  "content": "string (HTML)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email sent to X subscribers",
  "stats": {
    "totalSubscribers": 100,
    "successCount": 98,
    "errorCount": 2,
    "batches": 2
  },
  "batches": [...],
  "errors": [...]
}
```

**Implementation**: `pages/api/emails/send.js`
- Fetches active subscribers from Firestore
- Sends emails in batches of 50 (Resend limit)
- Updates email status in Firestore
- Returns statistics

### POST `/api/emails/send-to-users`

Send email to all authenticated users with verified emails.

**Request Body**:
```json
{
  "emailId": "string",
  "subject": "string",
  "content": "string (HTML)"
}
```

**Response**: Same as `/api/emails/send`

**Implementation**: `pages/api/emails/send-to-users.js`
- Fetches users with verified emails from Firestore
- Sends emails in batches
- Updates email status

### POST `/api/emails/send-single`

Send email to a single recipient.

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "User Name (optional)",
  "subject": "string",
  "content": "string (HTML)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": { ... }
}
```

**Implementation**: `pages/api/emails/send-single.js`
- Validates email format
- Sends single email via Resend
- Returns success status

## Message APIs

### POST `/api/messages/create`

Create a new message/contact form submission.

**Request Body**:
```json
{
  "name": "string",
  "email": "string",
  "subject": "string",
  "message": "string"
}
```

**Response**:
```json
{
  "success": true,
  "messageId": "string"
}
```

**Implementation**: `pages/api/messages/create.js`
- Validates input
- Stores message in Firestore
- Returns message ID

### POST `/api/messages/reply`

Reply to a message via email.

**Request Body**:
```json
{
  "to": "user@example.com",
  "toName": "User Name",
  "subject": "string",
  "content": "string (HTML)",
  "originalMessage": "string (optional)",
  "messageId": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Reply sent successfully"
}
```

**Implementation**: `pages/api/messages/reply.js`
- Sends email reply via Resend
- Includes original message if provided
- Marks message as replied in Firestore

## Payment APIs

### POST `/api/polar/checkout`

Create a Polar checkout session for subscription.

**Request Body**:
```json
{
  "planId": "string",
  "customerId": "string (optional)"
}
```

**Response**:
```json
{
  "checkoutUrl": "https://polar.sh/checkout/...",
  "checkoutId": "string"
}
```

**Implementation**: `pages/api/polar/checkout.js`
- Creates checkout session with Polar API
- Stores checkout record in Firestore
- Returns checkout URL for redirect

### POST `/api/polar/webhook`

Handle Polar webhook events.

**Request Headers**:
```
polar-signature: string (for verification)
```

**Request Body**: Polar webhook event object

**Event Types Handled**:
- `checkout.created`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `payment.created`
- `payment.succeeded`
- `payment.failed`
- `customer.created`
- `customer.updated`

**Response**:
```json
{
  "received": true
}
```

**Implementation**: `pages/api/polar/webhook.js`
- Verifies webhook signature
- Handles different event types
- Updates Firestore collections:
  - `customers`: Customer data
  - `payments`: Payment records
  - `subscriptions`: Subscription data
- Sends appropriate emails based on events

### POST `/api/polar/cancel-subscription`

Cancel a subscription.

**Request Body**:
```json
{
  "subscriptionId": "string",
  "customerId": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Subscription canceled"
}
```

**Implementation**: `pages/api/polar/cancel-subscription.js`
- Cancels subscription via Polar API
- Updates subscription status in Firestore
- Sends cancellation email

## Client-Side API Functions

### Blog API (`lib/api/blog.js`)

```javascript
// Get all blogs
getAllBlogs(status?: 'draft' | 'published')

// Get blog by ID
getBlogById(id: string)

// Get blog by slug
getBlogBySlug(slug: string)

// Create blog
createBlog(blogData: object)

// Update blog
updateBlog(id: string, updates: object)

// Delete blog
deleteBlog(id: string)
```

### Email API (`lib/api/emails.js`)

```javascript
// Get all emails
getAllEmails(status?: 'draft' | 'sent')

// Get email by ID
getEmailById(id: string)

// Create email
createEmail(emailData: object)

// Update email
updateEmail(id: string, updates: object)

// Delete email
deleteEmail(id: string)

// Mark email as sent
markEmailAsSent(id: string, recipientCount: number)
```

### Subscriber API (`lib/api/subscribers.js`)

```javascript
// Get all subscribers
getAllSubscribers(status?: 'active' | 'unsubscribed')

// Get active subscribers
getActiveSubscribers()

// Get subscriber by email
getSubscriberByEmail(email: string)

// Create subscriber
createSubscriber(subscriberData: object)

// Update subscriber
updateSubscriber(id: string, updates: object)

// Delete subscriber
deleteSubscriber(id: string)
```

### User API (`lib/api/users.js`)

```javascript
// Get all users
getAllUsers()

// Get user by ID
getUserById(id: string)

// Get users with verified emails
getUsersWithVerifiedEmails()

// Update user
updateUser(id: string, updates: object)
```

### Customer API (`lib/api/customers.js`)

```javascript
// Get all customers
getAllCustomers()

// Get customer by ID
getCustomerById(id: string)

// Get customer by Polar ID
getCustomerByPolarId(polarId: string)

// Update customer
updateCustomer(id: string, updates: object)
```

### Payment API (`lib/api/payments.js`)

```javascript
// Get all payments
getAllPayments()

// Get payment by ID
getPaymentById(id: string)

// Get payments by customer
getPaymentsByCustomer(customerId: string)

// Get payments by status
getPaymentsByStatus(status: string)
```

### Message API (`lib/api/messages.js`)

```javascript
// Get all messages
getAllMessages()

// Get message by ID
getMessageById(id: string)

// Create message
createMessage(messageData: object)

// Mark as replied
markMessageAsReplied(id: string)
```

### Invoice API (`lib/api/invoice.js`)

```javascript
// Get all invoices
getAllInvoices()

// Get invoice by ID
getInvoiceById(id: string)

// Create invoice
createInvoice(invoiceData: object)

// Update invoice
updateInvoice(id: string, updates: object)

// Delete invoice
deleteInvoice(id: string)

// Mark invoice as paid
markInvoiceAsPaid(id: string)

// Mark invoice as unpaid
markInvoiceAsUnpaid(id: string)
```

**Invoice Data Structure**:
```javascript
{
  invoiceNumber: "string (unique)",
  invoiceDate: "Date",
  dueDate: "Date (optional)",
  from: {
    name: "string",
    email: "string",
    address: "string (optional)",
    city: "string (optional)",
    state: "string (optional)",
    zip: "string (optional)",
    country: "string (optional)"
  },
  to: {
    name: "string",
    email: "string",
    address: "string (optional)",
    city: "string (optional)",
    state: "string (optional)",
    zip: "string (optional)",
    country: "string (optional)"
  },
  items: [
    {
      description: "string",
      quantity: "number",
      price: "number",
      total: "number"
    }
  ],
  total: "number",
  notes: "string (optional)",
  signature: "string (optional)",
  status: "paid" | "unpaid",
  clientType: "users" | "customers" | "subscribers" | "custom",
  clientId: "string (optional)"
}
```

### Waitlist API (`lib/api/waitlist.js`)

```javascript
// Get all waitlist entries
getAllWaitlist()

// Get waitlist entry by ID
getWaitlistById(id: string)

// Add waitlist entry
addWaitlistEntry(entryData: object)

// Delete waitlist entry
deleteWaitlistEntry(id: string)
```

**Waitlist Entry Data Structure**:
```javascript
{
  name: "string",
  email: "string (unique)",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

### Report Issues API (`lib/api/reportIssues.js`)

```javascript
// Get all report issues
getAllReportIssues()

// Get report issue by ID
getReportIssueById(id: string)

// Add report issue
addReportIssue(issueData: object)

// Update report issue
updateReportIssue(id: string, updates: object)

// Delete report issue
deleteReportIssue(id: string)

// Mark issue as fixed
markIssueAsFixed(id: string)

// Mark issue as pending
markIssueAsPending(id: string)
```

**Report Issue Data Structure**:
```javascript
{
  name: "string",
  email: "string",
  username: "string (optional)",
  issue: "string",
  status: "pending" | "fixed",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

### Analytics API (`lib/api/analytics.js`)

```javascript
// Get all analytics records
getAllAnalytics()

// Get analytics record by fingerprint
getAnalyticsByFingerprint(fingerprint: string)

// Create analytics record
createAnalytics(analyticsData: object)

// Update analytics visit
updateAnalyticsVisit(analyticsId: string)

// Track analytics (main tracking function)
trackAnalytics()
```

**Analytics Data Structure**:
```javascript
{
  id: "string (auto-generated)",
  fingerprint: "string (unique browser fingerprint)",
  ipAddress: "string",
  country: "string",
  countryCode: "string",
  city: "string",
  regionName: "string",
  latitude: "number",
  longitude: "number",
  timezone: "string",
  userAgent: "string",
  isp: "string (optional)",
  locationSource: "browser" | "ip",
  firstVisit: "Timestamp",
  lastVisit: "Timestamp",
  visitCount: "number",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

**Collection Name**: `app-analytics`

**Features**:
- Tracks website analytics with geolocation data
- Browser fingerprinting for unique visitor identification
- IP-based and browser GPS location support
- Visit count tracking
- First and last visit timestamps
- Region filtering support (Asia/India/USA, Europe, Middle East, Africa, Australia)
- All tracking utilities consolidated in `lib/api/analytics.js` (no separate utils file)
- Uses React Query's `useMutation` for optimized tracking with automatic retries and caching

## Supabase API Functions

Located in `lib/api-supabase/`, these functions provide Supabase-specific implementations:

- `blog.js`: Blog operations with Supabase
- `emails.js`: Email operations with Supabase
- `subscribers.js`: Subscriber operations with Supabase
- `users.js`: User operations with Supabase
- `upload.js`: File upload to Supabase Storage

## Error Handling

All API routes follow consistent error handling:

```javascript
try {
  // API logic
  return res.status(200).json({ success: true, data: ... });
} catch (error) {
  console.error("Error:", error);
  return res.status(500).json({
    error: "Internal server error",
    message: error.message
  });
}
```

## Authentication

API routes that require authentication should check:
1. Firebase Auth token (if applicable)
2. User role from Firestore teams collection
3. Permissions based on role

## Rate Limiting

Consider implementing rate limiting for:
- Email sending endpoints
- Message creation endpoints
- Payment endpoints

## Testing APIs

### Using cURL

```bash
# Send email
curl -X POST http://localhost:3000/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{"emailId": "123", "subject": "Test", "content": "<p>Test</p>"}'
```

### Using Fetch

```javascript
const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    emailId: '123',
    subject: 'Test',
    content: '<p>Test</p>'
  })
});

const data = await response.json();
```

## Environment Variables

Required environment variables for APIs:

```env
# Resend
RESEND_API_KEY=your_key
RESEND_FROM_EMAIL=your_email@domain.com

# Polar
POLAR_ACCESS_TOKEN=your_token
POLAR_API_URL=https://api.polar.sh
POLAR_WEBHOOK_SECRET=your_secret

# Firebase (for Firestore operations)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

