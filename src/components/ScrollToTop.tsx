'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Scrolls to top when the component mounts, but only if there's no hash anchor.
 * This fixes the issue where Next.js scroll restoration preserves
 * scroll position when navigating from one page type to another.
 * 
 * If there's a hash anchor (e.g., #chunk-5), we wait for the element
 * to be hydrated and then scroll to it.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    const main = document.querySelector('main');
    const scrollTarget = main || window;
    
    // By default, scroll to top immediately if there's no anchor
    if (!hash) {
      scrollTarget.scrollTo(0, 0);
      
      // Also check and scroll after a brief moment to catch any
      // scroll restoration that happens asynchronously
      const timeoutId = setTimeout(() => {
        // Double-check that hash wasn't added in the meantime
        if (!window.location.hash) {
          const currentScroll = main ? main.scrollTop : window.scrollY;
          if (currentScroll > 0) {
            scrollTarget.scrollTo(0, 0);
          }
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
    
    // If there's a hash anchor, wait for it to be hydrated before scrolling
    const targetId = hash.slice(1); // Remove the '#' prefix
    
    // Prevent browser's default scroll-to-anchor behavior initially
    // by scrolling to top first, then we'll scroll to the anchor once hydrated
    scrollTarget.scrollTo(0, 0);
    
    const scrollToAnchor = () => {
      const element = document.getElementById(targetId);
      if (element) {
        // Element is hydrated, scroll to it
        const headerHeight = 78; // Match the header height used elsewhere
        
        // Calculate offset based on container
        let scrollTo = 0;
        
        if (main) {
           const elementTop = element.getBoundingClientRect().top;
           const containerTop = main.getBoundingClientRect().top;
           // Relative position inside the container + current scroll
           scrollTo = main.scrollTop + (elementTop - containerTop) - headerHeight;
        } else {
           const elementTop = element.getBoundingClientRect().top + window.pageYOffset;
           scrollTo = elementTop - headerHeight;
        }
        
        scrollTarget.scrollTo({
          top: scrollTo,
          behavior: 'smooth',
        });
        return true;
      }
      return false;
    };
    
    // Try immediately (in case it's already hydrated)
    if (scrollToAnchor()) {
      return;
    }
    
    // Poll for the element to appear (with a max timeout)
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max (50 * 100ms)
    const pollInterval = setInterval(() => {
      attempts++;
      if (scrollToAnchor() || attempts >= maxAttempts) {
        clearInterval(pollInterval);
      }
    }, 100);
    
    return () => clearInterval(pollInterval);
  }, [pathname]);

  return null;
}
