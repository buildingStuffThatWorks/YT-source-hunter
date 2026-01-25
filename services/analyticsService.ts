import { db } from '../db';
import { SearchHistoryEntry, AnalyticsEvent, ContentTypeMetric, AnalyticsEventType } from '../types';

/**
 * Analytics Service - Tracks search history, API calls, and user activity
 * All data is persisted in IndexedDB for historical tracking and reporting
 */

// Detect if a URL is a YouTube Short
export const isYouTubeShort = (url: string): boolean => {
  return /youtube\.com\/shorts\//i.test(url) || /^([a-zA-Z0-9_-]{11})$/.test(url.trim());
};

/**
 * Add a search entry to history
 */
export const addSearchHistory = async (
  query: string,
  videoId: string,
  videoTitle?: string,
  thumbnailUrl?: string
): Promise<void> => {
  try {
    const entry: SearchHistoryEntry = {
      videoId,
      query,
      timestamp: Date.now(),
      isShort: isYouTubeShort(query),
      videoTitle,
      thumbnailUrl
    };
    await db.searchHistory.add(entry);

    // Also track as analytics event
    await trackAnalyticsEvent('search_performed', videoId, {
      contentType: entry.isShort ? 'short' : 'video',
      queryLength: query.length
    });

    // Update content type metrics
    await updateContentTypeMetrics(videoId, entry.isShort ? 'short' : 'video', 'search');
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Track an analytics event
 */
export const trackAnalyticsEvent = async (
  eventType: AnalyticsEventType,
  videoId?: string,
  metadata?: AnalyticsEvent['metadata']
): Promise<void> => {
  try {
    const event: AnalyticsEvent = {
      eventType,
      timestamp: Date.now(),
      videoId,
      metadata
    };
    await db.analyticsEvents.add(event);
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Track an API call
 */
export const trackApiCall = async (endpoint: string, videoId?: string): Promise<void> => {
  await trackAnalyticsEvent('api_call', videoId, { apiEndpoint: endpoint });
};

/**
 * Track scan events
 */
export const trackScanStarted = async (videoId: string, mode: 'smart' | 'deep'): Promise<void> => {
  await trackAnalyticsEvent('scan_started', videoId, { scanMode: mode });
  await updateContentTypeMetrics(videoId, undefined, 'scan');
};

export const trackScanCompleted = async (videoId: string, mode: 'smart' | 'deep', commentCount: number): Promise<void> => {
  await trackAnalyticsEvent('scan_completed', videoId, {
    scanMode: mode,
    commentCount
  });
};

export const trackScanPaused = async (videoId: string): Promise<void> => {
  await trackAnalyticsEvent('scan_paused', videoId);
};

export const trackScanError = async (videoId: string, error: string): Promise<void> => {
  await trackAnalyticsEvent('scan_error', videoId, { error });
};

export const trackCommentsFetched = async (videoId: string, count: number): Promise<void> => {
  await trackAnalyticsEvent('comments_fetched', videoId, { commentCount: count });
};

export const trackSearchQuery = async (videoId: string, queryLength: number): Promise<void> => {
  await trackAnalyticsEvent('search_query', videoId, { queryLength });
};

/**
 * Update content type metrics (aggregated daily stats)
 */
const updateContentTypeMetrics = async (
  videoId: string,
  contentType?: 'video' | 'short',
  actionType?: 'search' | 'scan'
): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingMetric = await db.contentTypeMetrics
      .where('[videoId+date]')
      .equals([videoId, today])
      .first();

    if (existingMetric) {
      const updates: Partial<ContentTypeMetric> = { lastUpdated: Date.now() };
      if (actionType === 'search') {
        updates.searchCount = existingMetric.searchCount + 1;
      } else if (actionType === 'scan') {
        updates.scanCount = existingMetric.scanCount + 1;
      }
      if (contentType) {
        updates.contentType = contentType;
      }
      await db.contentTypeMetrics.update(existingMetric.id!, updates);
    } else {
      const newMetric: ContentTypeMetric = {
        videoId,
        contentType: contentType || 'video',
        date: today,
        searchCount: actionType === 'search' ? 1 : 0,
        scanCount: actionType === 'scan' ? 1 : 0,
        commentsFetched: 0,
        lastUpdated: Date.now()
      };
      await db.contentTypeMetrics.add(newMetric);
    }
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Query functions for retrieving analytics data
 */

// Get search history (most recent first)
export const getSearchHistory = async (limit = 50): Promise<SearchHistoryEntry[]> => {
  return await db.searchHistory
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
};

// Get analytics events by type
export const getAnalyticsEvents = async (
  eventType?: AnalyticsEventType,
  limit = 100
): Promise<AnalyticsEvent[]> => {
  let query = db.analyticsEvents.orderBy('timestamp').reverse();
  if (eventType) {
    return await db.analyticsEvents
      .where('eventType')
      .equals(eventType)
      .reverse()
      .sortBy('timestamp');
  }
  return await query.limit(limit).toArray();
};

// Get content type metrics for a video
export const getContentTypeMetrics = async (videoId: string): Promise<ContentTypeMetric[]> => {
  return await db.contentTypeMetrics
    .where('videoId')
    .equals(videoId)
    .toArray();
};

// Get total API call count
export const getTotalApiCalls = async (): Promise<number> => {
  return await db.analyticsEvents
    .where('eventType')
    .equals('api_call')
    .count();
};

// Get daily stats
export const getDailyStats = async (date?: string): Promise<{
  searches: number;
  scans: number;
  apiCalls: number;
  commentsFetched: number;
  videosSearched: number;
  shortsSearched: number;
  errors: number;
  errorRate: number;
}> => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const startOfDay = new Date(targetDate).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  const [searches, scans, apiCalls, commentsEvents, searchEvents, errorEvents] = await Promise.all([
    db.analyticsEvents.where('eventType').equals('search_performed')
      .filter(e => e.timestamp >= startOfDay && e.timestamp <= endOfDay).count(),
    db.analyticsEvents.where('eventType').equals('scan_started')
      .filter(e => e.timestamp >= startOfDay && e.timestamp <= endOfDay).count(),
    db.analyticsEvents.where('eventType').equals('api_call')
      .filter(e => e.timestamp >= startOfDay && e.timestamp <= endOfDay).count(),
    db.analyticsEvents.where('eventType').equals('comments_fetched')
      .filter(e => e.timestamp >= startOfDay && e.timestamp <= endOfDay).toArray(),
    db.analyticsEvents.where('eventType').equals('search_performed')
      .filter(e => e.timestamp >= startOfDay && e.timestamp <= endOfDay).toArray(),
    db.analyticsEvents.where('eventType').equals('scan_error')
      .filter(e => e.timestamp >= startOfDay && e.timestamp <= endOfDay).count()
  ]);

  const commentsFetched = commentsEvents.reduce(
    (sum, e) => sum + (e.metadata?.commentCount || 0),
    0
  );

  // Count videos vs shorts
  const videosSearched = searchEvents.filter(e => e.metadata?.contentType === 'video').length;
  const shortsSearched = searchEvents.filter(e => e.metadata?.contentType === 'short').length;

  // Calculate error rate
  const totalOperations = searches + scans + apiCalls;
  const errorRate = totalOperations > 0 ? (errorEvents / totalOperations) * 100 : 0;

  return { searches, scans, apiCalls, commentsFetched, videosSearched, shortsSearched, errors: errorEvents, errorRate };
};

// Get weekly stats
export const getWeeklyStats = async (weeksBack = 0): Promise<{
  weekStart: string;
  weekEnd: string;
  searches: number;
  scans: number;
  apiCalls: number;
  commentsFetched: number;
  videosSearched: number;
  shortsSearched: number;
  errors: number;
  errorRate: number;
  dailyBreakdown: Array<{ date: string; searches: number; scans: number; apiCalls: number }>;
}> => {
  const now = new Date();
  const currentDay = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDay - (weeksBack * 7));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfWeekTime = startOfWeek.getTime();
  const endOfWeekTime = endOfWeek.getTime();

  const [searches, scans, apiCalls, commentsEvents, searchEvents, errorEvents] = await Promise.all([
    db.analyticsEvents.where('eventType').equals('search_performed')
      .filter(e => e.timestamp >= startOfWeekTime && e.timestamp <= endOfWeekTime).count(),
    db.analyticsEvents.where('eventType').equals('scan_started')
      .filter(e => e.timestamp >= startOfWeekTime && e.timestamp <= endOfWeekTime).count(),
    db.analyticsEvents.where('eventType').equals('api_call')
      .filter(e => e.timestamp >= startOfWeekTime && e.timestamp <= endOfWeekTime).count(),
    db.analyticsEvents.where('eventType').equals('comments_fetched')
      .filter(e => e.timestamp >= startOfWeekTime && e.timestamp <= endOfWeekTime).toArray(),
    db.analyticsEvents.where('eventType').equals('search_performed')
      .filter(e => e.timestamp >= startOfWeekTime && e.timestamp <= endOfWeekTime).toArray(),
    db.analyticsEvents.where('eventType').equals('scan_error')
      .filter(e => e.timestamp >= startOfWeekTime && e.timestamp <= endOfWeekTime).count()
  ]);

  const commentsFetched = commentsEvents.reduce(
    (sum, e) => sum + (e.metadata?.commentCount || 0),
    0
  );

  const videosSearched = searchEvents.filter(e => e.metadata?.contentType === 'video').length;
  const shortsSearched = searchEvents.filter(e => e.metadata?.contentType === 'short').length;

  const totalOperations = searches + scans + apiCalls;
  const errorRate = totalOperations > 0 ? (errorEvents / totalOperations) * 100 : 0;

  // Daily breakdown for the week
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const dayStart = day.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const [daySearches, dayScans, dayApiCalls] = await Promise.all([
      db.analyticsEvents.where('eventType').equals('search_performed')
        .filter(e => e.timestamp >= dayStart && e.timestamp <= dayEnd).count(),
      db.analyticsEvents.where('eventType').equals('scan_started')
        .filter(e => e.timestamp >= dayStart && e.timestamp <= dayEnd).count(),
      db.analyticsEvents.where('eventType').equals('api_call')
        .filter(e => e.timestamp >= dayStart && e.timestamp <= dayEnd).count()
    ]);

    dailyBreakdown.push({
      date: day.toISOString().split('T')[0],
      searches: daySearches,
      scans: dayScans,
      apiCalls: dayApiCalls
    });
  }

  return {
    weekStart: startOfWeek.toISOString().split('T')[0],
    weekEnd: endOfWeek.toISOString().split('T')[0],
    searches,
    scans,
    apiCalls,
    commentsFetched,
    videosSearched,
    shortsSearched,
    errors: errorEvents,
    errorRate,
    dailyBreakdown
  };
};

// Get monthly stats
export const getMonthlyStats = async (monthsBack = 0): Promise<{
  month: string;
  year: number;
  searches: number;
  scans: number;
  apiCalls: number;
  commentsFetched: number;
  videosSearched: number;
  shortsSearched: number;
  errors: number;
  errorRate: number;
  weeklyBreakdown: Array<{ week: string; searches: number; scans: number; apiCalls: number }>;
}> => {
  const now = new Date();
  const month = now.getMonth() - monthsBack;
  const year = now.getFullYear();

  const startOfMonth = new Date(year, month, 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(year, month + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const startOfMonthTime = startOfMonth.getTime();
  const endOfMonthTime = endOfMonth.getTime();

  const [searches, scans, apiCalls, commentsEvents, searchEvents, errorEvents] = await Promise.all([
    db.analyticsEvents.where('eventType').equals('search_performed')
      .filter(e => e.timestamp >= startOfMonthTime && e.timestamp <= endOfMonthTime).count(),
    db.analyticsEvents.where('eventType').equals('scan_started')
      .filter(e => e.timestamp >= startOfMonthTime && e.timestamp <= endOfMonthTime).count(),
    db.analyticsEvents.where('eventType').equals('api_call')
      .filter(e => e.timestamp >= startOfMonthTime && e.timestamp <= endOfMonthTime).count(),
    db.analyticsEvents.where('eventType').equals('comments_fetched')
      .filter(e => e.timestamp >= startOfMonthTime && e.timestamp <= endOfMonthTime).toArray(),
    db.analyticsEvents.where('eventType').equals('search_performed')
      .filter(e => e.timestamp >= startOfMonthTime && e.timestamp <= endOfMonthTime).toArray(),
    db.analyticsEvents.where('eventType').equals('scan_error')
      .filter(e => e.timestamp >= startOfMonthTime && e.timestamp <= endOfMonthTime).count()
  ]);

  const commentsFetched = commentsEvents.reduce(
    (sum, e) => sum + (e.metadata?.commentCount || 0),
    0
  );

  const videosSearched = searchEvents.filter(e => e.metadata?.contentType === 'video').length;
  const shortsSearched = searchEvents.filter(e => e.metadata?.contentType === 'short').length;

  const totalOperations = searches + scans + apiCalls;
  const errorRate = totalOperations > 0 ? (errorEvents / totalOperations) * 100 : 0;

  // Weekly breakdown for the month
  const weeklyBreakdown = [];
  const weeksInMonth = Math.ceil((endOfMonth.getDate() - startOfMonth.getDate()) / 7);

  for (let i = 0; i < weeksInMonth; i++) {
    const weekStart = new Date(startOfMonth);
    weekStart.setDate(startOfMonth.getDate() + (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekEnd > endOfMonth) weekEnd.setTime(endOfMonth.getTime());

    const weekStartTime = weekStart.getTime();
    const weekEndTime = weekEnd.getTime();

    const [weekSearches, weekScans, weekApiCalls] = await Promise.all([
      db.analyticsEvents.where('eventType').equals('search_performed')
        .filter(e => e.timestamp >= weekStartTime && e.timestamp <= weekEndTime).count(),
      db.analyticsEvents.where('eventType').equals('scan_started')
        .filter(e => e.timestamp >= weekStartTime && e.timestamp <= weekEndTime).count(),
      db.analyticsEvents.where('eventType').equals('api_call')
        .filter(e => e.timestamp >= weekStartTime && e.timestamp <= weekEndTime).count()
    ]);

    weeklyBreakdown.push({
      week: `Week ${i + 1}`,
      searches: weekSearches,
      scans: weekScans,
      apiCalls: weekApiCalls
    });
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return {
    month: monthNames[month],
    year,
    searches,
    scans,
    apiCalls,
    commentsFetched,
    videosSearched,
    shortsSearched,
    errors: errorEvents,
    errorRate,
    weeklyBreakdown
  };
};

// Get search frequency (searches per day over a period)
export const getSearchFrequency = async (days = 30): Promise<{
  period: string;
  totalSearches: number;
  averagePerDay: number;
  peakDay: { date: string; count: number };
  dailyData: Array<{ date: string; searches: number; videos: number; shorts: number }>;
}> => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const startTime = startDate.getTime();
  const endTime = now.getTime();

  const searchEvents = await db.analyticsEvents
    .where('eventType')
    .equals('search_performed')
    .filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
    .toArray();

  // Group by date
  const dailyMap = new Map<string, { searches: number; videos: number; shorts: number }>();

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap.set(dateStr, { searches: 0, videos: 0, shorts: 0 });
  }

  searchEvents.forEach(event => {
    const dateStr = new Date(event.timestamp).toISOString().split('T')[0];
    const existing = dailyMap.get(dateStr) || { searches: 0, videos: 0, shorts: 0 };
    existing.searches++;
    if (event.metadata?.contentType === 'video') existing.videos++;
    if (event.metadata?.contentType === 'short') existing.shorts++;
    dailyMap.set(dateStr, existing);
  });

  const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data
  }));

  const totalSearches = searchEvents.length;
  const averagePerDay = totalSearches / days;

  const peakDayEntry = dailyData.reduce((max, current) =>
    current.searches > max.searches ? current : max,
    { date: '', searches: 0, videos: 0, shorts: 0 }
  );

  return {
    period: `Last ${days} days`,
    totalSearches,
    averagePerDay: Math.round(averagePerDay * 100) / 100,
    peakDay: { date: peakDayEntry.date, count: peakDayEntry.searches },
    dailyData
  };
};

