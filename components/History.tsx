import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SearchHistoryEntry } from '../types';
import { Clock, Youtube, ExternalLink, Trash2, Film, Loader2 } from 'lucide-react';

interface HistoryProps {
  onSelectVideo: (videoId: string) => void;
}

const History: React.FC<HistoryProps> = ({ onSelectVideo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load search history from IndexedDB, most recent first with pagination
  const history = useLiveQuery(
    () => db.searchHistory
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray(),
    [limit]
  );

  // Check if there are more entries to load
  useEffect(() => {
    const checkHasMore = async () => {
      const count = await db.searchHistory.count();
      setHasMore(history ? history.length < count : false);
    };
    checkHasMore();
  }, [history]);

  // Filter history based on search query
  const filteredHistory = history?.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.videoTitle?.toLowerCase().includes(query) ||
      entry.videoId.toLowerCase().includes(query) ||
      entry.query.toLowerCase().includes(query)
    );
  }) ?? [];

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all search history?')) {
      await db.searchHistory.clear();
    }
  };

  const handleDeleteEntry = async (id?: number) => {
    if (id) {
      await db.searchHistory.delete(id);
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollThreshold = 100; // Load more when 100px from bottom

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      setIsLoadingMore(true);
      // Slight delay to prevent rapid-fire loading
      setTimeout(() => {
        setLimit(prev => prev + 20);
        setIsLoadingMore(false);
      }, 300);
    }
  }, [isLoadingMore, hasMore]);

  // Attach scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const groupedHistory = filteredHistory.reduce((groups, entry) => {
    const date = new Date(entry.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, SearchHistoryEntry[]>);

  if (filteredHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Clock className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No search history yet</p>
        <p className="text-sm mt-2">Search for a video to get started</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Search History</h2>
          <button
            onClick={handleClearHistory}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear All
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      {/* History List */}
      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedHistory).map(([date, entries]) => (
          <div key={date} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {date === new Date().toDateString() ? 'Today' : date}
            </h3>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-gray-800/50 border border-gray-700 hover:border-gray-600 rounded-xl p-4 transition-all group hover:bg-gray-800 cursor-pointer"
                  onClick={() => onSelectVideo(entry.videoId)}
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 relative">
                      {entry.thumbnailUrl ? (
                        <img
                          src={entry.thumbnailUrl}
                          alt={entry.videoTitle || 'Video thumbnail'}
                          className="w-24 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Youtube className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      {entry.isShort && (
                        <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Film className="w-2.5 h-2.5 text-white" />
                          <span className="text-[8px] text-white font-medium">SHORT</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">
                        {entry.videoTitle || `Video: ${entry.videoId}`}
                      </h4>
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        {entry.query}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(entry.timestamp)}
                        </span>
                        {entry.resultsCount !== undefined && (
                          <span>
                            {entry.resultsCount.toLocaleString()} comments
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEntry(entry.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 rounded-lg transition-all"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Loading indicator for infinite scroll */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="ml-2 text-sm text-gray-500">Loading more history...</span>
          </div>
        )}

        {/* End of history indicator */}
        {!hasMore && filteredHistory.length > 0 && (
          <div className="flex items-center justify-center py-4 text-xs text-gray-600">
            You've reached the end of your search history
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
