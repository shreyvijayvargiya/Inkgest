# Inkgest

AI-powered newsletter drafting tool. Paste URLs, get a structured draft, edit it in the browser, and save it to your account.

## Stack

- **Next.js** — framework
- **Firebase** — auth + Firestore database
- **Redux** — user session state
- **React Query** — server state / data fetching
- **Firecrawl** — URL scraping
- **OpenRouter** — AI draft generation
- **Polar** — payments / subscriptions
- **PostHog** — analytics

---

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd inkgest
npm install
```

### 2. Create `.env.local`

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Google (for Google Sign-In)
NEXT_PUBLIC_GOOGLE_API_KEY=

# App URL
NEXT_PUBLIC_DOMAIN=http://localhost:3000

# AI & scraping
OPENROUTER_API_KEY=
FIRECRAWL_API_KEY=

```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Where to get each key

| Key        | Where                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| Firebase   | [console.firebase.google.com](https://console.firebase.google.com) → new project → Web app |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys)                                           |
| Firecrawl  | [firecrawl.dev](https://www.firecrawl.dev)                                                 |

---
