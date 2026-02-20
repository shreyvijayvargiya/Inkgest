# Payments

Inkgest: Link to Gest integrates with Polar for subscription and payment management. This document covers payment setup, checkout flow, webhooks, and subscription management.

## Payment Provider: Polar

Polar is a comprehensive payment platform designed for SaaS applications, handling subscriptions, one-time payments, and customer management.

### Setup

1. **Create Polar Account**
   - Visit [polar.sh](https://polar.sh)
   - Sign up for an account
   - Complete business verification

2. **Create Products and Plans**
   - Navigate to Products section
   - Create products (e.g., "Basic Plan", "Pro Plan")
   - Set pricing and billing intervals
   - Note the Product IDs

3. **Get API Credentials**
   - Navigate to Settings → API
   - Generate Access Token
   - Copy Webhook Secret
   - Add to `.env.local`:

   ```env
   POLAR_ACCESS_TOKEN=your_access_token
   POLAR_API_URL=https://api.polar.sh
   POLAR_WEBHOOK_SECRET=your_webhook_secret
   ```

4. **Configure Webhook**

   **For Production:**
   - Set webhook URL: `https://yourdomain.com/api/polar/webhook`
   - Select events to receive
   - Save webhook configuration

   **For Local Testing:**
   - Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com)
   - Start your local server: `npm run dev` (runs on port 3000)
   - In a new terminal, run: `ngrok http 3000`
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - In Polar dashboard, set webhook URL: `https://abc123.ngrok.io/api/polar/webhook`
   - Select events to receive
   - Save webhook configuration
   - Now webhooks from Polar will be forwarded to your local server

   ![Setting up webhook with ngrok in Polar.sh dashboard](https://b4fcijccdw.ufs.sh/f/mVUSE925dTRYJCfcbyoG2bRAlp9mQzXtCFE8LDa5uTcysUBj)

   _Screenshot showing how to configure webhook URL using ngrok in Polar.sh dashboard for local development_

## Checkout Flow

### Creating Checkout Session

**API Endpoint**: `POST /api/polar/checkout`

**Request**:

```javascript
const response = await fetch("/api/polar/checkout", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		planId: "polar_product_id",
		customerId: "optional_customer_id",
	}),
});
```

**Response**:

```json
{
	"checkoutUrl": "https://polar.sh/checkout/...",
	"checkoutId": "checkout_session_id"
}
```

**Process**:

1. Client calls checkout API
2. Server creates Polar checkout session
3. Checkout record saved to Firestore
4. Returns checkout URL
5. Client redirects user to Polar checkout
6. User completes payment
7. Polar redirects back with success status

### Frontend Implementation

```javascript
const handleCheckout = async (planId) => {
	try {
		const response = await fetch("/api/polar/checkout", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ planId }),
		});

		const { checkoutUrl } = await response.json();
		window.location.href = checkoutUrl;
	} catch (error) {
		console.error("Checkout error:", error);
	}
};
```

## Webhooks

Polar sends webhook events for payment and subscription changes.

### Webhook Endpoint

**Location**: `pages/api/polar/webhook.js`

**Security**: Webhook signature verification

```javascript
// Signature verification
const signature = req.headers["polar-signature"];
const expectedSignature = crypto
	.createHmac("sha256", POLAR_WEBHOOK_SECRET)
	.update(JSON.stringify(req.body))
	.digest("hex");

if (signature !== expectedSignature) {
	return res.status(401).json({ error: "Invalid signature" });
}
```

### Webhook Events

#### Subscription Events

**`subscription.created`**: New subscription created

- Store customer and subscription data
- Send confirmation email

**`subscription.updated`**: Subscription updated

- Update subscription status
- Update customer record
- Send update email if needed

**`subscription.canceled`**: Subscription canceled

- Update subscription status
- Set expiration date
- Send cancellation email

#### Payment Events

**`payment.created`**: Payment initiated

- Create payment record
- Update subscription status

**`payment.succeeded`**: Payment completed

- Update payment status
- Activate subscription
- Send confirmation email

**`payment.failed`**: Payment failed

- Update payment status
- Notify customer
- Handle retry logic

#### Customer Events

**`customer.created`**: New customer created

- Store customer data
- Link to user account if applicable

**`customer.updated`**: Customer updated

- Update customer record
- Sync with user data

### Webhook Handler

```javascript
export default async function handler(req, res) {
	// Verify signature
	// Handle event type
	switch (event.type) {
		case "subscription.created":
			await handleSubscriptionEvent(event);
			break;
		case "payment.succeeded":
			await handlePaymentEvent(event);
			break;
		// ... other events
	}
	return res.status(200).json({ received: true });
}
```

## Subscription Management

### Customer Data Structure

**Firestore Collection**: `customers`

```javascript
{
  id: "document_id",
  customerId: "polar_customer_id",
  subscriptionId: "polar_subscription_id",
  email: "customer@example.com",
  name: "Customer Name",
  planId: "polar_product_id",
  planName: "Pro Plan",
  status: "active" | "canceled" | "past_due",
  amount: 29.99,
  currency: "usd",
  expiresAt: "Timestamp",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

### Payment Records

**Firestore Collection**: `payments`

```javascript
{
  id: "polar_payment_id",
  paymentId: "polar_payment_id",
  customerId: "polar_customer_id",
  customerEmail: "customer@example.com",
  customerName: "Customer Name",
  amount: 29.99,
  currency: "usd",
  status: "succeeded" | "pending" | "failed",
  planId: "polar_product_id",
  planName: "Pro Plan",
  subscriptionId: "polar_subscription_id",
  paymentType: "subscription" | "payment",
  eventType: "payment.succeeded",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

## Canceling Subscriptions

### Cancel Subscription API

**Endpoint**: `POST /api/polar/cancel-subscription`

**Request**:

```javascript
const response = await fetch("/api/polar/cancel-subscription", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		subscriptionId: "polar_subscription_id",
		customerId: "polar_customer_id",
	}),
});
```

**Process**:

1. Cancel subscription via Polar API
2. Update subscription status in Firestore
3. Set expiration date
4. Send cancellation email
5. Return success status

## Polar Products API

The Polar Products API allows you to programmatically create, update, and delete products in Polar, along with uploading product media files. All Polar API calls are handled server-side for security, while Firestore is used for client-side data management.

### Product Data Structure

**Firestore Collection**: `products`

```javascript
{
  id: "firestore_document_id",
  polarProductId: "polar_product_id",
  name: "Product Name",
  description: "Product description",
  bannerImages: [
    {
      base64: "data:image/png;base64,...",
      fileName: "banner.png"
    }
  ],
  mediaFileIds: ["polar_file_id_1", "polar_file_id_2"],
  prices: [
    {
      amount_type: "fixed" | "custom",
      price_amount: 29.99,
      price_currency: "usd",
      recurring_interval: "month" | "year" | "one_time",
      min_amount: 10.00, // For custom/pay-what-you-want
      max_amount: 100.00 // For custom/pay-what-you-want
    }
  ],
  checkoutLink: "https://polar.sh/checkout/...",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

### Server-Side API Endpoints

#### File Upload API

**Endpoint**: `POST /api/polar/products/fileUpload` (internal utility)

**Location**: `pages/api/polar/products/fileUpload.js`

**Purpose**: Upload files (images, media) to Polar Files API. This is used internally by create/update product endpoints.

**Process**:

1. Calculate SHA256 checksum of file buffer
2. Create file record in Polar with upload parts structure
3. Upload file parts to provided storage URLs
4. Mark file as uploaded
5. Return Polar file ID

**Helper Functions**:

```javascript
// Upload file to Polar
uploadFileToPolar(fileBuffer, fileName, mimeType, accessToken, apiUrl);

// Convert base64 to Buffer
base64ToBuffer(base64String);

// Get MIME type from base64 or file extension
getMimeType(base64String, fileName);
```

**File Upload Flow**:

- Supports single file uploads with chunked upload structure
- Validates file size (max 10MB recommended)
- Handles ETag verification for upload integrity
- Returns Polar file ID for use in product media

#### Create Product API

**Endpoint**: `POST /api/polar/products/create`

**Location**: `pages/api/polar/products/create.js`

**Request**:

```javascript
const response = await fetch("/api/polar/products/create", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		name: "Product Name",
		description: "Product description (optional)",
		prices: [
			{
				amount_type: "fixed", // or 'custom'
				price_amount: 29.99,
				price_currency: "usd",
				recurring_interval: "month", // 'month', 'year', or 'one_time'
			},
		],
		bannerImages: [
			{
				base64: "data:image/png;base64,...",
				fileName: "banner.png",
			},
		],
	}),
});
```

**Response**:

```json
{
  "success": true,
  "product": {
    "id": "polar_product_id",
    "name": "Product Name",
    "prices": [...],
    "medias": ["polar_file_id_1"]
  },
  "priceId": "polar_price_id",
  "mediaFileIds": ["polar_file_id_1"]
}
```

**Process**:

1. Validate required fields (name, prices)
2. Upload banner images to Polar Files API if provided
3. Transform prices to Polar API format (amount_type discriminator)
4. Create product in Polar with media file IDs
5. Return created product with price IDs and media file IDs

**Price Types**:

- **Fixed**: Requires `price_amount` and `price_currency`
- **Custom** (Pay-what-you-want): Optional `min_amount` and `max_amount`

**Recurring Products**:

- Set `recurring_interval` at product level for recurring products
- Supported intervals: `month`, `year`, `one_time`

#### Update Product API

**Endpoint**: `PATCH /api/polar/products/update`

**Location**: `pages/api/polar/products/update.js`

**Request**:

```javascript
const response = await fetch("/api/polar/products/update", {
	method: "PATCH",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		polarProductId: "polar_product_id",
		name: "Updated Product Name",
		description: "Updated description",
		prices: [
			{
				amount_type: "fixed",
				price_amount: 39.99,
				price_currency: "usd",
			},
		],
		bannerImages: [
			{
				base64: "data:image/png;base64,...",
				fileName: "new-banner.png",
			},
		],
	}),
});
```

**Response**:

```json
{
  "success": true,
  "product": {
    "id": "polar_product_id",
    "name": "Updated Product Name",
    "prices": [...],
    "medias": ["polar_file_id_1", "polar_file_id_2"]
  },
  "priceId": "polar_price_id",
  "mediaFileIds": ["polar_file_id_2"]
}
```

**Process**:

1. Validate required fields (polarProductId, name, prices)
2. Upload new banner images to Polar if provided
3. Transform prices to Polar API format
4. Update product in Polar (name, description, prices, medias)
5. Return updated product with new price IDs and media file IDs

**Note**: Polar does NOT allow changing `recurring_interval` on update. Only name, description, prices, and media can be updated.

#### Delete Product API

**Endpoint**: `DELETE /api/polar/products/delete`

**Location**: `pages/api/polar/products/delete.js`

**Request**:

```javascript
const response = await fetch("/api/polar/products/delete", {
	method: "DELETE",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		polarProductId: "polar_product_id",
	}),
});
```

**Response**:

```json
{
	"success": true
}
```

**Process**:

1. Validate polarProductId
2. Delete product from Polar API
3. Return success status

**Note**: This only deletes from Polar. Firestore deletion should be handled separately via client-side API.

#### Checkout Link API

**Endpoint**: `POST /api/polar/products/checkout-link`

**Location**: `pages/api/polar/products/checkout-link.js`

**Request**:

```javascript
const response = await fetch("/api/polar/products/checkout-link", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({
		productId: "polar_product_id",
		priceId: "polar_price_id", // Optional, uses first price if not provided
	}),
});
```

**Response**:

```json
{
	"success": true,
	"checkoutUrl": "https://polar.sh/checkout/...",
	"checkoutId": "checkout_session_id"
}
```

**Process**:

1. Validate productId
2. Fetch product from Polar if priceId not provided (uses first price)
3. Create checkout session with Polar
4. Return checkout URL and checkout ID

### Client-Side Firestore API

**Location**: `lib/api/products.js`

All client-side product operations use Firestore for data storage, with server-side Polar API calls handled automatically.

#### Get All Products

```javascript
import { getAllProducts } from "@/lib/api/products";

