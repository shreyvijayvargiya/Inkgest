# Admin Panel

The Admin Panel is a comprehensive content management system for Inkgest: Link to Gest. This document covers all admin features, components, and usage.

## Overview

The Admin Panel provides a centralized interface for managing:

- Blogs and content
- Email campaigns
- Subscribers
- Users and teams
- Customers and payments
- Messages and contact forms
- Invoices and billing
- Waitlist management
- Issue reporting and tracking

**Location**: `app/admin/index.jsx`

**Route**: `/admin`

## Access Control

### Authentication Required

- Users must be authenticated via Firebase Auth
- Role is checked from Firestore `teams` collection
- Permissions are enforced based on role

### Role-Based Features

- **Admin**: Full access to all features
- **Editor**: Content management, email sending
- **Author**: Create/edit own content only
- **Viewer**: Read-only access

## Navigation

### Sidebar Navigation

**Sections**:

1. **Home**: Dashboard with statistics and quick actions
2. **Blogs**: Blog post management
3. **Emails**: Email campaign management
4. **Subscribers**: Subscriber list management
5. **Users**: User management
6. **Customers**: Customer and subscription management
7. **Payments**: Payment records
8. **Invoices**: Invoice creation and management
9. **Messages**: Contact form messages
10. **Waitlist**: Waitlist member management
11. **Report Issues**: Issue tracking and resolution

**Drag and Drop Customization**:

- **Reorder Categories**: Drag category sections (Overview, Content, Audience, etc.) to change their order in the sidebar
- **Reorder Items**: Drag individual navigation items within a category to rearrange them
- **Move Between Categories**: Drag items from one category to another to reorganize your navigation structure
- **Persistent Storage**: Your custom sidebar arrangement is saved to localStorage and persists across sessions
- **Visual Feedback**: Hover over items to see the drag handle (grip icon), and items show visual feedback while dragging
- **Component**: `app/admin/components/Sidebar.jsx`

### Search

- **Shortcut**: `Cmd/Ctrl + K`
- **Component**: `app/admin/components/SearchModal.jsx`
- **Features**:
  - Search across all content types
  - Quick navigation
  - Keyboard shortcuts

## Home Tab

**Component**: `app/admin/components/HomeTab.jsx`

**Features**:

- Dashboard statistics
- Recent activity
- Quick actions
- Analytics overview

**Statistics Displayed**:

- Total blogs and published content
- Total subscribers and users
- Total customers and active subscriptions
- Revenue metrics (payments and invoices)
- Unread messages count
- Pending issues count
- Unpaid invoices
- Content creation activity (last 7 days)
- Financial summary

**Quick Actions**:

- Create new blog post
- Create new email campaign
- Create new invoice
- Add to waitlist

## Blogs Tab

**Component**: `app/admin/components/BlogTab.jsx`

### Features

1. **Blog List**
   - View all blogs
   - Filter by status (draft/published)
   - Search blogs
   - Sort by date

2. **Create Blog**
   - Click "Create New Blog"
   - Opens blog editor
   - Rich text editing with Tiptap

3. **Edit Blog**
   - Click on blog to edit
   - Update content, title, status
   - Save changes

4. **Delete Blog**
   - Delete button on blog card
   - Confirmation modal
   - Permanent deletion

5. **Publish/Unpublish**
   - Toggle publish status
   - Set published date
   - Update slug

6. **Export Data**
   - Export blogs in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes all blog metadata and content preview

### Blog Editor

**Location**: `pages/admin/editor/blog.jsx`

**Features**:

- Tiptap rich text editor
- Image upload
- Markdown support
- Character count
- Auto-save (optional)
- Preview mode

**Editor Extensions**:

- Bold, italic, underline
- Headings
- Lists (ordered, unordered)
- Links
- Images
- Blockquotes
- Code blocks
- Text alignment
- Colors
- Highlight

## Emails Tab

**Component**: `app/admin/components/EmailTab.jsx`

### Features

1. **Email List**
   - View all emails
   - Filter by status (draft/sent)
   - View recipient count
   - Search emails

