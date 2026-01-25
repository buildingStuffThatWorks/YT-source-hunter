import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BarChart3, TrendingUp, Youtube, Film, AlertCircle, Calendar, Zap, Clock, Hash } from 'lucide-react';
import { getTopSearchTerms, getSessionStats, updateSessionActivity } from '../services/analyticsService';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [topSearches, setTopSearches] = useState<Array<{
    videoId: string;
    videoTitle?: string;
    searchCount: number;
    lastSearched: number;
  }>>([]);
  const [sessionStats, setSessionStats] = useState(getSessionStats());

  // Update session activity and refresh session stats periodically
  useEffect(() => {
    updateSessionActivity();
    const interval = setInterval(() => {
      setSessionStats(getSessionStats());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Fetch top search terms based on time range
  useEffect(() => {
    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    getTopSearchTerms(10, days).then(setTopSearches);
  }, [timeRange]);

  // Get analytics events
  const analyticsEvents = useLiveQuery(
    () => db.analyticsEvents.toArray(),
    []
  );

  // Get search history
  const searchHistory = useLiveQuery(
    () => db.searchHistory.toArray(),
    []
  );

  // Calculate stats based on time range
  const stats = useMemo(() => {
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case 'day':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const filteredEvents = analyticsEvents?.filter(e => e.timestamp >= startTime) ?? [];
    const filteredSearches = searchHistory?.filter(h => h.timestamp >= startTime) ?? [];

    const searches = filteredEvents.filter(e => e.eventType === 'search_performed').length;
    const scans = filteredEvents.filter(e => e.eventType === 'scan_started').length;
    const apiCalls = filteredEvents.filter(e => e.eventType === 'api_call').length;
    const errors = filteredEvents.filter(e => e.eventType === 'scan_error').length;

    const commentsFetched = filteredEvents
      .filter(e => e.eventType === 'comments_fetched')
      .reduce((sum, e) => sum + (e.metadata?.commentCount || 0), 0);

    const videosSearched = filteredEvents.filter(e =>
      e.eventType === 'search_performed' && e.metadata?.contentType === 'video'
    ).length;

    const shortsSearched = filteredEvents.filter(e =>
      e.eventType === 'search_performed' && e.metadata?.contentType === 'short'
    ).length;

    const totalOperations = searches + scans + apiCalls;
    const errorRate = totalOperations > 0 ? (errors / totalOperations) * 100 : 0;

    // Daily breakdown
    const dailyData = useMemo(() => {
      const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
      const data: Record<string, { searches: number; scans: number; apiCalls: number }> = {};

      for (let i = 0; i < days; i++) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        data[dateStr] = { searches: 0, scans: 0, apiCalls: 0 };
      }

      filteredEvents.forEach(event => {
        const dateStr = new Date(event.timestamp).toISOString().split('T')[0];
        if (data[dateStr]) {
          if (event.eventType === 'search_performed') data[dateStr].searches++;
          if (event.eventType === 'scan_started') data[dateStr].scans++;
          if (event.eventType === 'api_call') data[dateStr].apiCalls++;
        }
      });

      return Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7);
    }, [filteredEvents, timeRange, now]);

    const peakDay = dailyData.reduce((max, [date, data]) =>
      data.searches > max.searches ? { date, searches: data.searches } : max,
      { date: '', searches: 0 }
    );

    return {
      searches,
      scans,
      apiCalls,
      errors,
      errorRate,
      commentsFetched,
      videosSearched,
      shortsSearched,
      dailyData,
      peakDay
    };
  }, [analyticsEvents, searchHistory, timeRange]);

  const StatCard = ({ icon: Icon, label, value, subtext, color }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    color: string;
  }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <header className="flex-none p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analytics
          </h2>
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timeRange === range
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={Zap}
            label="Searches"
            value={stats.searches}
            subtext={stats.peakDay.searches > 0 ? `Peak: ${stats.peakDay.searches}` : undefined}
            color="bg-blue-500/20"
          />
          <StatCard
            icon={TrendingUp}
            label="Scans"
            value={stats.scans}
            subtext={`${stats.commentsFetched.toLocaleString()} comments`}
            color="bg-emerald-500/20"
          />
          <StatCard
            icon={Youtube}
            label="Videos"
            value={stats.videosSearched}
            color="bg-red-500/20"
          />
          <StatCard
            icon={Film}
            label="Shorts"
            value={stats.shortsSearched}
            color="bg-purple-500/20"
          />
        </div>

        {/* API Usage */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            API Usage
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">API Calls</span>
              <span className="font-mono font-medium">{stats.apiCalls}</span>
            </div>
            {stats.errors > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Errors
                </span>
                <span className="font-mono font-medium text-red-400">{stats.errors}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Error Rate</span>
              <span className={`font-mono font-medium ${stats.errorRate > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                {stats.errorRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Daily Activity
          </h3>
          {stats.dailyData.length > 0 ? (
            <div className="space-y-2">
              {stats.dailyData.map(([date, data]) => {
                const maxSearches = Math.max(...stats.dailyData.map(([, d]) => d.searches), 1);
                const percentage = (data.searches / maxSearches) * 100;

                return (
                  <div key={date} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-500">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 bg-gray-700/50 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${Math.max(percentage, data.searches > 0 ? 5 : 0)}%` }}
                      >
                        {data.searches > 0 && (
                          <span className="text-[10px] font-medium text-white">{data.searches}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No activity data for this time range
            </div>
          )}
        </div>

        {/* Top Search Terms */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            Top Search Terms
          </h3>
          {topSearches.length > 0 ? (
            <div className="space-y-2">
              {topSearches.map((item, index) => {
                const maxCount = Math.max(...topSearches.map(s => s.searchCount), 1);
                const percentage = (item.searchCount / maxCount) * 100;

                return (
                  <div key={item.videoId} className="flex items-center gap-3">
                    <div className="w-6 text-xs text-gray-500 font-medium">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate" title={item.videoTitle || item.videoId}>
                        {item.videoTitle || item.videoId}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {item.searchCount} {item.searchCount === 1 ? 'search' : 'searches'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No search data for this time range
            </div>
          )}
        </div>

        {/* Session Statistics */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Current Session
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Duration</div>
              <div className="text-lg font-semibold text-blue-400">
                {sessionStats.duration < 60
                  ? `${sessionStats.duration}m`
                  : `${Math.floor(sessionStats.duration / 60)}h ${sessionStats.duration % 60}m`
                }
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Searches</div>
              <div className="text-lg font-semibold text-emerald-400">
                {sessionStats.searchCount}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Started {new Date(sessionStats.startTime).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
        </div>

        {analyticsEvents?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No analytics data yet</p>
            <p className="text-sm mt-2">Start searching to see your activity</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Analytics;
