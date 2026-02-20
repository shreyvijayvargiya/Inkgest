# Documentation

Buildsaas includes a powerful, built-in documentation system that allows you to create and manage documentation for your SaaS application using Markdown files. This system is **file-based** (no database required) and **GitHub-friendly**, making it perfect for version control and collaboration.

## Overview

The Buildsaas documentation system is designed to be:

- **File-based**: All documentation is stored as Markdown (`.mdx` or `.md`) files in your repository
- **Version-controlled**: Works seamlessly with Git, allowing you to track changes and collaborate
- **No API or Database**: Everything is read directly from the filesystem at runtime
- **Versioned**: Support for multiple documentation versions (e.g., v1, v2)
- **SEO-friendly**: Automatically generates metadata and canonical URLs
- **Access-controlled**: Support for public and internal documentation

## How It Works

The documentation system reads MDX files from the `content/modules` directory and renders them on your frontend. There are two main interfaces:

1. **Public Documentation** (`/docs/[version]/[...slug]`): The customer-facing documentation site
2. **Admin Editor** (`/admin` → Docs Editor tab): The admin interface for creating and editing documentation

## File and Folder Architecture

### Directory Structure

Your documentation files are organized in the following structure:

```
content/
└── modules/
    ├── v1/                          # Version 1 documentation
    │   ├── getting-started/
    │   │   ├── intro.mdx
    │   │   └── installation.mdx
    │   ├── api/
    │   │   ├── authentication.mdx
    │   │   └── overview.mdx
    │   └── getting-started.mdx      # Root-level file
    ├── v2/                          # Version 2 documentation
    │   ├── getting-started/
    │   │   ├── intro.mdx
    │   │   └── installation.mdx
    │   ├── api/
    │   │   ├── authentication.mdx
    │   │   └── users.mdx
    │   └── advanced/
    │       ├── performance.mdx
    │       └── security.mdx
    └── ...                          # Additional versions
```

### Key Concepts

1. **Versions**: Each version (v1, v2, etc.) is a top-level directory under `content/modules/`
2. **Categories**: Folders within a version represent categories (e.g., `getting-started`, `api`, `advanced`)
3. **Files**: MDX files can be placed directly in the version root or within category folders
4. **Slugs**: The URL structure follows the file path: `/docs/v2/getting-started/intro`

### File Naming Conventions

- Use lowercase with hyphens: `getting-started.mdx`, `api-authentication.mdx`
- Files directly in version root: `getting-started.mdx` → `/docs/v2/getting-started`
- Files in categories: `api/authentication.mdx` → `/docs/v2/api/authentication`
- Index files: `api/index.mdx` → `/docs/v2/api` (acts as the category landing page)

## Frontmatter Schema

Each MDX file should include frontmatter at the top to control metadata and behavior:

```yaml
---
title: "Getting Started"
description: "Learn how to get started with our API"
sidebar_order: 1
visibility: "public"  # or "internal"
---
```

### Frontmatter Fields

- **`title`** (required): The document title displayed in the sidebar and page header
- **`description`** (optional): Meta description for SEO
- **`sidebar_order`** (optional): Number to control sorting in sidebar (lower numbers appear first)
- **`visibility`** (optional): `"public"` (default) or `"internal"` (requires authentication)

### Example Frontmatter

```yaml
---
title: "API Authentication"
description: "Learn how to authenticate API requests"
sidebar_order: 2
visibility: "public"
---

# API Authentication

Your content here...
```

## Creating Documentation

### Method 1: Using the Admin Editor (Recommended)

1. **Navigate to Admin Panel**:
   - Go to `/admin` in your application
   - Click on the **"Docs Editor"** tab in the sidebar

2. **Select a Version**:
   - Use the version dropdown at the top of the sidebar
   - Choose an existing version or create a new one by adding files to a new directory

3. **Create a Category** (optional):
   - Click **"New Category"** button
   - Enter a category name (e.g., `api`, `guides`)
   - Categories are created as folders in the version directory

4. **Create a New File**:
   - Click **"New File"** to create a file in the version root, or
   - Click the **+** icon next to a category to add a file to that category
   - Enter a file name (without extension, `.mdx` is added automatically)
   - Optionally add a title (used in frontmatter)

5. **Edit Content**:
   - Select a file from the sidebar
   - Use the Tiptap editor to write your documentation
   - Add frontmatter fields (title, description) in the form fields above the editor
   - Click **"Save"** when done

6. **Preview**:
   - Click the **"Preview"** button to see how your documentation will look on the frontend

### Method 2: Manual File Creation

1. **Create the File**:
   ```bash
   # Example: Create a new file in v2/api directory
   touch content/modules/v2/api/webhooks.mdx
   ```

2. **Add Frontmatter**:
   ```yaml
   ---
   title: "Webhooks"
   description: "Learn how to use webhooks"
   sidebar_order: 3
   visibility: "public"
   ---
   ```

3. **Write Content**:
   Use standard Markdown syntax:
   ```markdown
   # Webhooks

   Webhooks allow you to receive real-time updates...

   ## Setting Up Webhooks

   1. Navigate to your dashboard
   2. Go to Settings → Webhooks
   3. Add a webhook URL
   ```

