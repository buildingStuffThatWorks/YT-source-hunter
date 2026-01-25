import Dexie, { Table } from 'dexie';
import { Comment, VideoMetadata, SearchHistoryEntry, AnalyticsEvent, ContentTypeMetric } from './types';

export class SourceHunterDatabase extends Dexie {
  comments!: Table<Comment>;
  videos!: Table<VideoMetadata>;
  searchHistory!: Table<SearchHistoryEntry>;
  analyticsEvents!: Table<AnalyticsEvent>;
  contentTypeMetrics!: Table<ContentTypeMetric>;

  constructor() {
    super('SourceHunterDB');
    (this as any).version(1).stores({
      comments: 'id, parentId, videoId, score, likeCount, [videoId+score], [videoId+likeCount]',
      videos: 'videoId'
    });
    (this as any).version(2).stores({
      comments: 'id, parentId, videoId, score, likeCount, [videoId+score], [videoId+likeCount]',
      videos: 'videoId',
      searchHistory: '++id, videoId, timestamp, query',
      analyticsEvents: '++id, eventType, timestamp, videoId',
      contentTypeMetrics: '++id, [videoId+date], videoId, contentType, date'
    });
    (this as any).version(3).stores({
      comments: 'id, parentId, videoId, score, likeCount, [videoId+score], [videoId+likeCount]',
      videos: 'videoId',
      searchHistory: '++id, videoId, timestamp, query, resultsCount',
      analyticsEvents: '++id, eventType, timestamp, videoId',
      contentTypeMetrics: '++id, [videoId+date], videoId, contentType, date'
    });
  }
}

export const db = new SourceHunterDatabase();

export const resetDatabaseForVideo = async (videoId: string) => {
  await db.comments.where('videoId').equals(videoId).delete();
  await db.videos.delete(videoId);
};
