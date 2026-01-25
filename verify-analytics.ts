/**
 * Temporary verification script for IndexedDB analytics implementation
 * This script verifies that the database schema, types, and service functions are properly defined.
 */

import { db } from './db';
import {
  addSearchHistory,
  trackAnalyticsEvent,
  getSearchHistory,
  getAnalyticsEvents,
  getDailyStats,
  getTotalApiCalls,
  getContentTypeMetrics
} from './services/analyticsService';

async function verifyAnalyticsImplementation() {
  console.log('🔍 Verifying IndexedDB Analytics Implementation...\n');

  const results = {
    passed: [] as string[],
    failed: [] as string[]
  };

  // 1. Verify database schema
  console.log('1️⃣ Verifying database schema...');
  try {
    const tables = db.tables.map(t => t.name);
    const expectedTables = ['comments', 'videos', 'searchHistory', 'analyticsEvents', 'contentTypeMetrics'];

    const hasAllTables = expectedTables.every(table => tables.includes(table));

    if (hasAllTables) {
      console.log('   ✅ All required tables exist:', expectedTables.join(', '));
      results.passed.push('Database schema includes all required tables');
    } else {
      const missing = expectedTables.filter(t => !tables.includes(t));
      console.log('   ❌ Missing tables:', missing.join(', '));
      results.failed.push(`Missing tables: ${missing.join(', ')}`);
    }
  } catch (e: any) {
    console.log('   ❌ Error checking schema:', e.message);
    results.failed.push('Schema verification failed: ' + e.message);
  }

  // 2. Verify search history functionality
  console.log('\n2️⃣ Verifying search history functionality...');
  try {
    const testVideoId = 'test_' + Date.now();
    await addSearchHistory('https://youtube.com/watch?v=test123', testVideoId, 'Test Video', 'https://example.com/thumb.jpg');

    const history = await getSearchHistory(10);
    const testEntry = history.find(h => h.videoId === testVideoId);

    if (testEntry) {
      console.log('   ✅ Search history entry created and retrieved');
      console.log('      - Video ID:', testEntry.videoId);
      console.log('      - Query:', testEntry.query);
      console.log('      - Is Short:', testEntry.isShort);
      results.passed.push('Search history tracking works');
    } else {
      console.log('   ❌ Search history entry not found');
      results.failed.push('Search history entry not retrieved');
    }

    // Cleanup
    await db.searchHistory.where('videoId').equals(testVideoId).delete();
  } catch (e: any) {
    console.log('   ❌ Search history error:', e.message);
    results.failed.push('Search history failed: ' + e.message);
  }

  // 3. Verify analytics events
  console.log('\n3️⃣ Verifying analytics events...');
  try {
    await trackAnalyticsEvent('scan_started', 'test_video_123', { scanMode: 'smart' });
    await trackAnalyticsEvent('api_call', 'test_video_123', { apiEndpoint: 'commentThreads' });

    const events = await getAnalyticsEvents(undefined, 10);
    const scanEvents = events.filter(e => e.eventType === 'scan_started');

    if (scanEvents.length > 0) {
      console.log('   ✅ Analytics events tracked successfully');
      console.log('      - Total events retrieved:', events.length);
      console.log('      - Scan events:', scanEvents.length);
      results.passed.push('Analytics events tracking works');
    } else {
      console.log('   ❌ Analytics events not found');
      results.failed.push('Analytics events not retrieved');
    }

    // Cleanup
    await db.analyticsEvents.where('videoId').equals('test_video_123').delete();
  } catch (e: any) {
    console.log('   ❌ Analytics events error:', e.message);
    results.failed.push('Analytics events failed: ' + e.message);
  }

  // 4. Verify content type metrics
  console.log('\n4️⃣ Verifying content type metrics...');
  try {
    const metrics = await getContentTypeMetrics('test_video_123');
    console.log('   ✅ Content type metrics queryable');
    console.log('      - Metrics entries:', metrics.length);
    results.passed.push('Content type metrics query works');
  } catch (e: any) {
    console.log('   ❌ Content type metrics error:', e.message);
    results.failed.push('Content type metrics failed: ' + e.message);
  }

  // 5. Verify daily stats
  console.log('\n5️⃣ Verifying daily stats...');
  try {
    const stats = await getDailyStats();
    console.log('   ✅ Daily stats retrieved');
    console.log('      - Searches:', stats.searches);
    console.log('      - Scans:', stats.scans);
    console.log('      - API Calls:', stats.apiCalls);
    results.passed.push('Daily stats calculation works');
  } catch (e: any) {
    console.log('   ❌ Daily stats error:', e.message);
    results.failed.push('Daily stats failed: ' + e.message);
  }

  // 6. Verify API call counting
  console.log('\n6️⃣ Verifying API call counting...');
  try {
    const count = await getTotalApiCalls();
    console.log('   ✅ Total API calls retrieved');
    console.log('      - Total API calls:', count);
    results.passed.push('API call counting works');
  } catch (e: any) {
    console.log('   ❌ API call counting error:', e.message);
    results.failed.push('API call counting failed: ' + e.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(f => console.log('  -', f));
  }

  if (results.failed.length === 0) {
    console.log('\n🎉 All verification tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }

  // Close database
  await db.close();

  return results.failed.length === 0;
}

// Run verification
verifyAnalyticsImplementation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Verification failed with error:', error);
    process.exit(1);
  });
