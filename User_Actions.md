# Source Hunter - Developer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Environment Configuration](#environment-configuration)
5. [Development Setup](#development-setup)
6. [Project Structure](#project-structure)
7. [Available Scripts](#available-scripts)
8. [Build & Deployment](#build--deployment)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Development Workflow](#development-workflow)
12. [API Integration](#api-integration)
13. [Database & Persistence](#database--persistence)

---

## Project Overview

**Source Hunter** is a React-based web application built with Vite, TypeScript, and modern web technologies. The application helps users track, analyze, and manage search history with integrated analytics capabilities.

### Key Technologies
- **React 19.2.3** - UI framework
- **TypeScript 5.8.2** - Type-safe JavaScript
- **Vite 6.2.0** - Build tool and dev server
- **Dexie 4.2.1** - IndexedDB wrapper for client-side storage
- **Lucide React** - Icon library
- **date-fns** - Date manipulation utilities

### Application Features
- Real-time search tracking
- Analytics dashboard with visualizations
- Search history management
- Tab-based navigation system
- Local data persistence using IndexedDB
- Gemini AI integration for enhanced search capabilities

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

### Required Tools

1. **Node.js** (v18.0.0 or higher recommended)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git** (for version control)
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

### Optional but Recommended

- **VS Code** or preferred code editor
- **Chrome DevTools** for debugging

### API Keys Required

- **Gemini API Key** - Required for AI-powered search features
  - Get your key from [Google AI Studio](https://ai.studio/)
  - This key must be set in your environment variables (see [Environment Configuration](#environment-configuration))

---

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd source-hunter
```

### Step 2: Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install:
- All production dependencies (React, TypeScript, Dexie, etc.)
- All development dependencies (Vite, type definitions, etc.)

**Expected output:** Installation should complete in 1-3 minutes depending on your internet connection.

### Step 3: Verify Installation

Ensure `node_modules` directory was created:

```bash
ls node_modules
```

You should see folders like `react`, `vite`, `typescript`, etc.

---

## Environment Configuration

### Setting Up Environment Variables

The application requires a Gemini API key to function properly. Follow these steps:

1. **Locate the Environment File**
   - The project includes a `.env.local` file in the root directory
   - This file is already in `.gitignore` to prevent accidental commits of sensitive data

2. **Configure Your API Key**

   Open `.env.local` in your text editor:

   ```bash
   # Linux/Mac
   nano .env.local

   # Windows
   notepad .env.local
   ```

   Update the file with your actual API key:

   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Get Your Gemini API Key**

   - Visit [Google AI Studio](https://ai.studio/)
   - Sign in with your Google account
   - Create a new API key or use an existing one
   - Copy the API key and paste it into `.env.local`

4. **Verify Configuration**

   The application loads the API key through Vite's environment system (configured in `vite.config.ts`):

   ```typescript
   define: {
     'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
     'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
   }
   ```

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Gemini AI API key for search functionality |

---

## Development Setup

### Starting the Development Server

Once dependencies are installed and environment variables are configured:

```bash
npm run dev
```

**Expected Output:**
```
  VITE v6.2.0  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Accessing the Application

1. **Local Access**
   - Open your browser and navigate to: `http://localhost:3000`
   - The application should load with the main dashboard

2. **Network Access** (if needed)
   - The dev server is configured to listen on `0.0.0.0`
   - Access from other devices on your network using your computer's IP address

### Development Server Features

- **Hot Module Replacement (HMR)** - Changes appear instantly without full page reload
- **Fast Refresh** - React component state is preserved during edits
- **Type Checking** - TypeScript errors are shown in the browser and terminal
- **Source Maps** - Full debugging support in browser DevTools

### Development Server Options

The development server runs on:
- **Port:** 3000 (configured in `vite.config.ts`)
- **Host:** 0.0.0.0 (allows network access)

To change the port, modify `vite.config.ts`:

```typescript
server: {
  port: 3001, // Change to your preferred port
  host: '0.0.0.0',
}
```

---

## Project Structure

```
source-hunter/
├── .automaker/              # Auto-maker configuration and metadata
├── components/              # React components
│   ├── Analytics.tsx       # Analytics dashboard component
│   ├── CommentCard.tsx     # Comment display card
│   ├── Dashboard.tsx       # Main dashboard
│   ├── History.tsx         # Search history view
│   ├── Settings.tsx        # Application settings
│   └── TabNavigation.tsx   # Tab navigation system
├── hooks/                   # Custom React hooks
├── services/                # Business logic and services
├── tests/                   # Test files
├── App.tsx                  # Main application component
├── db.ts                    # Dexie database configuration
├── types.ts                 # TypeScript type definitions
├── index.html               # Entry HTML file
├── index.tsx                # Application entry point
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Project dependencies and scripts
├── .env.local               # Environment variables (not in git)
└── README.md                # Project overview
```

### Key Files Explained

- **App.tsx** - Root component managing routing and global state
- **db.ts** - IndexedDB database setup using Dexie
- **types.ts** - Shared TypeScript interfaces and types
- **vite.config.ts** - Build configuration, plugins, and environment variables

---

## Available Scripts

The project includes several npm scripts for development and building:

### Development

```bash
npm run dev
```
Starts the Vite development server with HMR enabled.

### Build

```bash
npm run build
```
Creates an optimized production build in the `dist/` directory.

**Output:**
```
vite v6.2.0 building for production...
✓ xxx modules transformed.
dist/index.html                  0.xx kB
dist/assets/index-xxxxxx.css     xx.xx kB
dist/assets/index-xxxxxx.js      xxx.xx kB
```

### Preview

```bash
npm run preview
```
Locally preview the production build before deploying.

**Output:**
```
  VITE v6.2.0  ready in xxx ms

  ➜  Local:   http://localhost:4173/
```

---

## Build & Deployment

### Building for Production

1. **Run the Build Command**

   ```bash
   npm run build
   ```

2. **Build Output**

   The build process creates a `dist/` directory containing:
   - `index.html` - Entry HTML file
   - CSS bundles - Optimized and minified stylesheets
   - JS bundles - Optimized and minified JavaScript
   - Asset files - Images, fonts, and other static assets

3. **Preview the Build**

   ```bash
   npm run preview
   ```

   This serves the production build locally for testing.

### Deployment Options

#### Static Hosting (Recommended)

The application can be deployed to any static hosting service:

**Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**GitHub Pages**
```bash
# Install gh-pages
npm install -g gh-pages

# Deploy
gh-pages -d dist
```

#### Environment Variables in Production

When deploying, ensure you set the `GEMINI_API_KEY` in your hosting platform's environment settings:

- **Netlify:** Site Settings → Environment Variables
- **Vercel:** Project Settings → Environment Variables
- **GitHub Pages:** Must be set in the build process or use a different approach

### Build Optimization Tips

1. **Code Splitting** - Vite automatically splits code for optimal loading
2. **Tree Shaking** - Unused code is automatically removed
3. **Asset Optimization** - Images and assets are optimized during build
4. **CSS Minification** - Styles are automatically minified

---

## Testing

### Current Testing Setup

The project includes a `tests/` directory for test files.

### Running Tests

Check if tests are configured in `package.json`. If test scripts are added:

```bash
# Example (if configured)
npm test
```

### Manual Testing Checklist

Before deploying, manually verify:

- [ ] Application loads without errors
- [ ] All tabs navigate correctly
- [ ] Search functionality works
- [ ] Analytics display correctly
- [ ] Data persists across page reloads
- [ ] Settings save and load properly
- [ ] Responsive design works on mobile

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill the process using port 3000 (Linux/Mac)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port in vite.config.ts
```

#### Issue 2: Module Not Found Errors

**Error:** `Error: Cannot find module 'module-name'`

**Solution:**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Issue 3: API Key Not Working

**Error:** API calls failing with 401/403 errors

**Solution:**
- Verify your API key is correct in `.env.local`
- Ensure the API key has proper permissions
- Restart the dev server after changing `.env.local`
- Check that the API key doesn't have extra spaces or quotes

#### Issue 4: TypeScript Errors

**Error:** Type errors in VS Code or terminal

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Press: Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
# Type: "TypeScript: Restart TS Server"

# Or rebuild
rm -rf node_modules/.vite
npm run dev
```

#### Issue 5: Hot Module Replacement Not Working

**Error:** Changes not reflecting in browser

**Solution:**
- Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
- Restart the dev server
- Check browser console for WebSocket errors
- Try a different browser

#### Issue 6: Database Issues

**Error:** IndexedDB errors or data not persisting

**Solution:**
- Clear browser data for localhost
- Check browser's IndexedDB storage in DevTools
- Verify database schema in `db.ts` matches usage
- Check browser console for specific errors

### Getting Help

If you encounter issues not covered here:

1. Check the browser console for error messages
2. Check the terminal where `npm run dev` is running
3. Review the Vite documentation: https://vitejs.dev/
4. Review React documentation: https://react.dev/
5. Check Dexie documentation: https://dexie.org/

---

## Development Workflow

### Recommended Workflow

1. **Start Development**
   ```bash
   npm run dev
   ```

2. **Make Changes**
   - Edit components in `components/`
   - Update types in `types.ts`
   - Modify database schema in `db.ts`

3. **See Changes**
   - Browser automatically updates (HMR)
   - TypeScript errors appear inline

4. **Test Changes**
   - Manually test the feature
   - Check browser console for errors
   - Verify data persistence

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

### Code Style Guidelines

- Use TypeScript for all new files
- Follow existing component patterns
- Use functional components with hooks
- Keep components focused and reusable
- Add proper TypeScript types for props and state

### File Naming Conventions

- Components: PascalCase (e.g., `Dashboard.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useAnalytics.ts`)
- Services: camelCase (e.g., `apiService.ts`)
- Types: camelCase (e.g., `types.ts`)

### Git Workflow

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make and commit changes
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

3. Push and create PR
   ```bash
   git push origin feature/your-feature-name
   ```

---

## API Integration

### Gemini API Setup

The application integrates with Google's Gemini AI for enhanced search capabilities.

### API Usage

The API key is loaded through environment variables:

```typescript
// Access in your code
const apiKey = process.env.GEMINI_API_KEY;
```

### API Endpoints

The application uses Gemini API for:
- Search result enhancement
- Query analysis
- Content generation

### API Error Handling

Always handle API errors gracefully:

```typescript
try {
  // API call
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
}
```

---

## Database & Persistence

### Database Technology

The application uses **IndexedDB** via **Dexie** for client-side data persistence.

### Database Schema

The database is configured in `db.ts`:

```typescript
// Tables and their structure
// See db.ts for complete schema
```

### Common Database Operations

**Adding Data:**
```typescript
await db.tableName.add({ /* data */ });
```

**Querying Data:**
```typescript
const results = await db.tableName.toArray();
```

**Updating Data:**
```typescript
await db.tableName.update(id, { /* updates */ });
```

**Deleting Data:**
```typescript
await db.tableName.delete(id);
```

### Viewing Database Data

1. Open Chrome DevTools (F12)
2. Go to Application tab
3. Expand IndexedDB
4. Select your database
5. Browse tables and data

### Database Debugging

If data isn't persisting:

1. Check browser console for errors
2. Verify database operations in DevTools
3. Ensure await is used for async operations
4. Check that database schema matches usage

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking (if configured)
npm run type-check
```

### Important Files

- `.env.local` - Environment variables (API keys)
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts
- `db.ts` - Database setup
- `types.ts` - Type definitions

### Default Ports

- Development: `3000`
- Preview: `4173`

---

## Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Dexie Documentation](https://dexie.org/)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

## Support

For issues or questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Check the browser console and terminal
4. Consult the official documentation for each technology

---

**Last Updated:** January 2026

**Version:** 0.0.0

---

## Tips for New Developers

1. **Start with the basics** - Get the app running locally first
2. **Use TypeScript** - It prevents many runtime errors
3. **Check the console** - Always keep browser DevTools open
4. **Read error messages** - They usually tell you exactly what's wrong
5. **Use git branches** - Keep main branch clean
6. **Test frequently** - Don't wait until the end to test
7. **Ask questions** - Don't struggle alone if stuck

Good luck with your development! 🚀