2. **Create Email**
   - Rich text editor
   - Subject line
   - HTML content
   - Save as draft

3. **Send Email**
   - Send to subscribers
   - Send to users
   - Batch sending
   - Statistics tracking

4. **Email Templates**
   - Pre-built templates
   - Custom HTML
   - Responsive design

5. **Export Data**
   - Export email campaigns in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes email metadata and content preview

### Email Editor

**Location**: `pages/admin/editor/email.jsx`

**Features**:

- Tiptap editor
- HTML preview
- Send test email
- Schedule sending (future feature)

## CRON Jobs Tab

**Component**: `app/admin/components/CronJobsTab.jsx`

**API Location**: `lib/api/cronJobs.js`

**Endpoint**: `pages/api/cron/execute.js`

### Overview

CRON jobs allow you to schedule automated tasks such as:

- Publishing blog posts at a specific date and time
- Sending email campaigns to subscribers at scheduled times
- Running periodic maintenance tasks

### Features

1. **CRON Job List**
   - View all scheduled CRON jobs
   - Filter by status (scheduled/completed/failed/cancelled)
   - Filter by type (blog/email)
   - Search CRON jobs
   - Sort by scheduled date

2. **Create CRON Job**
   - Schedule blog posts for future publication
   - Schedule email campaigns for future sending
   - Set specific date and time for execution
   - Automatic execution when due

3. **CRON Job Management**
   - View job details and status
   - Cancel scheduled jobs
   - View execution history
   - Monitor failed jobs

4. **Job Execution**
   - Automatic execution via scheduled endpoint
   - Processes due jobs when endpoint is called
   - Marks jobs as completed or failed
   - Logs execution results

### Setting Up CRON Jobs

#### Method 1: Using Vercel Cron Jobs (Recommended for Vercel Deployments)

Vercel provides built-in CRON job functionality through `vercel.json`. However, **Vercel plan limits apply**:

- **Hobby Plan**: 2 CRON jobs maximum
- **Pro Plan**: 2 CRON jobs maximum
- **Enterprise Plan**: Unlimited CRON jobs

**Configuration** (`vercel.json`):

```json
{
	"crons": [
		{
			"path": "/api/cron/execute",
			"schedule": "0 0 * * *"
		}
	]
}
```

**CRON Schedule Examples**:

- `0 0 * * *` - Every day at midnight (00:00 UTC)
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1` - Every Monday at 9:00 AM UTC
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of every month at midnight
- `0 0 * * 0` - Every Sunday at midnight
- `0 12 * * *` - Every day at noon (12:00 UTC)
- `0 0,12 * * *` - Twice daily at midnight and noon

**CRON Expression Format**:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

#### Method 2: Using External CRON Services

If you've reached your Vercel CRON job limit or want more flexibility, use external services:

**Popular Options**:

1. **Cron-job.org** (Free tier available)
   - Schedule: `https://your-domain.com/api/cron/execute`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET_TOKEN`

2. **EasyCron** (Free tier available)
   - Similar setup to Cron-job.org

3. **GitHub Actions** (Free for public repos)
   - Create `.github/workflows/cron.yml`:

   ```yaml
   name: Execute CRON Jobs
   on:
     schedule:
       - cron: "0 0 * * *" # Daily at midnight UTC
   jobs:
     execute:
       runs-on: ubuntu-latest
       steps:
         - name: Call CRON endpoint
           run: |
             curl -X POST https://your-domain.com/api/cron/execute \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}"
   ```

4. **Uptime Robot** (Free tier: 50 monitors)
   - Can be configured to ping your endpoint periodically

#### Method 3: Manual Execution

You can manually trigger CRON job execution:

```bash
# Using curl
curl -X POST https://your-domain.com/api/cron/execute \
  -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"

# Using GET (for testing, if no auth token set)
curl https://your-domain.com/api/cron/execute
```

### Environment Variables

Set the following environment variable for security:

```env
CRON_SECRET_TOKEN=your-secret-token-here
```

