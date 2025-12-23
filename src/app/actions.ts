'use server';

import { auth } from '@/auth';
import { addBrowsingHistoryProtectedBrowsingHistoryTranscriptIdPost } from '@/api/generated/endpoints/default/default';

/**
 * Server action to track a transcript view and revalidate the layout.
 */
export async function trackTranscriptView(transcriptId: string) {
  const session = await auth();
  
  if (!session?.idToken) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    await addBrowsingHistoryProtectedBrowsingHistoryTranscriptIdPost(transcriptId, {
      headers: {
        Authorization: session.idToken.trim(),
      },
    });

    // Small delay to ensure DB propagation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Fetch updated browsing history immediately to return to client
    const { browsingHistoryProtectedBrowsingHistoryGet } = await import('@/api/generated/endpoints/default/default');
    const response = await browsingHistoryProtectedBrowsingHistoryGet({
      headers: {
        Authorization: session.idToken.trim(),
      },
      cache: 'no-store',
    });

    if (response.status === 200) {
      return { success: true, data: response.data };
    }

    return { success: true, data: [] }; // Fallback if fetch fails but track succeeded
  } catch (error) {
    console.error('Failed to track browsing history:', error);
    return { success: false, error: 'Failed to track view' };
  }
}

/**
 * Server action to get browsing history.
 * Used by the client to update the sidebar without a full page refresh.
 */
export async function getBrowsingHistory() {
  const session = await auth();
  
  if (!session?.idToken) {
    return { success: false, data: [] };
  }

  try {
    const { browsingHistoryProtectedBrowsingHistoryGet } = await import('@/api/generated/endpoints/default/default');
    const response = await browsingHistoryProtectedBrowsingHistoryGet({
      headers: {
        Authorization: session.idToken.trim(),
      },
      cache: 'no-store',
    });

    if (response.status === 200) {
      return { success: true, data: response.data };
    }
    return { success: false, data: [] };
  } catch (error) {
    console.error('Failed to fetch browsing history:', error);
    return { success: false, data: [] };
  }
}
