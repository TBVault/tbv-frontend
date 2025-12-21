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
      
      // On mobile, also set body and html height directly to prevent scrolling
      if (window.innerWidth <= 768) {
        document.body.style.height = `${height}px`;
        document.body.style.maxHeight = `${height}px`;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.height = `${height}px`;
        document.documentElement.style.maxHeight = `${height}px`;
        document.documentElement.style.overflow = 'hidden';
      }
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
      window.visualViewport.addEventListener('scroll', (e) => {
        // Prevent visual viewport scrolling from causing document scroll
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setViewportHeight);
        window.visualViewport.removeEventListener('scroll', () => {});
      }
      // Reset styles on cleanup
      document.body.style.height = '';
      document.body.style.maxHeight = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.maxHeight = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return null;
}