**Security Note**: Always set `CRON_SECRET_TOKEN` in production to prevent unauthorized access to your CRON endpoint.

### How CRON Jobs Work

1. **Scheduling**: When you schedule a blog post or email in the admin panel, a CRON job is created in Firestore
2. **Execution**: The `/api/cron/execute` endpoint is called at the scheduled time (via Vercel Cron or external service)
3. **Processing**: The endpoint:
   - Fetches all scheduled CRON jobs from Firestore
   - Filters jobs that are due (scheduled date <= current time)
   - Executes each job:
     - **Blog jobs**: Publishes the blog post
     - **Email jobs**: Sends email to all active subscribers
   - Updates job status (completed/failed)
4. **Result**: Jobs are marked as completed or failed with error messages

### CRON Job Statuses

- **scheduled**: Job is waiting to be executed
- **completed**: Job executed successfully
- **failed**: Job execution failed (check error message)
- **cancelled**: Job was manually cancelled

### Troubleshooting

**CRON jobs not executing**:

1. Check if the endpoint is being called (check Vercel logs or external service logs)
2. Verify `CRON_SECRET_TOKEN` is set correctly if using authentication
3. Check Firestore for scheduled jobs with status "scheduled"
4. Verify the scheduled date is in the past or current time
5. Check Vercel function logs for errors

**Vercel CRON limit reached**:

- Remove unused CRON jobs from `vercel.json` or Vercel dashboard
- Use external CRON service as alternative
- Upgrade Vercel plan for more CRON jobs

**Jobs failing**:

- Check job error messages in the CRON Jobs tab
- Verify blog/email data is complete
- Check email service (Resend) configuration
- Verify subscriber list is not empty for email jobs

## Subscribers Tab

**Component**: `app/admin/components/SubscribersTab.jsx`

### Features

1. **Subscriber List**
   - View all subscribers
   - Filter by status (active/unsubscribed)
   - Search by email/name
   - Export list

2. **Add Subscriber**
   - Manual entry
   - Import from CSV (future)
   - Bulk import

3. **Manage Subscribers**
   - Unsubscribe
   - Resubscribe
   - Delete subscriber
   - Send email to subscriber

4. **Statistics**
   - Total subscribers
   - Active subscribers
   - Unsubscribed count
   - Growth chart

5. **Export Data**
   - Export subscribers in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes subscriber details and subscription dates

## Users Tab

**Component**: `app/admin/components/UsersTab.jsx`

### Features

1. **User List**
   - View all authenticated users
   - Filter by verification status
   - Search users
   - View user details

2. **User Management**
   - View user profile
   - See last sign-in
   - View provider (Google/Email)
   - Send email to user

3. **User Statistics**
   - Total users
   - Verified users
   - Users by provider

4. **Export Data**
   - Export users in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes user authentication details and activity

## Customers Tab

**Component**: `app/admin/components/CustomersTab.jsx`

### Features

1. **Customer List**
   - View all customers
   - Filter by subscription status
   - Search customers
   - View subscription details

2. **Customer Details**
   - Subscription plan
   - Payment status
   - Expiration date
   - Payment history

3. **Subscription Management**
   - Cancel subscription
   - View subscription details
   - Update customer info

4. **Statistics**
   - Total customers
   - Active subscriptions
   - Revenue metrics

5. **Export Data**
   - Export customers in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes customer and subscription details

## Payments Tab

**Component**: `app/admin/components/PaymentsTab.jsx`

### Features

1. **Payment List**
   - View all payments
   - Filter by status
   - Filter by customer
   - Search payments

2. **Payment Details**
   - Payment amount
   - Payment status
   - Customer information
   - Plan details
   - Payment date

3. **Statistics**
   - Total revenue
   - Successful payments
   - Failed payments
   - Revenue chart

4. **Export Data**
   - Export payments in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes payment details and transaction information

## Messages Tab

**Component**: `app/admin/components/MessagesTab.jsx`

### Features

1. **Message List**
   - View all contact form messages
   - Filter by status (new/replied)
   - Filter by read/unread status
   - Search messages
   - Sort by date

