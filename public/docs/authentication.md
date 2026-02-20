# Authentication

Inkgest: Link to Gest uses Firebase Authentication for user management with role-based access control (RBAC). This document covers authentication setup, implementation, and role management.

## Authentication Provider: Firebase

Firebase Authentication provides secure, scalable user authentication with multiple sign-in methods.

### Setup

1. **Enable Firebase Authentication**
   - Go to Firebase Console → Authentication
   - Enable Email/Password provider
   - Enable Google provider (optional)
   - Configure authorized domains

2. **Configure Firebase**
   - Get Firebase config from Project Settings
   - Add to `.env.local`:

   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **Initialize Firebase**
   - Firebase is initialized in `lib/config/firebase.js`
   - Services: Authentication, Firestore, Storage

## Authentication Methods

### Email/Password Authentication

**Sign Up**:

```javascript
import { signUpWithEmail } from "../lib/api/auth";

const user = await signUpWithEmail(
	"user@example.com",
	"password123",
	"User Name",
);
```

**Sign In**:

```javascript
import { signInWithEmail } from "../lib/api/auth";

const user = await signInWithEmail("user@example.com", "password123");
```

**Implementation**: `lib/api/auth.js`

**UI Components**:

- Signup: `lib/ui/SignupModal.jsx`
- Login: `lib/ui/LoginModal.jsx`

### Google OAuth Authentication

**Sign In with Google**:

```javascript
import { signInWithGoogle } from "../lib/api/auth";

const user = await signInWithGoogle();
```

**Process**:

1. Opens Google sign-in popup
2. User authenticates with Google
3. User data saved to Firestore
4. Returns Firebase user object

**UI Component**: `lib/ui/LoginModal.jsx` (includes Google sign-in button)

## User Data Management

### User Storage

Users are stored in two places:

1. **Firebase Auth**: Authentication data
   - UID, email, display name
   - Provider information
   - Email verification status

2. **Firestore `users` Collection**: Extended user data
   ```javascript
   {
     uid: "firebase_uid",
     email: "user@example.com",
     name: "User Name",
     displayName: "User Name",
     provider: "google" | "email",
     photoURL: "url_or_null",
     emailVerified: true | false,
     lastSignIn: "Timestamp",
     createdAt: "Timestamp",
     updatedAt: "Timestamp"
   }
   ```

### Saving User to Firestore

**Function**: `saveUserToFirestore(user, provider)`

**Location**: `lib/api/auth.js`

**Process**:

1. Check if user exists
2. Update existing or create new document
3. Store provider information
4. Update timestamps

## Role-Based Access Control (RBAC)

### Role System

Roles are stored in Firestore `teams` collection, not in Firebase Auth.

**Collection**: `teams`

```javascript
{
  id: "document_id",
  email: "user@example.com",
  username: "optional_username",
  role: "admin" | "editor" | "author" | "viewer",
  createdAt: "Timestamp",
  updatedAt: "Timestamp"
}
```

### Available Roles

1. **Admin**
   - Full access to all features
   - User and team management
   - Can publish content
   - Can send emails

2. **Editor**
   - Content management (blogs, emails)
   - Can publish content
   - Can send emails
   - No user management

3. **Author**
   - Create and edit own content
   - Cannot publish
   - Cannot send emails
   - View-only for other resources

4. **Viewer**
   - Read-only access
   - Cannot create or edit
   - Cannot publish or send

### Role Configuration

**Location**: `lib/config/roles-config.js`

**Structure**:

```javascript
export const ROLES = {
  ADMIN: "admin",
  EDITOR: "editor",
  AUTHOR: "author",
  VIEWER: "viewer"
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: { ... },
  [ROLES.EDITOR]: { ... },
  // ... other roles
};
```

### Getting User Role

**Function**: `getUserRole(email, useCache)`

**Location**: `lib/utils/getUserRole.js`

**Process**:

1. Check teams collection by email
2. Return role or default to "viewer"
3. Cache result for performance

**Usage**:

```javascript
import { getUserRole } from "../lib/utils/getUserRole";

const role = await getUserRole("user@example.com");
```

### Checking Permissions

**Function**: `hasPermission(role, resource, action)`

**Location**: `lib/config/roles-config.js`

**Usage**:

```javascript
import { hasPermission } from "../lib/config/roles-config";

const canEdit = hasPermission(userRole, "blogs", "edit");
const canPublish = hasPermission(userRole, "blogs", "publish");
```

## Authentication State

### Listening to Auth Changes

**Function**: `onAuthStateChange(callback)`

**Location**: `lib/api/auth.js`

**Usage**:

```javascript
import { onAuthStateChange } from "../lib/api/auth";

const unsubscribe = onAuthStateChange((user) => {
	if (user) {
		// User is signed in
		console.log("User:", user.email);
	} else {
		// User is signed out
	}
});

// Cleanup
unsubscribe();
```

### Getting Current User

**Function**: `getCurrentUser()`

**Location**: `lib/api/auth.js`

**Usage**:

```javascript
import { getCurrentUser } from "../lib/api/auth";

const user = await getCurrentUser();
if (user) {
	console.log("Current user:", user.email);
}
```

## Session Management

### Cookies

User session data is stored in cookies for persistence. Both LoginModal and SignupModal automatically manage cookies on authentication.

**Location**: `lib/utils/cookies.js`

**Functions**:

```javascript
// Set user cookie
setUserCookie(userData);

// Get user cookie
getUserCookie();

// Remove user cookie
removeUserCookie();
```

**Cookie Structure**:

```javascript
{
  uid: "firebase_uid",
  email: "user@example.com",
  displayName: "User Name",
  photoURL: "url_or_null",
  provider: "google" | "email"
}
```

**Modal Cookie Management**:

- **LoginModal**: Sets cookie on successful login, removes on logout
- **SignupModal**: Sets cookie on successful signup
- Both modals check for existing cookies on mount to restore user state
- Cookies are automatically synced with Firebase auth state changes

## Sign Out

**Function**: `signOutUser()`

**Location**: `lib/api/auth.js`

**Usage**:

```javascript
import { signOutUser } from "../lib/api/auth";

await signOutUser();
// User is signed out
// Cookie is removed
// State is cleared
```

## Authentication UI Components

### Login Modal

**Component**: `lib/ui/LoginModal.jsx`

**Location**: `lib/ui/LoginModal.jsx`

**Features**:

- Email/Password sign in
- Google OAuth sign in
- Integrated SignupModal navigation
- User account display when logged in
- Logout functionality
- Real-time auth state management
- Cookie-based session persistence
- Toast notifications for user feedback
- Loading states and error handling
- Framer Motion animations

**Props**:

```javascript
<LoginModal
  isOpen={boolean}      // Controls modal visibility
  onClose={function}     // Callback when modal closes
/>
```

**Usage**:

```javascript
import LoginModal from "../lib/ui/LoginModal";

const [showLoginModal, setShowLoginModal] = useState(false);

<LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />;
```

**Functionality**:

1. **Email/Password Login**: Validates and authenticates users
2. **Google OAuth**: Opens Google sign-in popup
3. **User State Display**: Shows user profile when authenticated
4. **Signup Navigation**: Links to SignupModal for new users
5. **Auth State Listener**: Automatically updates on auth changes
6. **Cookie Management**: Persists user session in cookies
7. **Logout**: Signs out user and clears session

**User Display**:
When a user is logged in, the modal displays:

- User avatar (or default icon)
- Display name
- Email address
- Authentication provider (Google/Email)
- Logout button

**Integration Points**:

- Used in `app/components/Navbar.jsx` for main navigation
- Used in `pages/pricing.js` for subscription access
- Can be integrated in any page component

### Signup Modal

**Component**: `lib/ui/SignupModal.jsx`

**Location**: `lib/ui/SignupModal.jsx`

**Features**:

- Email/Password sign up
- Full name (displayName) input
- Password validation (minimum 6 characters)
- Real-time error display
- Success state display
- Cookie-based session persistence
- Toast notifications
- Loading states
- Framer Motion animations
- Automatic modal close on success

**Props**:

```javascript
<SignupModal
  isOpen={boolean}      // Controls modal visibility
  onClose={function}     // Callback when modal closes
/>
```

**Usage**:

```javascript
import SignupModal from "../lib/ui/SignupModal";

const [showSignupModal, setShowSignupModal] = useState(false);

<SignupModal
	isOpen={showSignupModal}
	onClose={() => setShowSignupModal(false)}
/>;
```

**Form Fields**:

1. **Full Name** (displayName): Required text input
2. **Email**: Required email input with validation
3. **Password**: Required password input (minimum 6 characters)

**Validation**:

- All fields are required
- Password must be at least 6 characters
- Email format validation
- Error messages displayed inline

**Success Flow**:

1. User submits signup form
2. Account created in Firebase Auth
3. User data saved to Firestore
4. Cookie set with user data
5. Success message displayed
6. Modal automatically closes
7. User is logged in

**Error Handling**:

- Displays error messages in red alert box
- Shows toast notifications for errors
- Handles "email already exists" gracefully
- Clears errors when user types

**Integration**:

- Automatically opened from LoginModal's "sign up" link
- Can be used standalone in any component

### Modal Workflow

**User Signup Flow**:

1. User clicks "Get Started" or "Sign Up" button
2. SignupModal opens
3. User fills in name, email, and password
4. Form validates input (password min 6 characters)
5. Account created in Firebase Auth
6. User data saved to Firestore via `saveUserToFirestore()`
7. Cookie set with user data
8. Auth state listener triggers
9. Success message displayed
10. Modal closes automatically
11. User is logged in and session persists

**User Login Flow**:

1. User clicks "Get Started" or "Login" button
2. LoginModal opens
3. User can choose:
   - **Email/Password**: Enter credentials and submit
   - **Google OAuth**: Click Google button (opens popup)
4. Authentication succeeds
5. Cookie set with user data
6. Auth state listener triggers
7. Modal updates to show user account info
8. User can logout from modal or continue using app

**Modal Navigation**:

- LoginModal includes "sign up" link that closes LoginModal and opens SignupModal
- SignupModal closes automatically on successful signup
- Both modals can be opened independently

**State Synchronization**:

- Both modals use `onAuthStateChange()` to listen for Firebase auth changes
- React Query cache (`["currentUser"]`) is updated on auth changes
- Cookies are synced with Firebase auth state
- User state is shared across all components using the same query key

### Modal Integration in Pages

**Navbar Integration** (`app/components/Navbar.jsx`):

```javascript
import LoginModal from '../../lib/ui/LoginModal';

const [showLoginModal, setShowLoginModal] = useState(false);

// Trigger from "Get Started" button
<button onClick={() => setShowLoginModal(true)}>
  Get Started
</button>

<LoginModal
  isOpen={showLoginModal}
  onClose={() => setShowLoginModal(false)}
/>
```

**Pricing Page Integration** (`pages/pricing.js`):

```javascript
import LoginModal from "../lib/ui/LoginModal";

// Modal opens when user tries to subscribe without being logged in
<LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />;
```

**User State Management**:
Both modals use React Query for user state management:

- Checks cookies on mount
- Sets up Firebase auth state listeners
- Updates React Query cache on auth changes
- Shares user state across components via query key `["currentUser"]`

## Admin Panel Authentication

### Protected Routes

Admin routes check authentication:

1. Check Firebase Auth state
2. Get user role from teams collection
3. Check permissions
4. Redirect if unauthorized

**Implementation**: `app/admin/index.jsx`

## Email Verification

### Checking Verification

```javascript
const user = auth.currentUser;
if (user && user.emailVerified) {
	// Email is verified
}
```

### Sending Verification Email

Firebase automatically sends verification emails on sign up. You can also send manually:

```javascript
import { sendEmailVerification } from "firebase/auth";

await sendEmailVerification(auth.currentUser);
```

## Password Reset

### Sending Reset Email

```javascript
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../utils/firebase";

await sendPasswordResetEmail(auth, "user@example.com");
```

## Security Best Practices

1. **Environment Variables**: Never commit Firebase config
2. **HTTPS**: Always use HTTPS in production
3. **Email Verification**: Verify emails for sensitive operations
4. **Role Validation**: Always check roles server-side
5. **Session Management**: Use secure cookies
6. **Error Handling**: Don't expose sensitive error details
7. **Rate Limiting**: Implement rate limiting for auth endpoints

## Firebase Security Rules

### Firestore Rules

Example rules for user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: Read own data, write own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Teams: Read if authenticated, write if admin
    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/teams/$(request.auth.token.email)).data.role == 'admin';
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **User not found in teams**: Add user to teams collection with role
2. **Role not updating**: Clear cache or wait for refresh
3. **Sign in fails**: Check Firebase config and enabled providers
4. **Cookie not persisting**: Check cookie settings and domain

### Debugging

```javascript
// Check current user
console.log(auth.currentUser);

// Check user role
const role = await getUserRole("user@example.com");
console.log("Role:", role);

// Check permissions
const canEdit = hasPermission(role, "blogs", "edit");
console.log("Can edit:", canEdit);
```

## Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## API Functions Reference

**Location**: `lib/api/auth.js`

- `signInWithGoogle()`: Sign in with Google
- `signInWithEmail(email, password)`: Sign in with email
- `signUpWithEmail(email, password, displayName)`: Sign up
- `signOutUser()`: Sign out
- `getCurrentUser()`: Get current user
- `onAuthStateChange(callback)`: Listen to auth changes
- `saveUserToFirestore(user, provider)`: Save user data
- `getUserFromFirestore(uid)`: Get user from Firestore
