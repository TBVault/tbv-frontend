'use client';

import { useEffect } from 'react';

export default function ViewportHeightFix() {
  useEffect(() => {
    function setViewportHeight() {
      // Use visualViewport.height if available (accounts for keyboard)
      // Otherwise fall back to window.innerHeight
      let height: number;
      if (window.visualViewport) {
        height = window.visualViewport.height;
      } else {
        height = window.innerHeight;
      }
      const vh = height * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // Set initial value immediately
    setViewportHeight();

    // Update on resize and orientation change
    const handleResize = () => {
      setViewportHeight();
    };
    
    const handleOrientationChange = () => {
      // Delay slightly to ensure accurate height after orientation change
      setTimeout(setViewportHeight, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Listen for visual viewport changes (mobile browser UI show/hide and keyboard)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setViewportHeight);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setViewportHeight);
      }
    };
  }, []);

  return null;
}