2. **View Message**
   - Full message content
   - Sender information
   - Message date
   - Read/unread status

3. **Reply to Message**
   - Reply via email
   - Include original message
   - Mark as replied
   - Mark as read
   - Send reply

4. **Export Data**
   - Export messages in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes message content and status

## Invoices Tab

**Component**: `app/admin/components/InvoiceTab.jsx`

### Features

1. **Invoice List**
   - View all invoices
   - Filter by status (paid/unpaid)
   - Search by invoice number, client name, or email
   - Sort by date, amount, status
   - View invoice details

2. **Create Invoice**
   - Select client from users, customers, or subscribers
   - Add custom email option
   - Professional invoice form with "From" and "To" sections
   - Editable items table (add/remove rows)
   - Automatic total calculation
   - Add notes and signature
   - Set invoice date and due date
   - Generate unique invoice number

3. **Invoice Management**
   - View invoice (PDF preview)
   - Edit invoice details
   - Delete invoice
   - Mark as paid/unpaid
   - Send invoice via email
   - Download invoice as PDF

4. **Invoice Details**
   - Invoice number
   - Client information
   - Itemized list
   - Subtotal and total
   - Payment status
   - Due date
   - Notes and signature

5. **Export Data**
   - Export invoices in CSV, JSON, PDF, or Excel formats
   - Export button in header
   - Includes invoice details and financial information

**API Location**: `lib/api/invoice.js`

**Components**:

- `lib/ui/CreateInvoiceModal.jsx`: Invoice creation/editing modal
- `lib/ui/InvoiceModal.jsx`: Invoice preview modal

## Waitlist Tab

**Component**: `app/admin/components/WaitlistTab.jsx`

### Features

1. **Waitlist List**
   - View all waitlist entries
   - Search by name or email
   - Sort by name, email, or join date
   - View join date

2. **Add Waitlist Member**
   - Manual entry form
   - Name and email fields
   - Email validation
   - Automatic timestamp

3. **Manage Waitlist**
   - Send message to waitlist member
   - Remove member from waitlist
   - View member details

4. **Send Message**
   - Compose message with subject/title
   - Send email to waitlist member
   - Track sent messages

**API Location**: `lib/api/waitlist.js`

## Forms Tab

**Component**: `app/admin/components/FormsTab.jsx`

**API Location**: `lib/api/forms.js`

### Features

1. **Form List**
   - View all forms
   - Search forms by title or description
   - View submission count per form
   - Create, edit, and delete forms

2. **Form Builder**
   - Visual drag-and-drop form builder
   - Add multiple field types (text, textarea, select, checkbox, radio, rating, date, signature, image)
   - Configure field properties (label, placeholder, required, validation)
   - Live preview of form
   - Publish/unpublish forms

3. **Form Submissions**
   - View all submissions for a selected form
   - View submission data in table format
   - Delete individual submissions
   - Track submission count

4. **Export Form Submissions**
   - Export submissions in CSV, JSON, PDF, or Excel formats
   - Export button available in header when viewing submissions
   - Includes all form field data and metadata
   - Automatic formatting of dates and complex data types
   - **Note**: Export is only available when viewing form submissions (not form definitions)

**Field Types Supported**:

- Text input
- Textarea (multi-line text)
- Select dropdown
- Checkbox (multiple selection)
- Radio buttons (single selection)
- Rating (star-based, 1-5 or custom)
- Date picker (custom calendar)
- Signature pad (canvas-based)
- Image upload (with thumbnail previews)

**Export Details**:

- **Data Type**: `forms` (for form submissions)
- **Exportable Fields**: All form field values, Submission ID, Form ID, Created At timestamp
- **Formats**: CSV, JSON, PDF, Excel
- **Usage**: Export form submissions for analysis, backup, or integration with CRM/analytics tools

**API Location**: `lib/api/forms.js`

## Report Issues Tab

**Component**: `app/admin/components/ReportIssuesTab.jsx`

### Features

