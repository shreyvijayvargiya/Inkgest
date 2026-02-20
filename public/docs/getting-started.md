# Getting Started

Welcome to Inkgest: Link to Gest - a comprehensive SaaS starting boilerplate that provides all the essential features for building modern web applications. This guide will help you get started with the project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd saas-starter-boilerplate
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory with the following variables:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

   # Supabase Configuration (Optional)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_KEY=your_supabase_key

   # Resend Email Configuration
   RESEND_API_KEY=your_resend_api_key
   RESEND_FROM_EMAIL=your_from_email@domain.com

   # Polar Payments Configuration
   POLAR_ACCESS_TOKEN=your_polar_access_token
   POLAR_API_URL=https://api.polar.sh
   POLAR_WEBHOOK_SECRET=your_polar_webhook_secret

   # PostHog Analytics Configuration (Optional)
   NEXT_PUBLIC_POSTHOG_KEY=your_posthog_api_key
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```

4. **Initialize Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Google)
   - Create a Firestore database
   - Set up Firebase Storage
   - Copy your Firebase configuration to `.env.local`

5. **Set up Supabase (Optional)**
   - Create a Supabase project at [Supabase](https://supabase.com/)
   - Run the migration script from `supabase-migrations.sql`
   - Copy your Supabase credentials to `.env.local`

6. **Configure Resend**
   - Sign up at [Resend](https://resend.com/)
   - Get your API key
   - Verify your domain
   - Add credentials to `.env.local`

7. **Set up Polar (Optional)**
   - Create a Polar account at [Polar](https://polar.sh/)
   - Create products and plans
   - Set up webhook endpoint: `/api/polar/webhook`
   - Add credentials to `.env.local`

8. **Set up PostHog (Optional)**
   - Sign up at [PostHog](https://posthog.com/) (free tier available)
   - Create a new project
   - Go to **Project Settings** → **Project API Key**
   - Copy your API key (starts with `phc_`)
   - Add `NEXT_PUBLIC_POSTHOG_KEY` to `.env.local`
   - If using EU cloud, set `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
   - PostHog will automatically track:
     - Page views
     - Session replays
     - User identification (on login)
     - Custom events (via `trackEvent()` utility)
   - View analytics at your PostHog dashboard

## Running the Application

1. **Development mode**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Build for production**

   ```bash
   npm run build
   npm start
   ```

3. **Seed database (Optional)**
   ```bash
   npm run seed
   ```

## Project Structure

```
saas-starter-boilerplate/
├── app/                    # Application components
│   ├── admin/              # Admin dashboard
│   └── components/         # Shared components
├── docs/                   # Documentation files
├── lib/                    # Library code
│   ├── api/                # API functions
│   ├── config/             # Configuration files
│   ├── hooks/              # Custom React hooks
│   ├── store/               # Redux store
│   ├── ui/                  # UI components
│   └── utils/               # Utility functions
├── pages/                   # Next.js pages
│   ├── api/                 # API routes
│   ├── admin/               # Admin pages
│   └── blog/                # Blog pages
├── public/                  # Static assets
├── scripts/                 # Utility scripts
└── styles/                  # Global styles
```

## Next Steps

- Navigate to the **Tech Stack** section to understand the technologies used
- Check out the **Architecture** section for system design
- Explore the **APIs** section for API documentation
- Learn about **Authentication** setup in the Authentication section
- Review the **Admin** panel features in the Admin section

## Getting Help

If you encounter any issues:

1. Check the documentation sections
2. Review the code comments
3. Check GitHub issues (if applicable)
4. Review the error logs in the browser console

## Common Issues

**Firebase initialization errors**: Ensure all environment variables are set correctly and Firebase services are enabled.

**Email sending fails**: Verify your Resend API key and domain verification.

**Payment webhooks not working**: Check your Polar webhook secret and endpoint configuration.

**Database connection issues**: Verify your Supabase credentials and run the migration script.

**PostHog not tracking**: Ensure `NEXT_PUBLIC_POSTHOG_KEY` is set correctly and check browser console for initialization messages.
