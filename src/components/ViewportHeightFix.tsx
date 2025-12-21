'use client';

import { useEffect } from 'react';

export default function ViewportHeightFix() {
  useEffect(() => {
    function setViewportHeight() {
      const vh = window.innerHeight * 0.01;
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
    
    // Also listen for visual viewport changes (mobile browser UI show/hide)
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

