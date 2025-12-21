'use client';

import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

interface MobilePageHeaderProps {
  title: string;
}

export default function MobilePageHeader({ title }: MobilePageHeaderProps) {
  const { toggleMobileSidebar } = useMobileSidebar();

  return (
    <header className="sticky top-0 z-35 bg-background flex items-center gap-3 px-4 py-3 border-b border-border min-h-[56px] lg:hidden">
      <button
        onClick={toggleMobileSidebar}
        className="p-1 -ml-1 text-foreground-secondary hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-foreground truncate">
        {title}
      </h1>
    </header>
  );
}