1. **Issues List**
   - View all reported issues
   - Filter by status (all/pending/fixed)
   - Search by name, email, issue, ID, or username
   - Sort by ID, name, email, username, issue, status, or date
   - View issue details

2. **Issue Management**
   - Mark issue as fixed
   - Mark issue as pending
   - Remove issue
   - View full issue description

3. **Issue Details**
   - Reporter name and email
   - Username (if available)
   - Issue description
   - Status (pending/fixed)
   - Report date
   - Issue ID

4. **Statistics**
   - Total issues
   - Pending issues count
   - Fixed issues count

**API Location**: `lib/api/reportIssues.js`

## UI Components

### Modals

**Confirmation Modal**: `lib/ui/ConfirmationModal.jsx`

- Confirm destructive actions
- Customizable message
- Variant support (danger, info, etc.)

**Login Modal**: `lib/ui/LoginModal.jsx`

- Email/password sign in
- Google sign in
- Sign up option

**Search Modal**: `app/admin/components/SearchModal.jsx`

- Global search
- Keyboard navigation
- Quick actions

### Tables

**Table Skeleton**: `lib/ui/TableSkeleton.jsx`

- Loading state
- Consistent styling

### Forms

- Input validation
- Error handling
- Loading states
- Success feedback

### Export Dropdown

**Component**: `lib/ui/ExportDropdown.jsx`

A compact dropdown component that provides data export functionality across all admin tabs.

**Features**:

- **Multiple Export Formats**: Export data in CSV, JSON, PDF, or Excel formats
- **Compact Design**: Small, unobtrusive button that fits seamlessly into admin tabs
- **Smart Formatting**: Automatically formats data based on data type
- **Field Mapping**: Pre-configured field mappings for each data type
- **Content Handling**: Automatically strips HTML and truncates long content fields
- **Date Formatting**: Converts Firestore timestamps to readable dates
- **Error Handling**: Graceful error handling with user-friendly messages

**Usage**:

```javascript
import ExportDropdown from "../../../lib/ui/ExportDropdown";

<ExportDropdown dataType="blogs" data={sortedBlogs} />;
```

**Available Data Types**:

- `blogs` - Blog posts
- `emails` - Email campaigns
- `subscribers` - Email subscribers
- `users` - Authenticated users
- `customers` - Customers and subscriptions
- `payments` - Payment transactions
- `invoices` - Invoices
- `messages` - Contact form messages
- `waitlist` - Waitlist entries
- `analytics` - Analytics data
- `forms` - Form submissions (see Forms Tab section)

## Data Export

### Overview

The Admin Panel includes comprehensive data export functionality that allows you to export data from any tab in multiple formats. Export functionality is available via a compact dropdown button in the header of each admin tab.

**Location**: `lib/api/export/`

**Component**: `lib/ui/ExportDropdown.jsx`

### Export Formats

#### CSV Export

- **Format**: Comma-separated values
- **Compatibility**: Excel, Google Sheets, Numbers
- **Use Case**: Data analysis, spreadsheet import
- **Features**:
  - UTF-8 BOM for Excel compatibility
  - Proper CSV escaping (quotes, commas, newlines)
  - HTML content stripped and truncated
  - Firestore timestamps converted to readable dates

#### JSON Export

- **Format**: JavaScript Object Notation
- **Compatibility**: APIs, databases, data processing tools
- **Use Case**: Data migration, API integration, backup
- **Features**:
  - Pretty-printed formatting (optional)
  - Nested object support
  - ISO date format for timestamps
  - Flattened option for simple structures

#### PDF Export

- **Format**: Portable Document Format
- **Compatibility**: Universal document format
- **Use Case**: Reports, documentation, sharing
- **Features**:
  - Professional table layout
  - Automatic pagination
  - Header with title and generation date
  - Column width optimization
  - Multi-page support for large datasets

#### Excel Export

- **Format**: Microsoft Excel (.xlsx)
- **Compatibility**: Excel, Google Sheets, LibreOffice
- **Use Case**: Advanced analysis, formulas, charts
- **Features**:
  - Multi-sheet support (future)
  - Auto-sized columns
  - Preserved data types
  - Rich formatting

