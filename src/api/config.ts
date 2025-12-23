/**
 * API configuration for client-side usage
 */

// Get backend URL from environment variable
// This will be replaced at build time by Next.js
export const BACKEND_URL = typeof window !== 'undefined'
  ? '/api/proxy'
  : (process.env.NEXT_PUBLIC_BACKEND_URL || '');

/**
 * Constructs a full URL from a relative API path
 * @param relativePath - The relative path (e.g., "/protected/chat_session/123/new_message")
 * @returns The full URL including the backend base URL
 */
export function getFullUrl(relativePath: string): string {
  return `${BACKEND_URL}${relativePath}`;
}

