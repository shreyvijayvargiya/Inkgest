# Database

Inkgest: Link to Gest supports two database options: Firebase Firestore (primary) and Supabase PostgreSQL (optional). This document describes both database structures and usage.

## Firebase Firestore

Firestore is the primary database used in Inkgest: Link to Gest. It's a NoSQL document database that provides real-time updates and automatic scaling.

### Collections Structure

#### Blogs Collection (`blogs`)

```javascript
{
  id: "string (auto-generated)",
  title: "string",
  slug: "string (unique)",
  content: "string (HTML)",
  author: "string",
  status: "draft" | "published",
  bannerImage: "string (URL)",
  publishedAt: "Timestamp",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

**Indexes Required**:

- `createdAt` (descending)
- `status` + `createdAt` (composite)

#### Emails Collection (`emails`)

```javascript
{
  id: "string (auto-generated)",
  subject: "string",
  content: "string (HTML)",
  status: "draft" | "sent",
  recipients: "number",
  publishedAt: "Timestamp",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

#### Subscribers Collection (`subscribers`)

```javascript
{
  id: "string (auto-generated)",
  email: "string (unique)",
  name: "string (optional)",
  status: "active" | "unsubscribed",
  subscribedAt: "Timestamp",
  unsubscribedAt: "Timestamp (optional)",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

#### Users Collection (`users`)

```javascript
{
  id: "string (Firebase Auth UID)",
  uid: "string",
  email: "string",
  name: "string",
  displayName: "string",
  provider: "google" | "email",
  photoURL: "string (optional)",
  emailVerified: "boolean",
  lastSignIn: "Timestamp",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

#### Teams Collection (`teams`)

```javascript
{
  id: "string (auto-generated)",
  email: "string (unique)",
  username: "string (optional)",
  role: "admin" | "editor" | "author" | "viewer",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

**Note**: Roles are stored in the teams collection, not in Firebase Auth.

#### Customers Collection (`customers`)

```javascript
{
  id: "string (auto-generated)",
  customerId: "string (Polar customer ID)",
  subscriptionId: "string (Polar subscription ID)",
  email: "string",
  name: "string",
  planId: "string",
  planName: "string",
  status: "active" | "canceled" | "past_due",
  amount: "number",
  currency: "string (e.g., 'usd')",
  expiresAt: "Timestamp",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

#### Payments Collection (`payments`)

```javascript
{
  id: "string (Polar payment ID)",
  paymentId: "string",
  customerId: "string",
  customerEmail: "string",
  customerName: "string",
  amount: "number",
  currency: "string",
  status: "succeeded" | "pending" | "failed",
  planId: "string",
  planName: "string",
  subscriptionId: "string (optional)",
  paymentType: "subscription" | "payment",
  eventType: "string",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

#### Messages Collection (`messages`)

```javascript
{
  id: "string (auto-generated)",
  name: "string",
  email: "string",
  subject: "string",
  message: "string",
  status: "new" | "replied",
  read: "boolean",
  replied: "boolean",
  repliedAt: "Timestamp (optional)",
  readAt: "Timestamp (optional)",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

#### Invoices Collection (`invoices`)

```javascript
{
  id: "string (auto-generated)",
  invoiceNumber: "string (unique)",
  invoiceDate: "Timestamp",
  dueDate: "Timestamp (optional)",
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
  clientId: "string (optional)",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

**Indexes Required**:

- `createdAt` (descending)
- `status` + `createdAt` (composite)
- `invoiceNumber` (unique)

#### Waitlist Collection (`waitlist`)

```javascript
{
  id: "string (auto-generated)",
  name: "string",
  email: "string (unique)",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

**Indexes Required**:

- `createdAt` (descending)
- `email` (unique)

#### Report Issues Collection (`reportIssues`)

```javascript
{
  id: "string (auto-generated)",
  name: "string",
  email: "string",
  username: "string (optional)",
  issue: "string",
  status: "pending" | "fixed",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

**Indexes Required**:

- `createdAt` (descending)
- `status` + `createdAt` (composite)

#### Checkouts Collection (`checkouts`)

```javascript
{
  id: "string (auto-generated)",
  checkoutId: "string (Polar checkout ID)",
  planId: "string",
  customerId: "string (optional)",
  status: "pending" | "completed" | "expired",
  createdAt: "Timestamp"
}
```

### Firestore Security Rules

Example security rules (configure in Firebase Console):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Blogs: Read public, write authenticated
    match /blogs/{blogId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Emails: Authenticated only
    match /emails/{emailId} {
      allow read, write: if request.auth != null;
    }

    // Subscribers: Authenticated read/write
    match /subscribers/{subscriberId} {
      allow read, write: if request.auth != null;
    }

    // Users: Own data or admin
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Teams: Authenticated read, admin write
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Add role check
    }

    // Invoices: Authenticated read/write
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null;
    }

    // Waitlist: Authenticated read/write
    match /waitlist/{waitlistId} {
      allow read, write: if request.auth != null;
    }

    // Report Issues: Authenticated read/write
    match /reportIssues/{issueId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Firestore Operations

**Location**: `lib/api/`

**Common Operations**:

- `getAllBlogs()`: Fetch all blogs
- `createBlog()`: Create new blog
- `updateBlog()`: Update blog
- `deleteBlog()`: Delete blog

**Query Examples**:

```javascript
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../utils/firebase";

// Get published blogs
const q = query(
	collection(db, "blogs"),
	where("status", "==", "published"),
	orderBy("createdAt", "desc"),
);
const snapshot = await getDocs(q);
```

## Supabase PostgreSQL

Supabase provides a PostgreSQL database with Row Level Security (RLS) and real-time capabilities.

### Database Schema

See `supabase-migrations.sql` for complete schema.

#### Blogs Table

```sql
CREATE TABLE blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT,
    author TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    banner_image TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Emails Table

```sql
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    recipients INTEGER DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Subscribers Table

```sql
CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Teams Table

```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'author', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uid TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    display_name TEXT,
    provider TEXT,
    photo_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_sign_in TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Row Level Security (RLS)

RLS policies are defined in the migration script. Example:

```sql
-- Enable RLS
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read blogs
CREATE POLICY "Allow authenticated users to read blogs"
    ON blogs FOR SELECT
    TO authenticated
    USING (true);
```

### Supabase Operations

**Location**: `lib/api-supabase/`

**Client Setup**:

```javascript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL,
	process.env.NEXT_PUBLIC_SUPABASE_KEY,
);
```

**Query Examples**:

```javascript
// Get all blogs
const { data, error } = await supabase
	.from("blogs")
	.select("*")
	.eq("status", "published")
	.order("created_at", { ascending: false });

// Create blog
const { data, error } = await supabase.from("blogs").insert({
	title: "New Blog",
	slug: "new-blog",
	content: "Content here",
	status: "draft",
});
```

## Database Migration

### Firestore

Firestore doesn't require explicit migrations. Collections are created automatically when first document is added.

### Supabase

Run the migration script:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase Dashboard SQL Editor
# Copy and paste contents of supabase-migrations.sql
```

## Data Seeding

Use the seed script to populate initial data:

```bash
npm run seed
# or
node scripts/seed-database.js
```

**Location**: `scripts/seed-database.js`

## Choosing Between Firestore and Supabase

### Use Firestore When:

- You need real-time updates
- You prefer NoSQL flexibility
- You want automatic scaling
- You're already using Firebase for auth/storage

### Use Supabase When:

- You need SQL queries
- You want Row Level Security
- You prefer PostgreSQL
- You need complex joins and relationships

## Best Practices

1. **Indexes**: Create indexes for frequently queried fields
2. **Security Rules**: Always configure security rules
3. **Data Validation**: Validate data before saving
4. **Error Handling**: Handle database errors gracefully
5. **Pagination**: Implement pagination for large datasets
6. **Backups**: Regular backups of production data
7. **Monitoring**: Monitor database performance and usage

## Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
# ... other Firebase vars

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_key
```
