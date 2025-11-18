import { useCallback } from 'react';

/**
 * Custom hook to scroll to top programmatically
 * 
 * @returns {Function} scrollToTop function
 * 
 * @example
 * const scrollToTop = useScrollToTop();
 * 
 * // Smooth scroll
 * scrollToTop();
 * 
 * // Instant scroll
 * scrollToTop(false);
 */
const useScrollToTop = () => {
  const scrollToTop = useCallback((smooth = true) => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }, []);

  return scrollToTop;
};

export default useScrollToTop;
