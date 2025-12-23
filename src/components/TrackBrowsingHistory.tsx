'use client';

import { useRef, useEffect } from 'react';
import { trackTranscriptView } from '@/app/actions';
import { useSidebar } from '@/contexts/SidebarContext';

interface TrackBrowsingHistoryProps {
  transcriptId: string;
}

/**
 * Client component that tracks transcript views and revalidates the sidebar.
 * Uses a server action to properly handle revalidation.
 */
export default function TrackBrowsingHistory({ transcriptId }: TrackBrowsingHistoryProps) {
  const { refreshBrowsingHistory } = useSidebar();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackTranscriptView(transcriptId)
      .then((result) => {
        if (result.success) {
          refreshBrowsingHistory();
        }
      })
      .catch(() => {
        // Silently ignore errors - browsing history is non-critical
      });
  }, [transcriptId, refreshBrowsingHistory]);

  return null;
}