// Clear old analytics data (keep last N days)
export const clearOldAnalytics = async (daysToKeep = 30): Promise<void> => {
  const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

  await db.analyticsEvents
    .where('timestamp')
    .below(cutoffTime)
    .delete();

  await db.searchHistory
    .where('timestamp')
    .below(cutoffTime)
    .delete();

  await db.contentTypeMetrics
    .where('lastUpdated')
    .below(cutoffTime)
    .delete();
};

/**
 * Update search history entry with video details (called after video metadata is fetched)
 */
export const updateSearchHistoryWithVideoDetails = async (
  videoId: string,
  videoTitle: string,
  thumbnailUrl: string
): Promise<void> => {
  try {
    const entries = await db.searchHistory
      .where('videoId')
      .equals(videoId)
      .reverse()
      .sortBy('timestamp');

    if (entries.length > 0) {
      const mostRecent = entries[0];
      await db.searchHistory.update(mostRecent.id!, {
        videoTitle,
        thumbnailUrl
      });
    }
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Update search history entry with results count (called after scan completes)
 */
export const updateSearchHistoryWithResultsCount = async (
  videoId: string,
  resultsCount: number
): Promise<void> => {
  try {
    const entries = await db.searchHistory
      .where('videoId')
      .equals(videoId)
      .reverse()
      .sortBy('timestamp');

    if (entries.length > 0) {
      const mostRecent = entries[0];
      await db.searchHistory.update(mostRecent.id!, {
        resultsCount
      });
    }
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Get top search terms from search history
 */
export const getTopSearchTerms = async (limit = 10, daysBack = 30): Promise<Array<{
  videoId: string;
  videoTitle?: string;
  searchCount: number;
  lastSearched: number;
}>> => {
  try {
    const cutoffTime = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    // Get all searches within the time range
    const searches = await db.searchHistory
      .where('timestamp')
      .above(cutoffTime)
      .toArray();

    // Group by videoId and count searches
    const searchMap = new Map<string, { count: number; lastSearched: number; videoTitle?: string }>();

    searches.forEach(search => {
      const existing = searchMap.get(search.videoId);
      if (existing) {
        existing.count++;
        if (search.timestamp > existing.lastSearched) {
          existing.lastSearched = search.timestamp;
        }
        if (search.videoTitle && !existing.videoTitle) {
          existing.videoTitle = search.videoTitle;
        }
      } else {
        searchMap.set(search.videoId, {
          count: 1,
          lastSearched: search.timestamp,
          videoTitle: search.videoTitle
        });
      }
    });

    // Convert to array and sort by count
    return Array.from(searchMap.entries())
      .map(([videoId, data]) => ({
        videoId,
        videoTitle: data.videoTitle,
        searchCount: data.count,
        lastSearched: data.lastSearched
      }))
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit);
  } catch (error) {
    // Error silently ignored
    return [];
  }
};

/**
 * Session Management
 */
const SESSION_STORAGE_KEY = 'source_hunter_session';

interface SessionData {
  startTime: number;
  searchCount: number;
  lastActivity: number;
}

/**
 * Get or create current session
 */
export const getCurrentSession = (): SessionData => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored) as SessionData;
      // Check if session is still valid (within 24 hours)
      const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - session.lastActivity < SESSION_TIMEOUT) {
        return session;
      }
    }
  } catch (error) {
    // Error silently ignored
  }

  // Create new session
  const newSession: SessionData = {
    startTime: Date.now(),
    searchCount: 0,
    lastActivity: Date.now()
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
  return newSession;
};

/**
 * Update session activity
 */
export const updateSessionActivity = (): void => {
  try {
    const session = getCurrentSession();
    session.lastActivity = Date.now();
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Increment session search count
 */
export const incrementSessionSearchCount = (): void => {
  try {
    const session = getCurrentSession();
    session.searchCount++;
    session.lastActivity = Date.now();
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    // Error silently ignored
  }
};

/**
 * Get session statistics
 */
export const getSessionStats = (): {
  duration: number; // in minutes
  searchCount: number;
  startTime: number;
} => {
  const session = getCurrentSession();
  const duration = Math.floor((Date.now() - session.startTime) / 1000 / 60); // minutes

  return {
    duration,
    searchCount: session.searchCount,
    startTime: session.startTime
  };
};

/**
 * End current session (call on logout/app close)
 */
export const endSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    // Error silently ignored
  }
};