4. **Save and Commit**:
   ```bash
   git add content/modules/v2/api/webhooks.mdx
   git commit -m "Add webhooks documentation"
   ```

## Markdown Features

The documentation system supports standard Markdown with additional features:

### Standard Markdown

- **Headings**: `# H1`, `## H2`, `### H3`
- **Bold**: `**bold text**`
- **Italic**: `*italic text*`
- **Links**: `[text](url)`
- **Lists**: Ordered and unordered
- **Code blocks**: Triple backticks with language specification
- **Tables**: Standard Markdown table syntax

### Code Blocks

Use fenced code blocks with language specification:

````markdown
```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

```bash
npm install package-name
```

```json
{
  "key": "value"
}
```
````

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

## Publishing Documentation to Frontend

### Automatic Publishing

Once you save a file (via Admin Editor or manually), it's automatically available on the frontend:

1. **Public Documentation Route**: `/docs/[version]/[...slug]`
   - Example: `/docs/v2/getting-started/intro`
   - Example: `/docs/v2/api/authentication`

2. **Version Detection**: The system automatically detects available versions from the `content/modules` directory

3. **Sidebar Generation**: The sidebar is automatically generated from your file structure, respecting:
   - `sidebar_order` for sorting
   - `visibility` for access control
   - Folder structure for grouping

### URL Structure

The URL structure follows your file structure:

```
File: content/modules/v2/getting-started/intro.mdx
URL:  /docs/v2/getting-started/intro

File: content/modules/v2/api/authentication.mdx
URL:  /docs/v2/api/authentication

File: content/modules/v2/getting-started.mdx
URL:  /docs/v2/getting-started
```

### Version Selector

Users can switch between versions using the version dropdown in the documentation sidebar. When switching:

- If the same slug exists in the new version, it navigates to that page
- Otherwise, it navigates to the version root

### SEO and Metadata

Each documentation page automatically includes:

- **Title**: From frontmatter `title`
- **Description**: From frontmatter `description`
- **Canonical URL**: Automatically generated
- **Noindex**: Applied to `internal` visibility documents

## Best Practices

### 1. Organize by Version

Keep different versions in separate directories:
- `v1/` for version 1 documentation
- `v2/` for version 2 documentation
- Use semantic versioning or date-based versions

### 2. Use Categories Wisely

Group related documentation into categories:
- `getting-started/` for onboarding content
- `api/` for API reference
- `guides/` for tutorials
- `advanced/` for complex topics

### 3. Consistent Naming

- Use lowercase with hyphens: `api-authentication.mdx`
- Be descriptive: `getting-started.mdx` not `intro.mdx`
- Use `index.mdx` for category landing pages

### 4. Frontmatter Best Practices

- Always include a `title`
- Add `description` for SEO
- Use `sidebar_order` to control navigation flow
- Set `visibility: "internal"` for private docs

### 5. Content Structure

- Start with an H1 heading
- Use H2 for main sections
- Use H3 for subsections
- Keep paragraphs concise
- Include code examples where relevant

### 6. Version Management

- Create a new version directory when making breaking changes
- Keep old versions for reference
- Update the default version in your app configuration

## Access Control

### Public Documentation

By default, all documentation is public. Set `visibility: "public"` or omit the field:

```yaml
---
title: "Public Guide"
visibility: "public"
---
```

### Internal Documentation

For documentation that should only be accessible to authenticated users:

```yaml
---
title: "Internal API Docs"
visibility: "internal"
---
```

**Note**: The access control check is a stub in the current implementation. You'll need to implement your authentication logic in `lib/docs/access.ts`.

## Troubleshooting

### File Not Appearing in Sidebar

1. Check that the file has valid frontmatter with a `title`
2. Verify the file is in the correct version directory
3. Ensure the file has a `.mdx` or `.md` extension
4. Check that `sidebar_order` is set correctly

### 404 Error on Documentation Page

1. Verify the file exists at the expected path
2. Check the URL matches the file structure
3. Ensure the version directory exists
4. Check for typos in the slug

### Changes Not Reflecting

1. If using Admin Editor, refresh the page
2. If manually editing, ensure the file is saved
3. Check that the dev server has reloaded
4. Clear browser cache if needed

## Advanced: Custom Components

MDX files support React components. You can create custom components in your documentation:

```mdx
import { Alert } from '@/components/Alert';

<Alert type="warning">
  This is a warning message.
</Alert>
```

**Note**: Custom component support depends on your MDX configuration. Check `lib/docs/mdx.tsx` for available components.

## Summary

The Buildsaas documentation system provides a powerful, file-based approach to managing documentation:

- ✅ **No database required** - Everything is file-based
- ✅ **Git-friendly** - Perfect for version control
- ✅ **Version support** - Multiple documentation versions
- ✅ **Admin editor** - Easy content management
- ✅ **SEO optimized** - Automatic metadata generation
- ✅ **Access control** - Public and internal docs

Start creating your documentation by navigating to `/admin` → **Docs Editor** tab, or manually create files in `content/modules/`.