**Note**: Excel export requires the `xlsx` package. Install with: `npm install xlsx`

### Export by Tab

#### Blogs Tab

- **Exportable Data**: All blog posts (filtered/sorted)
- **Fields Included**: ID, Title, Slug, Author, Status, Content Preview, Banner Image, Created At, Updated At, Published At
- **Usage**: Export blog content for backup, migration, or analysis

#### Emails Tab

- **Exportable Data**: All email campaigns
- **Fields Included**: ID, Subject, Status, Content Preview, Recipients Count, Created At, Sent At
- **Usage**: Track email campaign performance, backup email templates

#### Subscribers Tab

- **Exportable Data**: All subscribers (filtered/sorted)
- **Fields Included**: ID, Name, Email, Status, Subscribed At, Unsubscribed At, Created At
- **Usage**: Export subscriber lists for external email tools, backup

#### Users Tab

- **Exportable Data**: All authenticated users
- **Fields Included**: ID, Email, Display Name, Email Verified, Provider, Created At, Last Sign In
- **Usage**: User management, analytics, migration

#### Customers Tab

- **Exportable Data**: All customers and subscriptions
- **Fields Included**: ID, Email, Name, Customer ID, Subscription ID, Plan Name, Status, Created At
- **Usage**: Customer analysis, subscription management, reporting

#### Payments Tab

- **Exportable Data**: All payment transactions
- **Fields Included**: ID, Payment ID, Customer Name, Customer Email, Amount, Currency, Status, Plan Name, Created At
- **Usage**: Financial reporting, accounting, revenue analysis

#### Invoices Tab

- **Exportable Data**: All invoices
- **Fields Included**: ID, Invoice Number, Client Name, Client Email, Total, Status, Due Date, Created At
- **Usage**: Accounting, financial reporting, client management

#### Messages Tab

- **Exportable Data**: All contact form messages (filtered)
- **Fields Included**: ID, Name, Email, Subject, Message, Status, Read, Replied, Created At
- **Usage**: Customer support tracking, message backup, analysis

#### Waitlist Tab

- **Exportable Data**: All waitlist entries
- **Fields Included**: ID, Name, Email, Joined At, Created At
- **Usage**: Waitlist management, outreach campaigns, analysis

#### Analytics Tab

- **Exportable Data**: Filtered analytics records
- **Fields Included**: ID, IP Address, Country, City, Region, User Agent, First Visit, Last Visit, Visit Count
- **Usage**: Analytics reporting, visitor analysis, data backup

#### Forms Tab

- **Exportable Data**: Form submissions for selected form
- **Fields Included**: All form field data, Submission ID, Form ID, Created At
- **Usage**: Form submission analysis, data collection, backup
- **Note**: Export is available when viewing form submissions (not form definitions)

### Export Implementation

**API Location**: `lib/api/export/`

**Files**:

- `utils.js` - Utility functions for date formatting, object flattening, HTML stripping
- `csv.js` - CSV export functions
- `json.js` - JSON export functions
- `pdf.js` - PDF export functions (uses jsPDF)
- `excel.js` - Excel export functions (uses xlsx)
- `index.js` - Main export module with unified interface

**Usage Example**:

```javascript
import { exportData } from "@/lib/api/export";

// Export blogs to CSV
await exportData("csv", "blogs", blogs, { filename: "my-blogs.csv" });

// Export to JSON
await exportData("json", "blogs", blogs, {
	filename: "my-blogs.json",
	pretty: true,
});

// Export to PDF
await exportData("pdf", "blogs", blogs, { filename: "my-blogs.pdf" });

// Export to Excel
await exportData("excel", "blogs", blogs, { filename: "my-blogs.xlsx" });
```

### Export Features

**Data Processing**:

