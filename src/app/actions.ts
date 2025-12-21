'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
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

    // Force revalidate the entire layout to update sidebar
    revalidatePath('/', 'layout');
    
    return { success: true };
  } catch (error) {
    console.error('Failed to track browsing history:', error);
    return { success: false, error: 'Failed to track view' };
  }
}
