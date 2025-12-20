/**
 * Cache revalidation utilities for Next.js
 * 
 * These functions can be used to manually revalidate cached data
 * when content is updated (e.g., after creating/updating transcripts)
 */

import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * Revalidate all transcript-related caches
 */
export async function revalidateTranscripts() {
  revalidateTag('transcripts', 'max');
  revalidateTag('home', 'max');
}

/**
 * Revalidate a specific transcript by its public ID
 */
export async function revalidateTranscript(publicId: string) {
  revalidateTag(`transcript-${publicId}`, 'max');
  revalidateTag('transcript', 'max');
  revalidateTag('transcripts', 'max'); // Also revalidate the list
}

/**
 * Revalidate the home page
 */
export async function revalidateHome() {
  revalidatePath('/', 'page');
  revalidateTag('home', 'max');
}

/**
 * Revalidate the transcripts list page
 */
export async function revalidateTranscriptsList() {
  revalidatePath('/transcripts', 'page');
  revalidateTag('transcripts', 'max');
}

/**
 * Revalidate chat sessions cache
 */
export async function revalidateChatSessions() {
  revalidateTag('chat-sessions', 'max');
  revalidatePath('/chat', 'page');
}
