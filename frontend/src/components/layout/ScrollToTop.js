import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component
 * Automatically scrolls to top when route changes
 * 
 * @param {Object} props
 * @param {boolean} props.smooth - Use smooth scroll animation (default: true)
 */
const ScrollToTop = ({ smooth = true }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? "smooth" : "auto"
    });
  }, [pathname, smooth]);

  return null;
};

export default ScrollToTop;
