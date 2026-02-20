# Tech Stack

Inkgest: Link to Gest is built with modern, production-ready technologies. This document outlines all the technologies, frameworks, and libraries used in the project.

## Core Framework

### Next.js 15.1.7

- **Purpose**: React framework for production
- **Features Used**:
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API routes
  - File-based routing
  - Image optimization
- **Why**: Provides excellent developer experience and performance optimizations out of the box

### React 18.0.0

- **Purpose**: UI library
- **Features Used**:
  - Functional components
  - Hooks (useState, useEffect, etc.)
  - Context API
- **Why**: Industry standard for building user interfaces

## Styling

### Tailwind CSS 3.4.17

- **Purpose**: Utility-first CSS framework
- **Features Used**:
  - Utility classes
  - Responsive design
  - Custom configuration
- **Why**: Rapid UI development with consistent design system

### Tailwind CSS Animate 1.0.7

- **Purpose**: Animation utilities for Tailwind
- **Why**: Smooth, performant animations

### Framer Motion 12.6.2

- **Purpose**: Animation library for React
- **Features Used**:
  - Component animations
  - Page transitions
  - Gesture handling
- **Why**: Powerful and declarative animation API

## State Management

### React Query (TanStack Query) 5.66.6

- **Purpose**: Server state management
- **Features Used**:
  - Data fetching
  - Caching
  - Background updates
- **Why**: Simplifies server state management and caching

## Database & Backend

### Firebase 11.3.1

- **Services Used**:
  - **Firebase Auth**: User authentication
  - **Firestore**: NoSQL database
  - **Firebase Storage**: File storage
- **Why**: Real-time database with excellent scalability

### Supabase 2.56.0

- **Purpose**: Alternative PostgreSQL database
- **Features Used**:
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
- **Why**: Open-source Firebase alternative with SQL

## Authentication

### Firebase Authentication

- **Providers Supported**:
  - Email/Password
  - Google OAuth
- **Features**:
  - Email verification
  - Password reset
  - Session management
- **Implementation**: Custom auth wrapper with role-based access control

## Email Service

### Resend 6.2.2

- **Purpose**: Transactional email service
- **Features Used**:
  - Email sending
  - Batch sending
  - Email templates
- **Why**: Modern email API with excellent deliverability

## Payment Processing

### Polar API

- **Purpose**: Subscription and payment management
- **Features Used**:
  - Checkout sessions
  - Subscription management
  - Webhook handling
  - Payment tracking
- **Why**: Comprehensive payment solution for SaaS applications

## Rich Text Editor

### Tiptap 2.11.5

- **Purpose**: Headless rich text editor
- **Extensions Used**:
  - Starter Kit
  - Image
  - Link
  - Color
  - Highlight
  - Task List
  - Text Align
  - Typography
  - Underline
  - Blockquote
  - Placeholder
  - Character Count
- **Why**: Extensible and customizable editor

### Tiptap Markdown 0.8.10

- **Purpose**: Markdown support for Tiptap
- **Why**: Seamless markdown editing experience

## UI Components & Icons

### Lucide React 0.474.0

- **Purpose**: Icon library
- **Why**: Beautiful, consistent icon set

### React Toastify 11.0.3

- **Purpose**: Toast notifications
- **Why**: Easy-to-use notification system

## Utilities

### Fuse.js 7.1.0

- **Purpose**: Fuzzy search library
- **Why**: Powerful search functionality

### JS Cookie 3.0.5

- **Purpose**: Cookie management
- **Why**: Simple cookie handling

### Recharts 3.5.1

- **Purpose**: Charting library
- **Why**: Responsive charts for data visualization

## Development Tools

### TypeScript 5.8.3

- **Purpose**: Type safety
- **Why**: Catch errors at compile time

### PostCSS 8.5.1

- **Purpose**: CSS processing
- **Why**: Required for Tailwind CSS

### Autoprefixer 10.4.20

- **Purpose**: CSS vendor prefixing
- **Why**: Browser compatibility

## Build & Deployment

### Next.js Build System

- **Features**:
  - Automatic code splitting
  - Image optimization
  - Static export support
  - API route compilation

## Package Management

- **npm** or **yarn** for dependency management
- **package-lock.json** or **yarn.lock** for version locking

## Environment Variables

All sensitive configuration is managed through environment variables:

- Firebase credentials
- Supabase credentials
- Resend API keys
- Polar API tokens
- Webhook secrets

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimizations

- Code splitting
- Image optimization
- Lazy loading
- Caching strategies
- Bundle size optimization

## Security Features

- Environment variable protection
- Row Level Security (RLS) in Supabase
- Firebase Security Rules
- XSS protection headers
- CSRF protection
- Secure cookie handling