const products = await getAllProducts();
// Returns array of products from Firestore, ordered by createdAt desc
```

**Function**: `getAllProducts()`

**Returns**: Array of products from Firestore collection

**Note**: This only fetches from Firestore, not from Polar API directly.

#### Get Product by ID

```javascript
import { getProductById } from "@/lib/api/products";

const product = await getProductById("firestore_product_id");
```

**Function**: `getProductById(productId)`

**Parameters**:

- `productId` (string): Firestore document ID

**Returns**: Product object from Firestore

#### Create Product

```javascript
import { createProduct } from "@/lib/api/products";

const product = await createProduct({
	name: "Product Name",
	description: "Product description",
	prices: [
		{
			amount_type: "fixed",
			price_amount: 29.99,
			price_currency: "usd",
			recurring_interval: "month",
		},
	],
	bannerImages: [
		{
			base64: "data:image/png;base64,...",
			fileName: "banner.png",
		},
	],
});
```

**Function**: `createProduct(productData)`

**Process**:

1. Calls `/api/polar/products/create` to create product in Polar
2. Calls `/api/polar/products/checkout-link` to generate checkout link
3. Stores product data in Firestore with Polar product ID and checkout link
4. Returns Firestore document

**Returns**: Created product object with Firestore document ID

#### Update Product

```javascript
import { updateProduct } from "@/lib/api/products";

