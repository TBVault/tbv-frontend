import type { ChatObject } from '@/api/generated/schemas';

/**
 * Process a streaming buffer to extract complete JSON objects
 * Used for parsing Server-Sent Events from chat streaming endpoints
 */
export function processStreamBuffer(
  bufferToParse: string,
  onObject: (obj: ChatObject) => void
): string {
  if (!bufferToParse.trim()) return '';

  let remaining = bufferToParse;
  let braceCount = 0;
  let startIdx = -1;

  for (let i = 0; i < bufferToParse.length; i++) {
    const char = bufferToParse[i];

    if (char === '{') {
      if (braceCount === 0) startIdx = i;
      braceCount++;
    } else if (char === '}') {
      braceCount--;

      if (braceCount === 0 && startIdx !== -1) {
        const jsonStr = bufferToParse.substring(startIdx, i + 1);

        try {
          const chatObject: ChatObject = JSON.parse(jsonStr);
          onObject(chatObject);
        } catch (e) {
          // Skip invalid JSON
        }

        remaining = bufferToParse.substring(i + 1);
        return processStreamBuffer(remaining, onObject);
      }
    }
  }

  return remaining;
}

