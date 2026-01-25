import { db } from '../db';
import { Comment, VideoMetadata } from '../types';
import { analyzeComment } from './analysisService';
import {
  trackApiCall,
  trackCommentsFetched,
  updateSearchHistoryWithVideoDetails
} from './analyticsService';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

// YouTube API key format validation
// Keys typically start with "AIza" and are 39 characters
const isValidApiKeyFormat = (key: string): boolean => {
  return /^AIza[A-Za-z0-9_-]{35}$/.test(key);
};

// Sanitize error messages to prevent exposing sensitive information
const sanitizeError = (error: string): string => {
  // Remove API key patterns if accidentally included
  let sanitized = error.replace(/AIza[A-Za-z0-9_-]{35}/g, '[REDACTED_KEY]');
  // Remove any URLs that might contain sensitive data
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL_REDACTED]');
  // Remove file paths
  sanitized = sanitized.replace(/\/[a-zA-Z0-9_\-\/]+\.(ts|tsx|js|jsx)/g, '[FILE]');
  return sanitized;
};

// Rate Limiter Queue
const requestQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const processQueue = async () => {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  while (requestQueue.length > 0) {
    const task = requestQueue.shift();
    if (task) {
      await task();
      // ~5 requests per second max = 200ms delay
      await delay(250);
    }
  }
  isProcessingQueue = false;
};

const enqueueRequest = <T>(request: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
};

export const validateApiKey = async (apiKey: string): Promise<{ isValid: boolean; error?: string }> => {
  // Check format first before making API call
  if (!isValidApiKeyFormat(apiKey)) {
    return {
      isValid: false,
      error: 'Invalid key format. YouTube API v3 keys typically start with "AIza" and are 39 characters long.'
    };
  }

  try {
    const response = await fetch(`${API_BASE}/videos?part=snippet&chart=mostPopular&maxResults=1&key=${apiKey}`);
    if (response.ok) {
        return { isValid: true };
    }
    let errorMsg = `API Error ${response.status}`;
    try {
        const data = await response.json();
        if (data.error && data.error.message) {
            errorMsg = sanitizeError(data.error.message);
        }
    } catch (e) {
        // ignore json parse error
    }
    return { isValid: false, error: errorMsg };
  } catch (e: any) {
    return { isValid: false, error: sanitizeError(e.message || "Network validation failed") };
  }
};

export { isValidApiKeyFormat, sanitizeError };

export const fetchVideoDetails = async (videoId: string, apiKey: string): Promise<VideoMetadata | null> => {
  return enqueueRequest(async () => {
    const response = await fetch(`${API_BASE}/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`);
    // Track API call
    trackApiCall('videos', videoId).catch(() => {});

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const meta: VideoMetadata = {
      videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      totalComments: parseInt(item.statistics.commentCount || '0', 10),
      lastScanned: Date.now(),
      scanStatus: 'idle'
    };

    // update or add to DB
    await db.videos.put(meta);

    // Update search history with video details
    updateSearchHistoryWithVideoDetails(videoId, meta.title, meta.thumbnailUrl).catch(() => {});

    return meta;
  });
};

const mapApiCommentToLocal = (item: any, videoId: string, parentId: string | null): Comment => {
  const snippet = item.snippet;
  const analysis = analyzeComment(snippet.textOriginal);
  
  return {
    id: item.id,
    parentId,
    videoId,
    authorName: snippet.authorDisplayName,
    authorProfileImageUrl: snippet.authorProfileImageUrl,
    textDisplay: snippet.textDisplay,
    textOriginal: snippet.textOriginal,
    likeCount: snippet.likeCount,
    replyCount: item.replies ? item.replies.comments.length : (snippet.totalReplyCount || 0),
    publishedAt: snippet.publishedAt,
    isSuperThanks: false, // API doesn't explicitly expose this easily in snippet
    isPinned: false, // Only available in top-level snippet usually
    repliesFetched: false,
    score: analysis.score
  };
};

export const fetchCommentThreads = async (
  videoId: string,
  apiKey: string,
  pageToken: string = '',
  onProgress: (count: number) => void
): Promise<string | null> => {
  return enqueueRequest(async () => {
    const url = new URL(`${API_BASE}/commentThreads`);
    url.searchParams.append('part', 'snippet,replies'); // Fetch replies immediately if small enough
    url.searchParams.append('videoId', videoId);
    url.searchParams.append('maxResults', '100');
    url.searchParams.append('key', apiKey);
    url.searchParams.append('textFormat', 'plainText');
    if (pageToken) url.searchParams.append('pageToken', pageToken);

    const res = await fetch(url.toString());
    // Track API call
    trackApiCall('commentThreads', videoId).catch(() => {});

    if (res.status === 403) throw new Error("Quota Exceeded");
    if (!res.ok) throw new Error("Network Error");

    const data = await res.json();
    const comments: Comment[] = [];

    for (const item of data.items) {
      const topLevelSnippet = item.snippet.topLevelComment.snippet;
      const topLevelComment = mapApiCommentToLocal(item.snippet.topLevelComment, videoId, null);

      // Check if pinned (sometimes available in 'snippet' of thread resource, distinct from comment snippet)
      // Note: The API structure for threads puts 'isPublic' etc in top level.
      // We often check extension/content script for 'pinned' class, but here we approximate or ignore if not in API.

      comments.push(topLevelComment);

      // Handle Replies included in the thread response (up to 5)
      if (item.replies && item.replies.comments) {
        for (const reply of item.replies.comments) {
            comments.push(mapApiCommentToLocal(reply, videoId, topLevelComment.id));
        }
        // If we got all replies, mark fetched
        if (item.replies.comments.length >= topLevelComment.replyCount) {
             topLevelComment.repliesFetched = true;
        }
      }

      // SMART SCAN TRIGGER:
      // If score > 0 (contains keywords) or is a question, mark for deep fetching if not already fetched
      if (!topLevelComment.repliesFetched && topLevelComment.replyCount > 0) {
         if (topLevelComment.score > 0 || /(what|sauce|name)\?/i.test(topLevelComment.textOriginal)) {
             // We will handle this in the calling controller (the 'Smart Scan' logic)
             // For now, we just save them.
         }
      }
    }

    await db.comments.bulkPut(comments);
    onProgress(comments.length);

    // Track comments fetched
    trackCommentsFetched(videoId, comments.length).catch(() => {});

    return data.nextPageToken || null;
  });
};

export const fetchReplies = async (
    parentId: string,
    videoId: string,
    apiKey: string
): Promise<void> => {
    return enqueueRequest(async () => {
        let pageToken: string | undefined = '';
        
        while (pageToken !== null) {
            const url = new URL(`${API_BASE}/comments`);
            url.searchParams.append('part', 'snippet');
            url.searchParams.append('parentId', parentId);
            url.searchParams.append('maxResults', '100');
            url.searchParams.append('key', apiKey);
            url.searchParams.append('textFormat', 'plainText');
            if (pageToken) url.searchParams.append('pageToken', pageToken);

            const res = await fetch(url.toString());
            if (!res.ok) break; // Fail silently for individual threads to keep moving

            const data = await res.json();
            const replies: Comment[] = data.items.map((item: any) => mapApiCommentToLocal(item, videoId, parentId));
            
            await db.comments.bulkPut(replies);
            pageToken = data.nextPageToken || null;
            if(!pageToken) break;
        }

        // Mark parent as fetched
        await db.comments.update(parentId, { repliesFetched: true });
    });
};