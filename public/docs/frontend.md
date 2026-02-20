# Frontend Pages Documentation

This document provides a comprehensive guide to all frontend pages included in the Inkgest Kit, how to customize them, and details about their structure and functionality.

## Table of Contents

- [Overview](#overview)
- [Common Components](#common-components)
- [Page Structure](#page-structure)
- [Available Pages](#available-pages)
  - [Homepage (`/`)](#homepage-)
  - [Features Page (`/features`)](#features-page-features)
  - [Pricing Page (`/pricing`)](#pricing-page-pricing)
  - [Blog Pages](#blog-pages)
    - [Blog List (`/blog`)](#blog-list-blog)
    - [Single Blog Post (`/blog/[slug]`)](#single-blog-post-blogslug)
  - [Forms (`/forms/[slug]`)](#forms-formsslug)
  - [Legal Pages](#legal-pages)
    - [Legal Hub (`/legal`)](#legal-hub-legal)
    - [Privacy Policy (`/privacy`)](#privacy-policy-privacy)
    - [Terms and Conditions (`/terms-and-conditions`)](#terms-and-conditions-terms-and-conditions)
  - [Contact Page (`/contact`)](#contact-page-contact)
  - [Documentation Page (`/docs`)](#documentation-page-docs)
  - [404 Page (`/404`)](#404-page-404)
- [Customization Guide](#customization-guide)
- [Styling and Theming](#styling-and-theming)

## Overview

The frontend is built with **Next.js 15** using the **Pages Router** architecture. All frontend pages are located in the `/pages` directory and follow a consistent structure:

- **Layout**: Each page uses `Navbar` and `Footer` components
- **Styling**: Tailwind CSS with a zinc color scheme
- **Animations**: Framer Motion for smooth transitions
- **SEO**: Next.js Head component for meta tags
- **Responsive**: Mobile-first responsive design

## Common Components

### Navbar (`app/components/Navbar.jsx`)

The navigation bar component used across all frontend pages.

**Features:**

- Responsive mobile menu
- Authentication state handling
- Links to main pages (Home, Features, Pricing, Blog, Docs)
- User dropdown when authenticated
- Sign up/Login buttons

**Customization:**

- Edit `app/components/Navbar.jsx` to modify navigation links
- Update logo and branding
- Customize user dropdown menu items

### Footer (`app/components/Footer.jsx`)

The footer component displayed on all pages.

**Features:**

- Links to legal pages
- Social media links
- Copyright information
- Newsletter subscription (optional)

**Customization:**

- Edit `app/components/Footer.jsx` to update links and content
- Modify footer sections and layout
- Add/remove social media links

## Page Structure

All frontend pages follow this structure:

```jsx
import React from "react";
import Head from "next/head";
import Navbar from "../app/components/Navbar";
import Footer from "../app/components/Footer";

const PageName = () => {
	return (
		<>
			<Head>
				<title>Page Title - YourApp</title>
				<meta name="description" content="Page description" />
			</Head>
			<div className="min-h-screen flex flex-col">
				<Navbar />
				<main className="flex-1">{/* Page content */}</main>
				<Footer />
			</div>
		</>
	);
};

export default PageName;
```

## Available Pages

### Homepage (`/`)

**File:** `pages/index.js`

**Purpose:** Main landing page showcasing your product.

**Sections:**

1. **Hero Section**
   - Main headline and tagline
   - Call-to-action buttons (Get Started, Learn More)
   - Animated with Framer Motion

2. **Features Section**
   - Grid of feature cards with icons
   - Highlights key product features
   - Icons from Lucide React

3. **Pricing Preview**
   - Overview of pricing plans
   - Links to full pricing page

4. **FAQ Section**
   - Expandable accordion-style questions
   - Common customer questions

5. **Contact Form**
   - Inline contact form
   - Submits to `/api/messages/create`

**Customization:**

- **Hero Text**: Edit the `h1` and description in the Hero Section
- **Features**: Modify the `features` array (lines 36-85)
- **Pricing Plans**: Update the `plans` array (lines 87-118)
- **FAQ**: Edit the FAQ data structure
- **Contact Form**: Customize form fields and submission logic

**Key Features:**

- Framer Motion animations
- Responsive design
- Contact form integration
- SEO optimized

### Features Page (`/features`)

**File:** `pages/features.js`

**Purpose:** Detailed feature showcase page.

**Sections:**

1. **Page Header**
   - Title and description

2. **Features Grid**
   - Detailed feature cards with icons
   - Descriptions for each feature
   - Same features as homepage but with more detail

**Customization:**

- Edit the `features` array to add/remove/modify features
- Update icons from Lucide React
- Modify descriptions and titles

**Key Features:**

- Clean grid layout
- Icon-based feature cards
- Responsive design

### Pricing Page (`/pricing`)

**File:** `pages/pricing.js`

**Purpose:** Display pricing plans and handle subscriptions.

**Sections:**

1. **Page Header**
   - Title and description

2. **Pricing Plans**
   - Multiple pricing tiers
   - Monthly/Yearly toggle
   - Feature lists per plan
   - Checkout buttons

3. **Subscription Management**
   - Current subscription status
   - Cancel subscription option
   - Refresh subscription button

**Key Functionality:**

- **Authentication**: Requires user login for checkout
- **Polar Integration**: Connects to Polar payment system
- **Subscription State**: Uses Redux store for subscription data
- **Checkout Flow**: Redirects to Polar checkout links

**Customization:**

- **Pricing Plans**: Edit the `plans` array structure
- **Features**: Update feature lists for each plan
- **Checkout Links**: Modify Polar product IDs and checkout links
- **Styling**: Update plan card designs

**Important Notes:**

- Plans are fetched from Polar API
- Checkout links are generated server-side
- Subscription status is managed via Redux

### Blog Pages

#### Blog List (`/blog`)

**File:** `pages/blog.js`

**Purpose:** Display list of published blog posts.

**Features:**

- **Search Functionality**: Search blogs by title
- **Blog Cards**: Display blog previews with:
  - Title
  - Author
  - Publication date
  - Excerpt/preview
  - Read more link
- **Subscribe Modal**: Newsletter subscription form
- **Responsive Grid**: Adapts to screen size

**Data Source:**

- Fetches from Firestore `blogs` collection
- Filters for `status: "published"`
- Ordered by publication date

**Customization:**

- **Layout**: Modify blog card design
- **Search**: Customize search functionality
- **Pagination**: Add pagination if needed
- **Filtering**: Add category/tag filtering

#### Single Blog Post (`/blog/[slug]`)

**File:** `pages/blog/[slug].js`

**Purpose:** Display individual blog post content.

**Features:**

- **Dynamic Routing**: Uses Next.js dynamic routes
- **Markdown Rendering**: Converts markdown to HTML
- **Syntax Highlighting**: Code blocks with Prism
- **Social Sharing**: Share buttons (Twitter, copy link)
- **Author Information**: Display author details
- **Publication Date**: Show when post was published
- **Back to Blog**: Navigation link

**Content Format:**

- Supports both HTML and Markdown
- Automatic conversion between formats
- Code syntax highlighting

**Customization:**

- **Layout**: Modify post layout and typography
- **Sharing**: Add more social sharing options
- **Comments**: Add comment system if needed
- **Related Posts**: Add related posts section

**URL Structure:**

- `/blog/[slug]` - Uses blog slug
- `/blog/id/[id]` - Alternative route using blog ID

### Forms (`/forms/[slug]`)

**File:** `pages/forms/[slug].js`

**Purpose:** Dynamic form builder for creating and displaying custom forms.

**Features:**

- **Dynamic Field Types**: Supports multiple field types:
  - Text input
  - Textarea
  - Select dropdown
  - Checkbox
  - Radio buttons
  - Rating (star-based)
  - Date picker (custom calendar component)
  - Signature pad (canvas-based)
  - Image upload (with thumbnail previews)
- **Form Validation**: Client-side validation for required fields
- **Live Preview**: Preview form before submission
- **Form Submission**: Direct submission to Firestore (client-side)
- **Responsive Design**: Mobile-friendly form layout

**Data Storage:**

- Form definitions stored in Firestore `forms` collection
- Form submissions stored in Firestore `formSubmissions` collection
- Image uploads stored in Firebase Storage (for Firebase setup) or Supabase Storage (for Supabase setup)

**Field Types:**

1. **Text**: Single-line text input
2. **Textarea**: Multi-line text input
3. **Select**: Dropdown with options
4. **Checkbox**: Multiple selection checkboxes
5. **Radio**: Single selection radio buttons
6. **Rating**: Star-based rating (1-5 or custom max)
7. **Date Picker**: Custom calendar date selector
8. **Signature**: Canvas-based signature pad
9. **Image Upload**: File upload with live thumbnail previews

**Customization:**

- **Form Fields**: Add/remove fields via admin panel
- **Validation**: Set required fields and validation rules
- **Styling**: Customize form appearance via Tailwind classes
- **Submission**: Modify submission logic in `lib/api/forms.js`

**Storage Notes:**

- **Firebase Setup**: Uses Firebase Storage for image uploads
- **Supabase Setup**: Uses Supabase Storage for image uploads
- Form metadata and submissions stored in respective database (Firestore or Supabase)

### Legal Pages

#### Legal Hub (`/legal`)

**File:** `pages/legal.js`

**Purpose:** Central hub linking to all legal documents.

**Features:**

- **Document Cards**: Links to:
  - Privacy Policy
  - Terms and Conditions
  - Cookie Policy (if implemented)
- **Icons**: Visual indicators for each document
- **Descriptions**: Brief description of each document

**Customization:**

- Add/remove legal documents
- Update descriptions
- Modify card design

#### Privacy Policy (`/privacy`)

**File:** `pages/privacy.js`

**Purpose:** Display privacy policy content.

**Structure:**

- **Header**: Title and last updated date
- **Sections**: Multiple sections covering:
  - Introduction
  - Information collection
  - Data usage
  - User rights
  - Contact information

**Customization:**

- **Content**: Replace with your actual privacy policy
- **Sections**: Add/remove sections as needed
- **Styling**: Update typography and layout

**Important:**

- Update content to match your actual privacy practices
- Ensure compliance with GDPR, CCPA, etc.
- Consult with legal counsel

#### Terms and Conditions (`/terms-and-conditions`)

**File:** `pages/terms-and-conditions.js`

**Purpose:** Display terms and conditions.

**Structure:**

- **Header**: Title and last updated date
- **Sections**: Multiple sections covering:
  - Agreement to terms
  - Use license
  - User accounts
  - Payment terms
  - Limitation of liability
  - Contact information

**Customization:**

- **Content**: Replace with your actual terms
- **Sections**: Add/remove sections as needed
- **Styling**: Update typography and layout

**Important:**

- Update content to match your actual terms
- Ensure compliance with local laws
- Consult with legal counsel

### Contact Page (`/contact`)

**File:** `pages/contact.js`

**Purpose:** Contact form for customer inquiries.

**Features:**

- **Contact Form** with fields:
  - Name (required)
  - Email (required)
  - Subject (required)
  - Message (required)
- **Form Validation**: Client-side validation
- **API Integration**: Submits to `/api/messages/create`
- **Success/Error Handling**: Toast notifications
- **Responsive Design**: Mobile-friendly layout

**Data Flow:**

1. User submits form
2. POST request to `/api/messages/create`
3. Message saved to Firestore `messages` collection
4. Success/error notification shown

**Customization:**

- **Fields**: Add/remove form fields
- **Validation**: Customize validation rules
- **Styling**: Update form design
- **Email Notifications**: Add email notifications on submission

### Documentation Page (`/docs`)

**File:** `pages/docs.js`

**Purpose:** Interactive documentation viewer.

**Features:**

- **Sidebar Navigation**: Table of contents
- **Markdown Rendering**: Renders markdown files
- **Syntax Highlighting**: Code blocks with Prism
- **Dark Mode Toggle**: Switch between light/dark themes
- **Search Functionality**: Search documentation content
- **Copy Code**: Copy code blocks to clipboard
- **Section Navigation**: Jump to sections

**Documentation Files:**

- Located in `public/docs/`
- Markdown format (`.md` files)
- Sections defined in `DOC_SECTIONS` array

**Available Sections:**

- Getting Started
- Tech Stack
- Architecture
- APIs
- Database
- Emailing
- Payments
- Authentication
- Admin
- SEO
- FAQ

**Customization:**

- **Add Sections**: Add new entries to `DOC_SECTIONS` array
- **Add Files**: Create new `.md` files in `public/docs/`
- **Styling**: Update documentation theme
- **Search**: Customize search functionality

### 404 Page (`/404`)

**File:** `pages/404.js`

**Purpose:** Custom 404 error page.

**Features:**

- **Friendly Message**: User-friendly error message
- **Navigation Links**: Links back to main pages
- **Consistent Design**: Matches site design

**Customization:**

- **Message**: Update error message
- **Design**: Customize 404 page design
- **Links**: Add more navigation options

## Admin Panel Features

The admin panel includes several frontend management features accessible via `/admin`:

### Changelog Management

**Location:** Admin Panel → Frontend → Changelog

**Features:**

- **Create/Edit Changelogs**: Rich text editor using TiptapEditor
- **Categories**: Organize changelogs by category (New releases, Improvements, Bug fixes, Features, Security)
- **Date Grouping**: Changelogs grouped by date
- **Preview**: Preview changelogs before publishing
- **Markdown Support**: Content stored as markdown, rendered as HTML

**Data Storage:**

- Changelogs stored in Firestore `changelog` collection
- Content supports markdown formatting
- Categories and dates for filtering

**Customization:**

- Edit `app/admin/components/ChangelogTab.jsx` to modify UI
- Update categories in `availableCategories` array
- Customize preview layout and styling

### Assets Management

**Location:** Admin Panel → Frontend → Assets

**Features:**

- **File Upload**: Upload multiple files (images, PDFs, videos, documents)
- **Image Compression**: Automatic browser-side compression for images before upload
- **File Types Supported**:
  - Images (JPG, PNG, GIF, WebP, etc.)
  - PDFs
  - Videos (MP4, WebM, etc.)
  - Documents (DOC, DOCX, etc.)
- **Table View**: Sortable and filterable table of all assets
- **File Type Filtering**: Filter assets by type using dropdown
- **Copy Link**: Generate shareable links for each asset (`/admin/files/[fileId]`)
- **Full-Screen View**: View files in full-screen mode
- **Delete**: Delete assets (removes both file and metadata)

**Storage:**

- **Firebase Setup**: Files stored in Firebase Storage
- **Supabase Setup**: Files stored in Supabase Storage
- Asset metadata stored in Firestore `assets` collection (Firebase) or Supabase `assets` table

**Image Compression:**

- Automatic compression for image files before upload
- Configurable max width/height (default: 1920px)
- Configurable quality (default: 0.8)
- Reduces file size and upload time

**Customization:**

- Edit `app/admin/components/AssetsTab.jsx` to modify UI
- Update file type filters in `lib/api/assets.js`
- Modify compression settings in `compressImage` function

### Forms Builder

**Location:** Admin Panel → Frontend → Forms

**Features:**

- **Form Builder**: Visual form builder with drag-and-drop interface
- **Field Management**: Add, edit, remove form fields
- **Field Types**: Support for all field types (text, textarea, select, checkbox, radio, rating, date, signature, image)
- **Live Preview**: Preview form as you build it
- **Split View**: Edit form on right side while viewing list on left
- **Form Submissions**: View all form submissions in table
- **Form Analytics**: Track submission counts
- **Export Submissions**: Export form submissions in CSV, JSON, PDF, or Excel formats

**Data Storage:**

- Form definitions stored in Firestore `forms` collection
- Form submissions stored in Firestore `formSubmissions` collection
- Image uploads from forms stored in Firebase Storage (Firebase) or Supabase Storage (Supabase)

**Export Functionality:**

- **Export Button**: Available in the header when viewing form submissions
- **Export Formats**: CSV, JSON, PDF, Excel
- **Exportable Data**: All form field data, submission metadata (ID, Form ID, Created At)
- **Usage**: Export form submissions for analysis, backup, or integration with other tools
- **Note**: Export is available when viewing form submissions (submissions view), not when viewing form definitions

**Customization:**

- Edit `app/admin/components/FormsTab.jsx` to modify UI
- Add custom field types in form builder
- Customize validation rules in `lib/api/forms.js`
- Modify submission handling logic

### Analytics

**Location:** Admin Panel → Audience → Analytics

**Features:**

- **Analytics Tracking**: Track website analytics with detailed visitor data
- **Geolocation Data**: IP-based and browser GPS location tracking
- **Map Visualization**: Interactive map view using React Leaflet library
- **List View**: Sortable table with analytics record details
- **Region Filtering**: Filter analytics records by region (Asia/India/USA, Europe, Middle East, Africa, Australia)
- **Search Functionality**: Search by IP, country, city, user agent, or fingerprint
- **Visit Statistics**: Track first visit, last visit, and visit count per record
- **Device Information**: Display user agent, ISP, and device details
- **Map Themes**: Light and dark theme support for map view
- **Session-based Tracking**: Tracks once per session using sessionStorage
- **React Query Integration**: Optimized tracking with automatic retries and caching

**Tracking Implementation:**

- **Component**: `lib/ui/AnalyticsTracker.jsx` - Reusable component for tracking
- **Hook**: `lib/hooks/useAnalyticsTracking.js` - Custom hook using React Query's `useMutation`
- **API**: `lib/api/analytics.js` - All analytics functions including tracking utilities
- **Integration**: Add `<AnalyticsTracker />` to `pages/_app.js` for automatic tracking

**Maps Library:**

- **React Leaflet v4.2.1**: Used for interactive map visualization (compatible with React 18)
- **OpenStreetMap Tiles**: Light theme uses OpenStreetMap tiles
- **CARTO Dark Tiles**: Dark theme uses CARTO dark map tiles
- **Custom Markers**: Grouped markers showing record count per location
- **Dynamic Imports**: Leaflet components dynamically imported to avoid SSR issues

**Data Storage:**

- Analytics data stored in Firestore `app-analytics` collection
- Location data includes latitude, longitude, city, country, region
- Browser fingerprinting for unique visitor identification
- Visit timestamps and counts tracked per record

**Customization:**

- Edit `app/admin/components/AnalyticsTab.jsx` to modify UI
- Update region mappings in `REGION_MAPPING` object
- Customize map markers and popups
- Modify search and filter functionality
- Update map tile providers if needed
- Configure tracking options in `useAnalyticsTracking` hook

**Dependencies:**

- `react-leaflet@^4.2.1`: React components for Leaflet maps (React 18 compatible)
- `leaflet@^1.9.4`: Core mapping library (peer dependency)
- `@tanstack/react-query`: For optimized tracking with mutations
- CSS imports required: `leaflet/dist/leaflet.css` (imported in `styles/globals.css`)

## Customization Guide

### Changing Branding

1. **App Name**: Search and replace "YourApp" across all pages
2. **Logo**: Update logo in `Navbar.jsx` and `Footer.jsx`
3. **Colors**: Modify Tailwind color classes (zinc-900, zinc-600, etc.)

### Modifying Page Content

1. **Text Content**: Directly edit JSX content in page files
2. **Images**: Replace image URLs or add new images to `public/`
3. **Icons**: Use Lucide React icons or replace with custom icons

### Adding New Pages

1. Create new file in `pages/` directory
2. Follow the standard page structure
3. Import `Navbar` and `Footer` components
4. Add SEO meta tags using `Head` component
5. Add route to navigation if needed

### Updating Navigation

1. Edit `app/components/Navbar.jsx`
2. Update navigation links array
3. Add/remove menu items
4. Update mobile menu accordingly

### Modifying Forms

1. **Contact Form**: Edit `pages/contact.js`
2. **Newsletter**: Update subscription form in `Footer.jsx`
3. **Blog Subscribe**: Modify subscribe modal in `blog.js`

## Styling and Theming

### Color Scheme

The default color scheme uses **Zinc** palette:

- **Primary**: `zinc-900` (dark)
- **Secondary**: `zinc-600` (medium zinc)
- **Background**: `zinc-50` (light zinc)
- **Borders**: `zinc-200` (light borders)

### Typography

- **Headings**: Bold, various sizes (text-2xl to text-6xl)
- **Body**: Regular weight, zinc-700/zinc-600
- **Links**: Hover effects with color transitions

### Spacing

- **Sections**: `py-20` (vertical padding)
- **Containers**: `max-w-4xl` or `max-w-6xl` (max width)
- **Gaps**: `gap-4` or `gap-6` (between elements)

### Responsive Design

- **Mobile**: Base styles (mobile-first)
- **Tablet**: `sm:` breakpoint (640px+)
- **Desktop**: `lg:` breakpoint (1024px+)

### Animations

- **Framer Motion**: Used for page transitions
- **Hover Effects**: Scale and color transitions
- **Loading States**: Skeleton loaders

### Customization Tips

1. **Global Styles**: Edit `styles/globals.css`
2. **Tailwind Config**: Modify `tailwind.config.js` for custom colors/fonts
3. **Component Styles**: Use Tailwind utility classes
4. **Dark Mode**: Add dark mode support if needed

## Best Practices

1. **SEO**: Always include proper meta tags in `Head` component
2. **Accessibility**: Use semantic HTML and ARIA labels
3. **Performance**: Optimize images and lazy load content
4. **Mobile First**: Design for mobile, enhance for desktop
5. **Consistency**: Maintain consistent styling across pages
6. **Error Handling**: Implement proper error states
7. **Loading States**: Show loading indicators for async operations

## Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Framer Motion**: https://www.framer.com/motion/
- **Lucide Icons**: https://lucide.dev/

## Support

For questions or issues with frontend pages, refer to:

- Main documentation: `/docs`
- Architecture docs: `/docs/architecture`
- API docs: `/docs/apis`