const updatedProduct = await updateProduct("firestore_product_id", {
	name: "Updated Name",
	description: "Updated description",
	prices: [
		{
			amount_type: "fixed",
			price_amount: 39.99,
			price_currency: "usd",
		},
	],
	bannerImages: [
		{
			base64: "data:image/png;base64,...",
			fileName: "new-banner.png",
		},
	],
});
```

**Function**: `updateProduct(productId, productData)`

**Process**:

1. Fetches existing product from Firestore to get `polarProductId`
2. Calls `/api/polar/products/update` to update product in Polar
3. Regenerates checkout link with updated product/price
4. Updates Firestore document with new data
5. Returns updated product

**Returns**: Updated product object

#### Delete Product

```javascript
import { deleteProduct } from "@/lib/api/products";

await deleteProduct("firestore_product_id");
```

**Function**: `deleteProduct(productId)`

**Process**:

1. Fetches existing product from Firestore to get `polarProductId`
2. Calls `/api/polar/products/delete` to delete from Polar (if polarProductId exists)
3. Deletes document from Firestore
4. Returns void

**Note**: Deletion from Firestore proceeds even if Polar deletion fails (logs warning).

### Usage Example

```javascript
import {
	createProduct,
	getAllProducts,
	updateProduct,
	deleteProduct,
} from "@/lib/api/products";

