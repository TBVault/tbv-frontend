'use client';

import { useEffect } from 'react';

/**
 * Scrolls to top when the component mounts, but only if there's no hash anchor.
 * This fixes the issue where Next.js scroll restoration preserves
 * scroll position when navigating from one page type to another.
 * 
 * If there's a hash anchor (e.g., #chunk-5), we let the browser
 * handle scrolling to that anchor naturally.
 */
export default function ScrollToTop() {
  useEffect(() => {
    // Don't scroll to top if there's a hash anchor in the URL
    if (window.location.hash) {
      return;
    }
    
    // Scroll to top immediately
    window.scrollTo(0, 0);
    
    // Also check and scroll after a brief moment to catch any
    // scroll restoration that happens asynchronously
    const timeoutId = setTimeout(() => {
      // Double-check that hash wasn't added in the meantime
      if (!window.location.hash && window.scrollY > 0) {
        window.scrollTo(0, 0);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}
