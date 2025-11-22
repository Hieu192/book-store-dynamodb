import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component
 * Automatically scrolls to top when route changes
 * Ensures scroll happens reliably across all browsers
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Method 1: Standard window.scrollTo
    window.scrollTo(0, 0);

    // Method 2: Direct DOM manipulation (more reliable)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // For older browsers

    // Method 3: Delayed scroll to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });

    // Method 4: Additional timeout for complex layouts
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);

    console.log('📍 ScrollToTop triggered for:', pathname);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
