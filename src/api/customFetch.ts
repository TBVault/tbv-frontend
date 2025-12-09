/**
 * Custom fetch wrapper for Orval-generated API clients.
 * Handles base URL configuration and can be extended for auth headers.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

/**
 * Custom fetch function that Orval uses for all API calls.
 * @param url - The relative URL path (e.g., "/public/helloworld")
 * @param options - Standard RequestInit options
 * @returns Promise with the response data
 */
export const customFetch = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const fullUrl = `${BACKEND_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`HTTP error! status: ${response.status}, message: ${errorText}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  // Handle empty responses and normalize to { data, status }
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    data: body,
    status: response.status,
  } as T;
};

export default customFetch;
