/**
 * Seed Recommendation Data
 * Tạo mock data cho Customers Also Viewed và Frequently Bought Together
 */

const viewTracker = require('../utils/viewTracker');

// Load environment
if (process.env.NODE_ENV !== 'PRODUCTION') {
  require('dotenv').config({ path: 'backend/config/config.env' });
}

console.log('🌱 Seeding recommendation data...\n');

// ============================================
// 1. CUSTOMERS ALSO VIEWED - Mock Sessions
// ============================================

console.log('👥 Creating mock view sessions...');

// Giả lập 10 sessions với các patterns khác nhau
const mockSessions = [
  {
    sessionId: 'session-001',
    views: ['662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e', '662d0a5fc3eea4473ccf692f']
  },
  {
    sessionId: 'session-002',
    views: ['662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e', '662d0a2fc3eea4473ccf692d']
  },
  {
    sessionId: 'session-003',
    views: ['662d0a76c3eea4473ccf6930', '662d0a5fc3eea4473ccf692f', '662d0a2fc3eea4473ccf692d']
  },
  {
    sessionId: 'session-004',
    views: ['662d0a49c3eea4473ccf692e', '662d0a76c3eea4473ccf6930', '662d0a5fc3eea4473ccf692f']
  },
  {
    sessionId: 'session-005',
    views: ['662d0a5fc3eea4473ccf692f', '662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e']
  },
  {
    sessionId: 'session-006',
    views: ['662d0a2fc3eea4473ccf692d', '662d0a76c3eea4473ccf6930']
  },
  {
    sessionId: 'session-007',
    views: ['662d0a76c3eea4473ccf6930', '662d0a49c3eea4473ccf692e']
  },
  {
    sessionId: 'session-008',
    views: ['662d0a49c3eea4473ccf692e', '662d0a5fc3eea4473ccf692f', '662d0a76c3eea4473ccf6930']
  },
  {
    sessionId: 'session-009',
    views: ['662d0a76c3eea4473ccf6930', '662d0a2fc3eea4473ccf692d', '662d0a49c3eea4473ccf692e']
  },
  {
    sessionId: 'session-010',
    views: ['662d0a5fc3eea4473ccf692f', '662d0a2fc3eea4473ccf692d', '662d0a76c3eea4473ccf6930']
  }
];

// Track all views
mockSessions.forEach(session => {
  session.views.forEach(productId => {
    viewTracker.trackView(session.sessionId, productId);
  });
});

console.log(`✅ Created ${mockSessions.length} mock sessions`);

// Show statistics
const stats = viewTracker.getStats();
console.log('\n📊 ViewTracker Statistics:');
console.log(`   - Active Sessions: ${stats.activeSessions}`);
console.log(`   - Tracked Products: ${stats.trackedProducts}`);
console.log(`   - Total View Pairs: ${stats.totalViewPairs}`);

// Show recommendations for a product
const testProductId = '662d0a76c3eea4473ccf6930';
const recommendations = viewTracker.getAlsoViewed(testProductId, 5);
console.log(`\n🎯 Recommendations for product ${testProductId}:`);
recommendations.forEach((rec, index) => {
  console.log(`   ${index + 1}. Product ${rec.productId} (viewed together ${rec.viewCount} times)`);
});

console.log('\n✅ Customers Also Viewed data seeded successfully!\n');

// ============================================
// 2. FREQUENTLY BOUGHT TOGETHER - Info
// ============================================

console.log('💡 Frequently Bought Together:');
console.log('   This feature analyzes real orders from DynamoDB.');
console.log('   To test it, you need to:');
console.log('   1. Create 2-3 orders containing the same products');
console.log('   2. The system will automatically detect patterns');
console.log('   3. Example: If orders contain [A+B] and [A+C], viewing A will suggest B and C\n');

console.log('🎉 All done! Refresh your frontend to see the recommendations.\n');

process.exit(0);
