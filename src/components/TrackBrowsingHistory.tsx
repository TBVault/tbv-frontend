'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trackTranscriptView } from '@/app/actions';

interface TrackBrowsingHistoryProps {
  transcriptId: string;
}

/**
 * Client component that tracks transcript views and revalidates the sidebar.
 * Uses a server action to properly handle revalidation.
 */
export default function TrackBrowsingHistory({ transcriptId }: TrackBrowsingHistoryProps) {
  const router = useRouter();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    trackTranscriptView(transcriptId)
      .then((result) => {
        if (result.success) {
          router.refresh();
        }
      })
      .catch(() => {
        // Silently ignore errors - browsing history is non-critical
      });
  }, [transcriptId, router]);

  return null;
}