// Create a new product
const newProduct = await createProduct({
	name: "Pro Plan",
	description: "Professional plan with advanced features",
	prices: [
		{
			amount_type: "fixed",
			price_amount: 29.99,
			price_currency: "usd",
			recurring_interval: "month",
		},
	],
	bannerImages: [
		{
			base64: "data:image/png;base64,iVBORw0KGgo...",
			fileName: "pro-plan-banner.png",
		},
	],
});

// Get all products
const products = await getAllProducts();

// Update product
await updateProduct(newProduct.id, {
	name: "Pro Plan Plus",
	price_amount: 39.99,
});

// Delete product
await deleteProduct(newProduct.id);
```

### Error Handling

All API endpoints return standard error responses:

```javascript
{
  error: "Error message",
  details: "Additional error details (if available)"
}
```

**Common Errors**:

- `400`: Missing required fields (name, prices, polarProductId)
- `405`: Invalid HTTP method
- `500`: Server error or Polar API credentials not configured

### Best Practices

1. **File Upload**: Keep banner images under 10MB for optimal performance
2. **Price Updates**: When updating prices, ensure `amount_type` matches the price structure
3. **Media Management**: Store both `bannerImages` (base64) and `mediaFileIds` (Polar IDs) in Firestore
4. **Checkout Links**: Regenerate checkout links after product updates to ensure correct pricing
5. **Error Handling**: Always handle errors when calling product APIs
6. **Data Sync**: Firestore is the source of truth for client-side operations; Polar is synced via server-side APIs

## Payment Utilities

### Location: `lib/utils/polar/`

#### Payment Utils (`paymentUtils.js`)

```javascript
// Store payment record
storePaymentRecord(paymentData);

