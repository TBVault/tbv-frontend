'use client';

import { useRef, useEffect } from 'react';
import { trackTranscriptView } from '@/app/actions';
import { useSidebar } from '@/contexts/SidebarContext';
import type { BrowsingHistory } from '@/api/generated/schemas';

interface TrackBrowsingHistoryProps {
  transcriptId: string;
}

/**
 * Client component that tracks transcript views and revalidates the sidebar.
 * Uses a server action to properly handle revalidation.
 */
export default function TrackBrowsingHistory({ transcriptId }: TrackBrowsingHistoryProps) {
  const { updateBrowsingHistory } = useSidebar();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackTranscriptView(transcriptId)
      .then((result) => {
        // Now result.data contains the updated history
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (result.success && (result as any).data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const history = [...(result as any).data] as BrowsingHistory[];
          const currentItemIndex = history.findIndex((item) => item.transcript_id === transcriptId);
          
          if (currentItemIndex !== -1) {
            // Optimistically update the timestamp to ensure it moves to top
            // Use current time, but make sure it's at least slightly newer than the newest existing item
            // to avoid sorting collisions if multiple interactions happen quickly
            const now = Math.floor(Date.now() / 1000);
            const newestTime = history.reduce((max, item) => Math.max(max, item.last_accessed_on), 0);
            
            history[currentItemIndex] = {
              ...history[currentItemIndex],
              last_accessed_on: Math.max(now, newestTime + 1)
            };
          }
          
          updateBrowsingHistory(history);
        }
      })
      .catch(() => {
        // Silently ignore errors - browsing history is non-critical
      });
  }, [transcriptId, updateBrowsingHistory]);

  return null;
}