- **Timestamp Conversion**: Firestore timestamps automatically converted to readable dates
- **HTML Stripping**: HTML content in fields like "content" or "body" is stripped for CSV/Excel
- **Content Truncation**: Long content fields are truncated (500 chars for CSV, 1000 for Excel)
- **Object Flattening**: Nested objects are flattened with dot notation (e.g., `user.name`)
- **Array Handling**: Arrays are converted to semicolon-separated strings

**Field Mappings**:

Each data type has predefined field mappings that provide user-friendly column headers:

- `id` → "ID"
- `createdAt` → "Created At"
- `email` → "Email"
- etc.

**Error Handling**:

- Validates data before export
- Shows user-friendly error messages
- Handles missing dependencies gracefully (e.g., xlsx package for Excel)
- Provides loading states during export

### Best Practices

1. **Filter Before Export**: Use search and filters to export only relevant data
2. **Large Datasets**: For very large datasets, consider filtering to reduce export size
3. **Excel Format**: Use Excel format for data that needs further analysis or formulas
4. **JSON Format**: Use JSON for data migration or API integration
5. **PDF Format**: Use PDF for reports or documentation that needs to be shared
6. **CSV Format**: Use CSV for simple spreadsheet imports

### Troubleshooting

**Excel export not working**:

- Ensure `xlsx` package is installed: `npm install xlsx`
- Check browser console for errors
- Verify data is not empty

**PDF export issues**:

- Large datasets may take time to generate
- Check browser console for jsPDF errors
- Ensure data contains valid content

**Date formatting issues**:

- Dates are automatically converted from Firestore timestamps
- If dates appear incorrect, check Firestore data structure
- ISO format used for JSON exports

## State Management

### React Query

- Server state caching
- Automatic refetching
- Optimistic updates
- Background sync

**Usage**:

```javascript
const { data, isLoading } = useQuery({
	queryKey: ["blogs"],
	queryFn: getAllBlogs,
});
```

### Redux

- Global application state
- Subscription state
- User preferences
- Persisted state

### Local State

- Component-specific state
- UI toggles
- Form inputs
- Modal states

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open search modal
- `Esc`: Close modals
- `Enter`: Submit forms
- Arrow keys: Navigate lists

## Responsive Design

### Mobile Support

- Collapsible sidebar
- Touch-friendly buttons
- Responsive tables
- Mobile navigation

### Desktop Features

- Full sidebar
- Keyboard shortcuts
- Hover states
- Multi-column layouts

## Performance Optimizations

1. **Code Splitting**: Lazy load admin components
2. **Caching**: React Query caching
3. **Pagination**: Large lists paginated
4. **Debouncing**: Search input debounced
5. **Memoization**: Expensive computations memoized

## Error Handling

### Error States

- Network errors
- Validation errors
- Permission errors
- Not found errors

### Error Display

- Toast notifications
- Error messages
- Retry options
- Fallback UI

## Best Practices

1. **Permissions**: Always check before actions
2. **Validation**: Validate inputs
3. **Feedback**: Show loading/success states
4. **Confirmation**: Confirm destructive actions
5. **Error Handling**: Handle all errors gracefully
6. **Performance**: Optimize queries and renders
7. **Accessibility**: Use semantic HTML and ARIA

## Customization

### Adding New Tabs

1. Create component in `app/admin/components/`
2. Add route in `app/admin/index.jsx`
3. Add navigation item
4. Configure permissions

### Customizing Styles

- Tailwind CSS classes
- Custom components
- Theme configuration
- Responsive breakpoints

## Troubleshooting

### Common Issues

1. **Role not updating**: Clear cache, refresh
2. **Permissions denied**: Check role in teams collection
3. **Data not loading**: Check Firebase config
4. **Editor not working**: Check Tiptap dependencies

### Debug Mode

Enable debug logging:

```javascript
console.log("User role:", userRole);
console.log("Permissions:", permissions);
```

## Environment Variables

```env
# Required for admin panel
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase vars
```

## Future Enhancements

- Analytics dashboard
- Content scheduling
- Bulk operations
- Advanced search
- Custom fields
- Workflow management
- Team collaboration
- Activity logs