// Validate payment data
validatePaymentData(payment);

// Get payment status from subscription
getPaymentStatusFromSubscription(status);

// Verify payment status
verifyPaymentStatus(status, customerId, subscriptionId);
```

#### Customer Utils (`customerUtils.js`)

```javascript
// Enrich customer data
enrichCustomerData(customerId, customerData);

// Store customer record
storeCustomerRecord(customerData);
```

#### Plan Utils (`planUtils.js`)

```javascript
// Enrich plan data
enrichPlanData(customerId, product, subscription);

// Get plan information
getPlanInfo(planId);
```

#### Date Utils (`dateUtils.js`)

```javascript
// Normalize date
normalizeDate(timestamp);

// Get Firestore date
getFirestoreDate(timestamp);
```

## Admin Panel Integration

### Payments Tab

**Location**: `app/admin/components/PaymentsTab.jsx`

**Features**:

- View all payments
- Filter by status, customer, plan
- View payment details
- Export payment data

### Customers Tab

**Location**: `app/admin/components/CustomersTab.jsx`

**Features**:

- View all customers
- View subscription details
- Cancel subscriptions
- View payment history

## Subscription Emails

Automated emails sent for subscription events:

1. **Confirmation Email**: Sent on subscription creation
2. **Cancellation Email**: Sent on subscription cancellation
3. **Upgrade Email**: Sent on plan upgrade

See the **Emailing** section for details.

## Testing Payments

### Test Mode

1. Use Polar test mode
2. Use test card numbers from Polar docs
3. Test webhook locally with ngrok
4. Verify data in Firestore

### Test Cards

Polar provides test card numbers:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: Check Polar docs

### Local Webhook Testing

```bash
# Install ngrok
ngrok http 3000

# Update webhook URL in Polar dashboard
# Use ngrok URL: https://your-ngrok-url.ngrok.io/api/polar/webhook
```

![Setting up webhook with ngrok in Polar.sh dashboard](https://b4fcijccdw.ufs.sh/f/mVUSE925dTRYJCfcbyoG2bRAlp9mQzXtCFE8LDa5uTcysUBj)

_Screenshot showing how to configure webhook URL using ngrok in Polar.sh dashboard for local development_

## Error Handling

### Common Errors

1. **Invalid API Key**: Check `POLAR_ACCESS_TOKEN`
2. **Webhook Verification Failed**: Check `POLAR_WEBHOOK_SECRET`
3. **Product Not Found**: Verify `planId` exists in Polar
4. **Payment Failed**: Check customer payment method

### Error Responses

```javascript
// API errors
{
  error: "Error message",
  details: "Additional information"
}

// Webhook errors
// Logged to console, return 200 to prevent retries
```

## Security Considerations

1. **API Key Security**: Never commit API keys
2. **Webhook Verification**: Always verify signatures
3. **HTTPS**: Use HTTPS for webhook endpoints
4. **Data Validation**: Validate all webhook data
5. **Idempotency**: Handle duplicate webhook events

## Environment Variables

```env
POLAR_ACCESS_TOKEN=your_access_token
POLAR_API_URL=https://api.polar.sh
POLAR_WEBHOOK_SECRET=your_webhook_secret
```

## Payment Analytics

Track payment metrics:

- Total revenue
- Active subscriptions
- Churn rate
- Average revenue per user (ARPU)
- Payment success rate

Use Firestore queries or analytics tools to generate reports.

## Best Practices

1. **Webhook Reliability**: Always return 200 to acknowledge receipt
2. **Idempotency**: Check if event already processed
3. **Error Logging**: Log all errors for debugging
4. **Customer Communication**: Send emails for all events
5. **Data Sync**: Keep Firestore in sync with Polar
6. **Testing**: Test all payment flows thoroughly
7. **Monitoring**: Monitor webhook delivery and errors
