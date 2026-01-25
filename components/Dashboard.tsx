import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Play, Download, Filter, Trash2, ArrowLeft, RefreshCw, Layers, AlertTriangle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, resetDatabaseForVideo } from '../db';
import { VideoMetadata, ScanStats } from '../types';
import { fetchCommentThreads, fetchReplies, fetchVideoDetails } from '../services/youtubeService';
import { trackScanStarted, trackScanCompleted, trackScanPaused, trackScanError, updateSearchHistoryWithResultsCount } from '../services/analyticsService';
import CommentCard from './CommentCard';

interface DashboardProps {
  videoId: string;
  apiKey: string;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ videoId, apiKey, onBack }) => {
  const [activeTab, setActiveTab] = useState<'candidates' | 'search' | 'all'>('candidates');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<ScanStats>({
    fetchedCount: 0,
    totalEstimated: 0,
    status: 'idle',
    mode: null
  });
  const [initError, setInitError] = useState<string | null>(null);
  const cancelScanRef = useRef(false);

  // Load video metadata
  const videoMeta = useLiveQuery(() => db.videos.get(videoId), [videoId]);
  
  // Queries
  const candidates = useLiveQuery(() => 
    db.comments
      .where('[videoId+score]')
      .between([videoId, 1], [videoId, 100], true, true)
      .reverse()
      .sortBy('score'),
    [videoId]
  );

  const allComments = useLiveQuery(() => 
    db.comments
      .where('[videoId+likeCount]')
      .between([videoId, 0], [videoId, 99999999]) // Generic range for sorting
      .reverse()
      .limit(100) // Lazy limit for performance in 'All' tab
      .toArray(),
    [videoId]
  );
  
  const searchResults = useLiveQuery(async () => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return db.comments
      .where('videoId').equals(videoId)
      .filter(c => c.textOriginal.toLowerCase().includes(searchQuery.toLowerCase()))
      .limit(50)
      .toArray();
  }, [searchQuery, videoId]);

  // Actions
  const handleSmartScan = useCallback(async () => {
    cancelScanRef.current = false;
    setStats(prev => ({ ...prev, status: 'running', mode: 'smart', error: undefined }));

    // Track scan started
    trackScanStarted(videoId, 'smart').catch(console.error);

    try {
      let pageToken: string | null = '';
      let totalFetched = 0;

      // Ensure we have metadata (fetch if missing in DB, though init effect handles this, redundancy is safe)
      // We don't rely on the hook variable 'videoMeta' here to avoid stale closure issues in async
      const currentMeta = await db.videos.get(videoId);
      if (!currentMeta) {
          await fetchVideoDetails(videoId, apiKey);
      }

      while (pageToken !== null && !cancelScanRef.current) {
        pageToken = await fetchCommentThreads(videoId, apiKey, pageToken, (count) => {
            totalFetched += count;
            setStats(prev => ({ ...prev, fetchedCount: prev.fetchedCount + count })); // Simple increment
        });

        // "Smart" logic: Iterate recent additions for high value threads
        // We do a quick query for top-level threads that have replyCount > 0 and match keywords
        const promisingThreads = await db.comments
           .where('videoId').equals(videoId)
           .filter(c => !c.parentId && !c.repliesFetched && c.replyCount > 0 && c.score > 10)
           .toArray();

        for (const thread of promisingThreads) {
            if (cancelScanRef.current) break;
            await fetchReplies(thread.id, videoId, apiKey);
        }
      }

      setStats(prev => ({ ...prev, status: 'complete' }));

      // Track scan completed
      if (!cancelScanRef.current) {
        trackScanCompleted(videoId, 'smart', totalFetched).catch(console.error);
        updateSearchHistoryWithResultsCount(videoId, stats.fetchedCount).catch(console.error);
      }
    } catch (e: any) {
      setStats(prev => ({ ...prev, status: 'error', error: e.message }));
      trackScanError(videoId, e.message).catch(console.error);
    }
  }, [videoId, apiKey]);

  const handleDeepScan = async () => {
     cancelScanRef.current = false;
     setStats({ ...stats, status: 'running', mode: 'deep' });

     // Track scan started
     trackScanStarted(videoId, 'deep').catch(console.error);

     try {
       const threads = await db.comments
        .where('videoId').equals(videoId)
        .filter(c => !c.parentId && c.replyCount > 0 && !c.repliesFetched)
        .toArray();

       let totalFetched = 0;
        for (let i = 0; i < threads.length; i++) {
            if (cancelScanRef.current) break;
            const t = threads[i];
            await fetchReplies(t.id, videoId, apiKey);
            totalFetched += t.replyCount;
            setStats(prev => ({ ...prev, fetchedCount: prev.fetchedCount + t.replyCount }));
        }
        setStats(prev => ({ ...prev, status: 'complete' }));

        // Track scan completed
        if (!cancelScanRef.current) {
          trackScanCompleted(videoId, 'deep', totalFetched).catch(console.error);
          updateSearchHistoryWithResultsCount(videoId, stats.fetchedCount).catch(console.error);
        }
     } catch (e: any) {
         setStats(prev => ({ ...prev, status: 'error', error: e.message }));
         trackScanError(videoId, e.message).catch(console.error);
     }
  };

  const stopScan = () => {
      cancelScanRef.current = true;
      setStats(prev => ({ ...prev, status: 'paused' }));
      trackScanPaused(videoId).catch(console.error);
  };

  const handleClear = async () => {
      await resetDatabaseForVideo(videoId);
      setStats({ fetchedCount: 0, totalEstimated: 0, status: 'idle', mode: null });
  };

  // Initialization Effect
  useEffect(() => {
      let active = true;
      const init = async () => {
          try {
              // Check if video metadata exists
              const meta = await db.videos.get(videoId);
              
              if (!meta) {
                  // New video session
                  const fetched = await fetchVideoDetails(videoId, apiKey);
                  if (!fetched) {
                      if (active) setInitError("Could not fetch video details. Check URL or API Key.");
                      return;
                  }
                  // Auto-start smart scan for new videos
                  if (active) handleSmartScan();
              } else {
                  // Existing video session, check if we should auto-resume or scan if empty
                  const count = await db.comments.where('videoId').equals(videoId).count();
                  if (count === 0 && active) {
                      handleSmartScan();
                  }
              }
          } catch (e: any) {
              if (active) setInitError(e.message || "Initialization failed");
          }
      };
      
      init();
      return () => { active = false; };
  }, [videoId, apiKey, handleSmartScan]);


  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-10 sticky top-0">
        <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate pr-4">
                    {videoMeta?.title || (initError ? 'Error loading video' : 'Loading video info...')}
                </h1>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {videoMeta?.totalComments?.toLocaleString() || (initError ? '-' : '...')} total
                    </span>
                    <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {stats.fetchedCount.toLocaleString()} loaded
                    </span>
                </div>
            </div>
            
            <div className="flex gap-2">
                {stats.status === 'running' ? (
                     <button onClick={stopScan} className="bg-red-500/10 text-red-400 border border-red-500/50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-500/20">
                        <Loader2 className="w-4 h-4 animate-spin" /> Stop
                     </button>
                ) : (
                    <>
                      <button 
                        onClick={handleSmartScan} 
                        disabled={!!initError}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
                      >
                        <Play className="w-4 h-4 fill-current" /> Smart Scan
                      </button>
                      <button 
                        onClick={handleDeepScan} 
                        disabled={!!initError}
                        title="Deep Scan (Slow)" 
                        className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 border border-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                         <RefreshCw className="w-4 h-4" />
                      </button>
                    </>
                )}
            </div>
        </div>

        {/* Status Bar */}
        {(stats.status === 'error' || initError) && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded mb-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{initError || stats.error}</span>
            </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-lg">
            {(['candidates', 'search', 'all'] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        activeTab === tab 
                        ? 'bg-gray-700 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {tab === 'candidates' && candidates && (
                        <span className="ml-1.5 bg-gray-600 px-1.5 rounded-full text-[10px] text-white">
                            {candidates.length}
                        </span>
                    )}
                </button>
            ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
          {activeTab === 'search' && (
              <div className="mb-4 sticky top-0 z-20">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search loaded comments..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                    <Filter className="w-3 h-3" />
                    <span>Searching locally in {stats.fetchedCount} comments. Deep Scan to find more.</span>
                  </div>
              </div>
          )}

          <div className="space-y-2">
            {activeTab === 'candidates' && (
                <>
                    {candidates?.length === 0 && stats.fetchedCount > 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p>No likely sources found yet.</p>
                        </div>
                    )}
                    {candidates?.map(c => (
                        <CommentCard key={c.id} comment={c} showContext={true} />
                    ))}
                </>
            )}

            {activeTab === 'search' && (
                <>
                    {searchResults?.map(c => (
                        <CommentCard key={c.id} comment={c} showContext={true} />
                    ))}
                    {searchQuery && searchResults?.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No matches found locally.</div>
                    )}
                </>
            )}

            {activeTab === 'all' && (
                <>
                    {allComments?.map(c => (
                        <CommentCard key={c.id} comment={c} />
                    ))}
                </>
            )}

            {stats.fetchedCount === 0 && stats.status !== 'running' && !initError && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                    {videoMeta ? (
                        <>
                            <Play className="w-12 h-12 mb-4 opacity-20" />
                            <p>Ready to scan</p>
                        </>
                    ) : (
                        <>
                             <Loader2 className="w-8 h-8 mb-4 animate-spin opacity-50" />
                             <p>Loading video details...</p>
                        </>
                    )}
                </div>
            )}
          </div>
      </main>
      
      {/* Footer Actions */}
      <footer className="p-2 border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-600 bg-gray-900">
          <span>Source Hunter v1.0</span>
          <button onClick={handleClear} className="flex items-center gap-1 hover:text-red-400 transition-colors">
              <Trash2 className="w-3 h-3" /> Clear Data
          </button>
      </footer>
    </div>
  );
};

export default Dashboard;