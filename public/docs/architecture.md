# Architecture

This document describes the overall architecture of the Inkgest: Link to Gest, including system design, data flow, and component structure.

## System Overview

Inkgest: Link to Gest follows a modern full-stack architecture with the following layers:

```
┌─────────────────────────────────────────┐
│         Client (Browser)                 │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Next.js    │  │   React      │    │
│  │   Pages      │  │  Components  │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Next.js API Routes                  │
│  ┌──────────┐  ┌──────────┐            │
│  │  Emails  │  │ Payments │            │
│  │  API     │  │   API    │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────┐      ┌──────────────┐
│   Firebase   │      │   Supabase   │
│  (Primary)   │      │ (Optional)   │
└──────────────┘      └──────────────┘
```

## Application Layers

### 1. Presentation Layer

**Location**: `pages/`, `app/components/`

- **Next.js Pages**: File-based routing system
  - Public pages: `index.js`, `blog.js`, `pricing.js`
  - Admin pages: `admin/index.jsx`
  - API routes: `pages/api/`

- **React Components**: Reusable UI components
  - Admin components: `app/admin/components/`
  - Shared components: `app/components/`
  - UI library: `lib/ui/`

### 2. Business Logic Layer

**Location**: `lib/api/`, `lib/utils/`

- **API Functions**: Data access layer
  - Firebase operations: `lib/api/`
  - Supabase operations: `lib/api-supabase/`
  - Utility functions: `lib/utils/`

- **State Management**:
  - Redux Store: `lib/store/`
  - React Query: Server state caching
  - Local State: React hooks

### 3. Data Layer

**Primary Database**: Firebase Firestore

- Collections: `blogs`, `emails`, `subscribers`, `users`, `teams`, `payments`, `customers`, `invoices`, `waitlist`, `reportIssues`, `messages`, `checkouts`

**Optional Database**: Supabase (PostgreSQL)

- Tables: `blogs`, `emails`, `subscribers`, `teams`, `users`

**File Storage**: Firebase Storage

- Images, documents, and other media files

## Data Flow

### Authentication Flow

```
User Action
    │
    ▼
Firebase Auth
    │
    ▼
Save to Firestore (users collection)
    │
    ▼
Check Teams Collection (for role)
    │
    ▼
Set User Cookie
    │
    ▼
Update React State
```

### Blog Creation Flow

```
Admin Creates Blog
    │
    ▼
Tiptap Editor (Rich Text)
    │
    ▼
Convert to HTML/Markdown
    │
    ▼
Save to Firestore
    │
    ▼
Generate Slug
    │
    ▼
Update UI (React Query)
```

### Email Sending Flow

```
Admin Creates Email
    │
    ▼
Save to Firestore (draft)
    │
    ▼
Admin Triggers Send
    │
    ▼
API Route: /api/emails/send
    │
    ▼
Fetch Active Subscribers
    │
    ▼
Resend API (Batch Send)
    │
    ▼
Update Email Status
    │
    ▼
Return Statistics
```

### Payment Flow

```
User Selects Plan
    │
    ▼
API Route: /api/polar/checkout
    │
    ▼
Create Polar Checkout Session
    │
    ▼
Redirect to Polar
    │
    ▼
User Completes Payment
    │
    ▼
Polar Webhook: /api/polar/webhook
    │
    ▼
Store in Firestore
    │
    ▼
Send Confirmation Email
```

## Component Architecture

### Admin Dashboard

```
Admin/index.jsx (Main Container)
    │
    ├── Sidebar Navigation
    │   ├── Project Selector
    │   ├── Navigation Items
    │   └── User Menu
    │
    └── Content Area
        ├── HomeTab
        ├── BlogTab
        ├── EmailTab
        ├── SubscribersTab
        ├── UsersTab
        ├── CustomersTab
        ├── PaymentsTab
        └── MessagesTab
```

### Component Hierarchy

