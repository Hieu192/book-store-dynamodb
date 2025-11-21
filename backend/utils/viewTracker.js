/**
 * View Tracker Utility
 * Track product views to generate "Customers Also Viewed" recommendations
 * Uses in-memory storage (can be replaced with Redis for production)
 */

class ViewTracker {
  constructor() {
    // Store: productId -> Set of other productIds viewed in same sessions
    this.viewPairs = new Map();
    // Store: sessionId -> Set of productIds viewed
    this.sessionViews = new Map();
    // Cleanup old sessions every hour
    this.startCleanup();
  }

  /**
   * Track a product view in a session
   */
  trackView(sessionId, productId) {
    if (!sessionId || !productId) return;

    // Get or create session views
    if (!this.sessionViews.has(sessionId)) {
      this.sessionViews.set(sessionId, {
        products: new Set(),
        lastActivity: Date.now()
      });
    }

    const session = this.sessionViews.get(sessionId);
    const previousProducts = Array.from(session.products);

    // Add current product to session
    session.products.add(productId);
    session.lastActivity = Date.now();

    // Create view pairs with previously viewed products
    previousProducts.forEach(prevProductId => {
      if (prevProductId !== productId) {
        this.addViewPair(prevProductId, productId);
        this.addViewPair(productId, prevProductId);
      }
    });
  }

  /**
   * Add a view pair (productA was viewed with productB)
   */
  addViewPair(productA, productB) {
    if (!this.viewPairs.has(productA)) {
      this.viewPairs.set(productA, new Map());
    }

    const pairs = this.viewPairs.get(productA);
    const currentCount = pairs.get(productB) || 0;
    pairs.set(productB, currentCount + 1);
  }

  /**
   * Get products also viewed with this product
   */
  getAlsoViewed(productId, limit = 6) {
    if (!this.viewPairs.has(productId)) {
      return [];
    }

    const pairs = this.viewPairs.get(productId);
    
    // Sort by view count and return top N
    return Array.from(pairs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ productId: id, viewCount: count }));
  }

  /**
   * Cleanup old sessions (older than 24 hours)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessionViews.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessionViews.delete(sessionId);
      }
    }

    console.log(`🧹 ViewTracker cleanup: ${this.sessionViews.size} active sessions`);
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      activeSessions: this.sessionViews.size,
      trackedProducts: this.viewPairs.size,
      totalViewPairs: Array.from(this.viewPairs.values())
        .reduce((sum, pairs) => sum + pairs.size, 0)
    };
  }
}

// Singleton instance
const viewTracker = new ViewTracker();

module.exports = viewTracker;
