import { useEffect } from 'react';

/**
 * Hook to track recently viewed products
 * Stores product IDs in localStorage
 * Max 10 products, most recent first
 */
const useRecentlyViewed = (productId) => {
  useEffect(() => {
    if (!productId) return;

    try {
      // Get current list
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      
      // Remove if already exists (to move to front)
      const filtered = recentlyViewed.filter(id => id !== productId);
      
      // Add to front
      const updated = [productId, ...filtered].slice(0, 10); // Keep max 10
      
      // Save to localStorage
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
      
      // Dispatch custom event for components to listen
      window.dispatchEvent(new Event('recentlyViewedUpdated'));
    } catch (error) {
      console.error('Error updating recently viewed:', error);
    }
  }, [productId]);
};

export default useRecentlyViewed;
