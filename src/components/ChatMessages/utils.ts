import type { 
  ChatSessionMessage, 
  TranscriptCitation,
  WebSearchCitation,
} from '@/api/generated/schemas';
import type { CitationMetadata } from './types';

// Helper function to format timestamp
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Helper to extract citations from a message
export function extractCitations(message: ChatSessionMessage): CitationMetadata[] {
  const citations: CitationMetadata[] = [];
  const seen = new Set<string>();
  let number = 1;

  message.content.forEach((chatObject) => {
    const data = chatObject.data;
    
    if (data.type === 'transcript_citation') {
      const citation = data as TranscriptCitation;
      const key = `transcript-${citation.transcript_id}-${citation.chunk_index}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          type: 'transcript',
          citation,
          number: number++,
        });
      }
    } else if (data.type === 'web_search_citation') {
      const citation = data as WebSearchCitation;
      const key = `web-${citation.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        citations.push({
          type: 'web',
          citation,
          number: number++,
        });
      }
    }
  });

  return citations;
}