```
Page Component
    │
    ├── Layout Components
    │   ├── Navbar
    │   └── Footer
    │
    ├── Feature Components
    │   ├── Blog Components
    │   ├── Email Components
    │   └── Admin Components
    │
    └── UI Components
        ├── Modals
        ├── Forms
        └── Tables
```

## State Management Strategy

### Redux Store

- **Purpose**: Global application state
- **Slices**: Subscription state, user preferences
- **Persistence**: Redux Persist for offline support

### React Query

- **Purpose**: Server state management
- **Features**: Caching, background refetching, optimistic updates
- **Use Cases**: Blog data, user data, subscriber lists

### Local State

- **Purpose**: Component-specific state
- **Tools**: useState, useReducer hooks
- **Use Cases**: Form inputs, UI toggles, temporary data

## API Architecture

### Next.js API Routes

**Location**: `pages/api/`

**Structure**:

```
api/
├── emails/
│   ├── send.js          # Send to subscribers
│   ├── send-to-users.js # Send to authenticated users
│   └── send-single.js   # Send to single user
├── messages/
│   ├── create.js        # Create message
│   └── reply.js         # Reply to message
└── polar/
    ├── checkout.js      # Create checkout session
    ├── webhook.js       # Handle webhooks
    └── cancel-subscription.js
```

### API Design Principles

1. **RESTful**: Follow REST conventions where applicable
2. **Error Handling**: Consistent error responses
3. **Validation**: Input validation on all endpoints
4. **Security**: Authentication and authorization checks
5. **Rate Limiting**: Prevent abuse (implement as needed)

## Security Architecture

### Authentication

- Firebase Authentication for user management
- Role-based access control (RBAC)
- Session management via cookies

### Authorization

- Role-based permissions system
- Team-based access control
- Resource-level permissions

### Data Security

- Environment variables for secrets
- Firebase Security Rules
- Supabase Row Level Security (RLS)
- Input sanitization
- XSS protection headers

## File Structure

```
saas-starter-boilerplate/
├── app/                    # Application code
│   ├── admin/              # Admin dashboard
│   └── components/         # Shared components
├── lib/                    # Library code
│   ├── api/                # API functions
│   ├── api-supabase/       # Supabase API
│   ├── config/             # Configuration
│   ├── hooks/              # Custom hooks
│   ├── store/              # Redux store
│   ├── ui/                 # UI components
│   └── utils/              # Utilities
├── pages/                  # Next.js pages
│   ├── api/                # API routes
│   ├── admin/              # Admin pages
│   └── blog/               # Blog pages
├── public/                 # Static files
├── scripts/                # Utility scripts
└── styles/                 # Global styles
```

## Performance Optimizations

### Client-Side

- Code splitting with Next.js
- Lazy loading components
- Image optimization
- React Query caching
- Memoization where appropriate

### Server-Side

- API route optimization
- Database query optimization
- Caching strategies
- Static generation where possible

## Scalability Considerations

### Database

- Firestore: Automatic scaling
- Supabase: PostgreSQL with connection pooling
- Index optimization for queries

### API

- Stateless API routes
- Horizontal scaling capability
- Rate limiting implementation

### Frontend

- CDN for static assets
- Edge caching
- Progressive Web App (PWA) capabilities

## Deployment Architecture

### Recommended Setup

- **Hosting**: Vercel (Next.js optimized)
- **Database**: Firebase Firestore / Supabase
- **Storage**: Firebase Storage
- **Email**: Resend
- **Payments**: Polar

### Environment Configuration

- Development: Local with `.env.local`
- Staging: Separate Firebase/Supabase projects
- Production: Production credentials

## Monitoring & Logging

### Recommended Tools

- Firebase Analytics
- Error tracking (Sentry, etc.)
- Performance monitoring
- User analytics

### Logging Strategy

- Client-side: Console logs (development)
- Server-side: Structured logging
- Error tracking: Centralized error reporting
