# Contributing to Source Hunter

Thank you for your interest in contributing to Source Hunter! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive community for all contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates.

When creating a bug report, include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment (browser, OS, Node.js version)
- Any relevant error messages from the browser console

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:
- A clear description of the proposed feature
- Use cases and benefits
- Potential implementation approach (if you have ideas)
- Any relevant examples or references

### Pull Requests

1. **Fork the repository** and create your branch from `master`
2. **Make your changes** following our coding standards
3. **Write tests** if applicable
4. **Update documentation** if you've changed functionality
5. **Commit your changes** with clear, descriptive messages
6. **Push to your fork** and submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/source-hunter.git
cd source-hunter

# Install dependencies
npm install

# Start development server
npm run dev

# Enter your YouTube Data API key through the Settings UI when prompted
```

## Coding Standards

### TypeScript

- All code must be written in TypeScript
- Avoid using `any` type – use proper type definitions or `unknown`
- Define interfaces for complex data structures in [types.ts](types.ts)

### React

- Use functional components with hooks
- Keep components small and focused
- Use prop interfaces for component props
- Follow the existing component patterns

### Styling

- Use Tailwind CSS utility classes
- Follow the existing color scheme and design patterns
- Ensure responsive design for mobile devices

### File Naming

- Components: PascalCase (e.g., `Dashboard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTabPersistence.ts`)
- Services: camelCase (e.g., `analysisService.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)

## Commit Message Guidelines

We follow a conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(analytics): add daily activity chart
fix(dashboard): prevent duplicate comment fetching
docs(readme): update installation instructions
refactor(scanning): extract scan logic to service
```

## Project Structure Overview

```
source-hunter/
├── components/      # React UI components
├── hooks/          # Custom React hooks
├── services/       # Business logic and API calls
├── App.tsx         # Root application component
├── db.ts           # IndexedDB setup (Dexie)
├── types.ts        # Shared TypeScript interfaces
└── index.tsx       # Application entry point
```

## Questions?

Feel free to open an issue with the `question` label if you need clarification or guidance.

---

Thank you for contributing to Source Hunter! 🎉
