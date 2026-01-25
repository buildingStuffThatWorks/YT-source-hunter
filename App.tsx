import React, { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Analytics from './components/Analytics';
import TabNavigation, { TabId } from './components/TabNavigation';
import { useTabPersistence } from './hooks/useTabPersistence';
import { addSearchHistory, incrementSessionSearchCount } from './services/analyticsService';

// Utility to parse Video ID
const extractVideoId = (url: string): string | null => {
    // Clean up whitespace
    const cleanUrl = url.trim();

    // Check for raw ID (11 chars, alphanumeric + _ -)
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
        return cleanUrl;
    }

    // Regex for various YouTube URL formats including Shorts
    // Group 1: Preceding delimiters
    // Group 2: The ID (11 chars usually, but we capture until next delimiter)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);

    // YouTube IDs are 11 characters
    if (match && match[2].length === 11) {
        return match[2];
    }

    return null;
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Tab navigation state with localStorage persistence
  const [activeTab, setActiveTab] = useTabPersistence('search', ['search', 'history', 'analytics']);

  // Persist API Key
  useEffect(() => {
    const stored = localStorage.getItem('yt_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const handleSaveKey = (key: string, persist: boolean) => {
    if (persist) {
      localStorage.setItem('yt_api_key', key);
    }
    setApiKey(key);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!inputUrl.trim()) return;

      const id = extractVideoId(inputUrl);
      if (id) {
          // Track search history (video title will be fetched later in Dashboard)
          addSearchHistory(inputUrl, id).catch(() => {});
          // Increment session search count
          incrementSessionSearchCount();
          setVideoId(id);
      } else {
          setError("Could not find a valid YouTube Video ID in that URL.");
      }
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Settings onSave={handleSaveKey} initialKey="" />
      </div>
    );
  }

  if (videoId) {
    return (
      <div className="h-screen w-full bg-gray-950 overflow-hidden">
        <Dashboard
            videoId={videoId}
            apiKey={apiKey}
            onBack={() => setVideoId(null)}
        />
      </div>
    );
  }

  // Tab-based navigation views
  const renderTabContent = () => {
    switch (activeTab) {
      case 'search':
        return (
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight mb-2">
                Source Hunter
              </h1>
              <p className="text-gray-500">Enter a YouTube URL to start hunting.</p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Video or Short URL</label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => {
                        setInputUrl(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className={`w-full bg-gray-950 border rounded-xl pl-10 pr-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all group-hover:border-gray-600 ${error ? 'border-red-500/50 focus:ring-red-500/50' : 'border-gray-700'}`}
                      autoFocus
                    />
                    <Search className="absolute left-3.5 top-4 w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 mt-2 text-red-400 text-xs animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!inputUrl}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98]"
                >
                  Start Analysis
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between text-xs text-gray-600 border-t border-gray-800 pt-4">
                <span className="flex items-center gap-1 text-green-500/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  API Connected
                </span>
                <button onClick={() => setApiKey(null)} className="hover:text-white transition-colors underline decoration-gray-700 underline-offset-2">
                  Change API Key
                </button>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="w-full max-w-4xl h-[calc(100vh-200px)]">
            <History onSelectVideo={(id) => {
              setVideoId(id);
              setActiveTab('search');
            }} />
          </div>
        );

      case 'analytics':
        return (
          <div className="w-full max-w-4xl h-[calc(100vh-200px)]">
            <Analytics />
          </div>
        );

      default:
        return null;
    }
  };

  // Main application with tab navigation
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center p-4">
      {/* Tab Navigation */}
      <div className="w-full max-w-4xl mb-6">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 w-full flex items-start justify-center">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default App;