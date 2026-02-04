<div align="center">

# Source Hunter

**A powerful YouTube comment analysis tool for finding source of the video/short or search for other stuff from the comments section.**

[![React](https://img.shields.io/badge/React-19.2.3-%2361DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-%233178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-%23646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**There is a hosted version as well, if you just want to start using it - [yt-source-hunter.pages.dev](https://yt-source-hunter.pages.dev)**

</div>


---

## Overview

**Source Hunter** is a web application that helps you hunt for the **Movie/Anime/Drama** or search for other source of information from YouTube comments section. Source Hunter makes it easy to search, analyze, and organize YouTube comment data.

We always come through Youtube videos/shorts where creators do not mention the name of the **Movie/Anime/Drama** but the comment section sometimes has the answer. This tool was mainly made for this purpose. we have been using it for a while and it works wonders, so we wanted to share it with you all as well. 

### Key Features

- **Local Persistence**⭐⭐ – All data stored locally using IndexedDB (no server required)
- **Smart Comment Extraction** – Fetches comments from any YouTube video or Short using the YouTube Data API
- **Quick Search**⭐ - Search across extracted comment to find the content you need
- **Source Detection** ⭐ – Automatically highlights URLs, sources, and references within comments
- **Deep Scanning Modes** ⭐ – Choose between quick top-level scans or comprehensive deep scans with replies
- **Search History** ⭐ – Automatically tracks your searched videos for quick access
- **Analytics Dashboard** – Visualize your usage patterns and scanning statistics
- **Tab-Based Navigation** – Clean, intuitive interface for searching, history, and analytics
- **Responsive Design** – Works seamlessly on desktop and mobile devices

---

## Support

If you find this project useful, consider giving it a ⭐ to show your support!

For issues, questions, or suggestions, please [open an issue](https://github.com/yourusername/source-hunter/issues).

---

## Tech Stack

- **Frontend Framework** – React 19.2.3 with TypeScript
- **Build Tool** – Vite 6.2.0
- **Styling** – Tailwind CSS 4.1.18
- **Database** – Dexie.js (IndexedDB wrapper) for local data persistence
- **Icons** – Lucide React
- **Date Utilities** – date-fns
- **API** – YouTube Data API v3

## Prerequisites

- **Node.js** – v18.0.0 or higher ([Download](https://nodejs.org/))
- **YouTube Data API Key** – Get your key from [Google Cloud Console](https://console.cloud.google.com/) (Clear steps mentioned below)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/source-hunter.git
cd source-hunter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get a YouTube Data API Key

You'll need a YouTube Data API key to use this application:
> **Note** - Please be aware of the daily free limits of the API to not get billed unless required.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create credentials (API Key)
5. (Optional) Set up API quotas to manage usage

### 4. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3010`

### 5. Enter Your API Key

On first launch, you'll be prompted to enter your YouTube Data API key through the settings interface. The key will be stored locally in your browser's localStorage.

## Usage

### Basic Workflow

1. **Enter a YouTube URL** – Paste any YouTube video or Short URL
2. **Start Analysis** – Click "Start Analysis" to begin fetching comments
3. **Choose Scan Mode:**
   - **Smart Scan** – Quick top-level comments only
   - **Deep Scan** – Comprehensive scan including all replies
4. **Explore Results** – Browse through extracted comments with highlighted sources
5. **Search Within Results** – Filter comments by keywords or authors
6. **View History** – Access previously scanned videos from the History tab
7. **Check Analytics** – Monitor your usage statistics and patterns

### Features in Detail

#### Comment Scanning
- Fetches up to thousands of comments per video
- Respects YouTube API quota limits
- Real-time progress tracking
- Pause/resume support for long scans

#### Source Highlighting
- Automatic detection of URLs and links
- Bracket-highlighted text `[like this]`
- Visual scoring system for relevance

#### Search History
- Automatic saving of scanned videos
- Video thumbnails and titles
- Quick re-scan capability

#### Analytics
- Total searches performed
- Comments fetched statistics
- Content type breakdown (videos vs. Shorts)
- Daily activity tracking

## Project Structure

```
source-hunter/
├── components/              # React components
│   ├── Analytics.tsx       # Analytics dashboard
│   ├── CommentCard.tsx     # Individual comment display
│   ├── Dashboard.tsx       # Main scanning interface
│   ├── History.tsx         # Search history view
│   ├── Settings.tsx        # API key configuration
│   └── TabNavigation.tsx   # Tab navigation system
├── hooks/                   # Custom React hooks
│   └── useTabPersistence.ts # Tab state persistence
├── services/                # Business logic
│   ├── analysisService.ts  # Comment analysis logic
│   └── analyticsService.ts # Analytics tracking
├── App.tsx                  # Root application component
├── db.ts                    # IndexedDB configuration (Dexie)
├── types.ts                 # TypeScript type definitions
├── index.html               # Entry HTML
├── index.tsx                # Application entry point
└── vite.config.ts           # Vite configuration
```

## Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Build & Deployment

### Production Build

```bash
npm run build
```

The optimized build will be created in the `dist/` directory.

### Deployment Options

The application can be deployed to any static hosting service:

**Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Vercel**
```bash
npm install -g vercel
vercel --prod
```

**GitHub Pages**
```bash
npm install -g gh-pages
gh-pages -d dist
```

> **Note:** After deploying, you will need to enter your own YouTube Data API key through the UI. The application runs entirely client-side with no server-side configuration needed. **OR** Before deploying you can add the key in an env file or as an env in the platform you are deploying or as a Github Secret.

## API Key Security

- **API Key Storage**: Your API key is stored in your browser's localStorage, not on any server
- **No Server Required**: Source Hunter runs entirely in your browser – your API key never leaves your device
- **YouTube API Keys**: These are generally safe to use in client-side applications as they can be restricted by HTTP referrer and API quotas
- **Best Practices**:
  - Don't share your API key publicly
  - Set up quotas in Google Cloud Console to limit usage
  - Consider creating a separate API key for this application

## Development

### Code Style

- TypeScript for type safety
- Functional components with hooks
- Modular component architecture
- Tailwind CSS for styling

### File Naming

- Components: PascalCase (e.g., `Dashboard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTabPersistence.ts`)
- Services: camelCase (e.g., `analysisService.ts`)

### Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -m "feat: add your feature"`
3. Push and create a pull request

## Troubleshooting

### Port Already in Use

If port 3010 is already in use, modify the port in `vite.config.ts` or kill the process:

```bash
# Linux/Mac
lsof -ti:3010 | xargs kill -9

# Windows
netstat -ano | findstr :3010
taskkill /PID <PID> /F
```

### API Key Issues

If you see API errors:
- Verify your API key is entered correctly in the Settings
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check your API quota hasn't been exceeded
- Try refreshing the page and re-entering your API key
- Check browser DevTools Console for specific error messages

### Database Issues

If data isn't persisting:
- Clear browser data for localhost
- Check browser DevTools → Application → IndexedDB
- Verify database schema in `db.ts`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Roadmap

- [ ] Export results to CSV/JSON
- [ ] Advanced filtering options
- [ ] Bulk video scanning
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Cloud sync for history

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://react.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Data persistence via [Dexie.js](https://dexie.org/)
- Powered by [YouTube Data API](https://developers.google.com/youtube/v3)

---

<div align="center">

**Made with ❤️ by the StuffThatWorks team**

</div>
