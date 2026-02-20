# Analytics

This guide covers all analytics integrations available in the Inkgest: Link to Gest, including PostHog for session replays and product analytics, Vercel Analytics for web performance metrics, and custom analytics for visitor tracking.

## PostHog Analytics

PostHog is a comprehensive product analytics platform that provides session replays, event tracking, feature flags, and user insights.

### Installation

1. **Install the PostHog package:**

```bash
npm install posthog-js
```

2. **Set up environment variables:**

Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Getting Your PostHog API Key

1. Sign up for a free account at [PostHog](https://posthog.com/)
2. Create a new project
3. Navigate to **Project Settings** → **Project API Key**
4. Copy your API key (starts with `phc_`)
5. Add it to your `.env.local` file

**Note:** If you're using PostHog's EU cloud, set `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` instead.

### Integration

PostHog is automatically initialized when you wrap your app with `PostHogProvider` in `pages/_app.js`. The integration includes:

- **Automatic page view tracking** on route changes
- **Session replay recording** with privacy settings
- **User identification** on login/signup
- **Custom event tracking** via utility functions

### Using PostHog Methods

#### Track Custom Events

Track custom events throughout your application:

```javascript
import { trackEvent } from "../lib/utils/posthog";

// Track a button click
trackEvent("button_clicked", {
	button_name: "signup",
	page: "/pricing",
});

// Track a purchase
trackEvent("purchase_completed", {
	amount: 99.99,
	currency: "USD",
	product_id: "premium_plan",
});
```

#### Identify Users

Identify users when they log in or sign up:

```javascript
import { identifyUser } from "../lib/utils/posthog";

// Identify user after authentication
identifyUser(user.uid, {
	email: user.email,
	name: user.displayName,
	plan: "premium",
});
```

#### Set User Properties

Update user properties:

```javascript
import { setUserProperties } from "../lib/utils/posthog";

setUserProperties({
	subscription_tier: "pro",
	last_active: new Date().toISOString(),
});
```

#### Reset User (on Logout)

Reset user identification when logging out:

```javascript
import { resetUser } from "../lib/utils/posthog";

// Call on logout
resetUser();
```

#### Feature Flags

Check feature flag values:

```javascript
import { getFeatureFlag } from "../lib/utils/posthog";

const isNewFeatureEnabled = getFeatureFlag("new-feature", false);

if (isNewFeatureEnabled) {
	// Show new feature
}
```

#### Session Replay Controls

Manually control session replay:

```javascript
import {
	startSessionReplay,
	stopSessionReplay,
	isSessionReplayActive,
} from "../lib/utils/posthog";

// Start recording
startSessionReplay();

// Stop recording
stopSessionReplay();

// Check if active
const isActive = isSessionReplayActive();
```

### Viewing PostHog Analytics

#### Session Replays

1. Log in to your [PostHog dashboard](https://app.posthog.com/)
2. Navigate to **Recordings** in the left sidebar
3. Browse recorded sessions to see user interactions
4. Filter by date, user, or event

![PostHog Session Replays](https://b4fcijccdw.ufs.sh/f/mVUSE925dTRYZQVmUYBTK92D8Q4FPy6d3cZJgYaGiRjLmIke)

**How to access:**

- Go to [app.posthog.com](https://app.posthog.com/)
- Click **Recordings** in the sidebar
- Select any session to view the replay

#### Viewing Events

1. Navigate to **Activity** → **Events** in your PostHog dashboard
2. See all tracked events with their properties
3. Filter and search events by name, user, or date range
4. Create insights and dashboards from event data

![PostHog Events](https://b4fcijccdw.ufs.sh/f/mVUSE925dTRYyj0UdjEnwDYs1AMchQFyb07I84jWivdH9mO2)

**How to access:**

- Go to [app.posthog.com](https://app.posthog.com/)
- Click **Activity** → **Events** in the sidebar
- View all captured events and their properties

#### Visitor Analytics (DAU, MAU)

1. Navigate to **Insights** in your PostHog dashboard
2. View Daily Active Users (DAU) and Monthly Active Users (MAU)
3. Create custom insights and trends
4. Analyze user retention and engagement

![PostHog Visitor Analytics](https://b4fcijccdw.ufs.sh/f/mVUSE925dTRYjKVbcLS6Fu1bQOM0p4lVUeY7JgB8RswZoWSE)

**How to access:**

- Go to [app.posthog.com](https://app.posthog.com/)
- Click **Insights** in the sidebar
- View default insights or create custom ones
- Track DAU, MAU, and other user metrics

---

## Vercel Analytics

Vercel Analytics provides real-time web analytics including page views, performance metrics, and visitor insights directly in your Vercel dashboard.

### Installation

1. **Install the Vercel Analytics package:**

```bash
npm install @vercel/analytics
```

### Integration

Add the Analytics component to your `pages/_app.js`:

```javascript
import { Analytics } from "@vercel/analytics/react";

const MyApp = ({ Component, pageProps }) => {
	return (
		<>
			<Component {...pageProps} />
			<Analytics />
		</>
	);
};

export default MyApp;
```

### Viewing Vercel Analytics

1. Deploy your application to Vercel
2. Navigate to your project dashboard on [vercel.com](https://vercel.com/)
3. Click on the **Analytics** tab
4. View real-time metrics including:
   - Page views
   - Unique visitors
   - Top pages
   - Performance metrics
   - Geographic distribution

**Note:** Vercel Analytics works automatically once integrated and deployed. No additional configuration is required.

---

## Custom Analytics

The Inkgest includes a custom analytics system that tracks visitors using browser fingerprinting and IP geolocation. This data is stored in Firebase and displayed in the admin dashboard.

### API Overview

The custom analytics API is located in `lib/api/analytics.js` and provides the following methods:

#### Track Analytics

Automatically tracks visitors on app load (runs once per session):

```javascript
import { trackAnalytics } from "../lib/api/analytics";

// Called automatically by AnalyticsTracker component
trackAnalytics();
```

#### Get All Analytics

Retrieve all analytics records:

```javascript
import { getAllAnalytics } from "../lib/api/analytics";

const analytics = await getAllAnalytics();
// Returns array of analytics records with:
// - fingerprint, userAgent, location data
// - firstVisit, lastVisit, visitCount
```

#### Get Analytics by Fingerprint

Find a specific visitor by fingerprint:

```javascript
import { getAnalyticsByFingerprint } from "../lib/api/analytics";

const visitor = await getAnalyticsByFingerprint(fingerprint);
```

### Data Collected

The custom analytics system collects:

- **Browser fingerprint** (unique identifier)
- **User agent** (browser and device info)
- **IP address** and geolocation (country, city, coordinates)
- **Visit timestamps** (first visit, last visit)
- **Visit count** (number of sessions)

### Viewing Custom Analytics

1. Navigate to your admin dashboard at `/admin`
2. Click on **Analytics** in the sidebar (under "Audience" section)
3. View comprehensive analytics including:
   - **Visitors** and **Page Views** statistics
   - **Geographic distribution** map
   - **Time-based charts** (24h, 7d, 30d)
   - **Country breakdown**
   - **Top pages and referrers**

![Admin Analytics Dashboard](https://b4fcijccdw.ufs.sh/f/mVUSE925dTRYjJ3LEXS6Fu1bQOM0p4lVUeY7JgB8RswZoWSE)

**How to access:**

- Log in to your admin panel
- Navigate to **Audience** → **Analytics**
- View dashboard with visitor metrics, charts, and geographic map
- Switch between Dashboard and Map views
- Filter by time range (24h, 7d, 30d)

### Analytics Component

The analytics tracking is handled automatically by the `AnalyticsTracker` component in `lib/ui/AnalyticsTracker.jsx`, which is integrated into `pages/_app.js`. It tracks visitors once per session using sessionStorage.

---

## Summary

- **PostHog**: Session replays, event tracking, user insights (requires API key)
- **Vercel Analytics**: Web performance and visitor metrics (automatic on Vercel)
- **Custom Analytics**: Internal visitor tracking with geographic data (admin dashboard)

All three analytics systems work together to provide comprehensive insights into your application's usage and performance.
