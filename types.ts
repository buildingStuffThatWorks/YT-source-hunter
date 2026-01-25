export interface Comment {
  id: string;              // YouTube Comment ID
  parentId: string | null; // Null if top-level, ID if reply
  videoId: string;         // To support multiple videos in DB
  authorName: string;
  authorProfileImageUrl: string;
  textDisplay: string;     // The raw HTML/Text
  textOriginal: string;    // Plain text for searching
  likeCount: number;
  replyCount: number;      // Only relevant for top-level
  publishedAt: string;
  isSuperThanks: boolean;  // Parsed from DOM or Text analysis
  isPinned: boolean;       // Parsed from DOM

  // Internal Flags
  repliesFetched: boolean; // True if we have fetched children for this thread
  score: number;           // Calculated relevance score (0-100)
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  totalComments: number;
  lastScanned: number;     // Timestamp
  scanStatus: 'idle' | 'scanning_toplevel' | 'scanning_replies' | 'complete';
}

export interface ScanStats {
  fetchedCount: number;
  totalEstimated: number;
  status: 'idle' | 'running' | 'paused' | 'error' | 'complete';
  mode: 'smart' | 'deep' | null;
  error?: string;
}

export interface AnalysisResult {
  score: number;
  highlights: { start: number; end: number; type: 'source' | 'helper' | 'bracket' }[];
}

// Search History Types
export interface SearchHistoryEntry {
  id?: number;
  videoId: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  query: string; // The input URL used
  timestamp: number;
  isShort: boolean;
  resultsCount?: number; // Number of comments found during scan
}

// Analytics Event Types
export type AnalyticsEventType =
  | 'search_performed'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_paused'
  | 'scan_error'
  | 'api_call'
  | 'comments_fetched'
  | 'search_query';

export interface AnalyticsEvent {
  id?: number;
  eventType: AnalyticsEventType;
  timestamp: number;
  videoId?: string;
  metadata?: {
    scanMode?: 'smart' | 'deep';
    apiEndpoint?: string;
    commentCount?: number;
    queryLength?: number;
    contentType?: 'video' | 'short';
    error?: string;
  };
}

// Content Type Metrics
export interface ContentTypeMetric {
  id?: number;
  videoId: string;
  contentType: 'video' | 'short';
  date: string; // ISO date string (YYYY-MM-DD)
  searchCount: number;
  scanCount: number;
  commentsFetched: number;
  lastUpdated: number;
}
