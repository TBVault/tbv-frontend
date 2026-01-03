import type { 
  ChatSessionMessage, 
  TranscriptCitation,
  WebSearchCitation,
  TextDelta,
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

export function generateCopyText(
  message: ChatSessionMessage,
  citations: CitationMetadata[],
  citationMap: Map<string, CitationMetadata>,
  transcriptTitles: Map<string, string>,
  webTitles: Map<string, string>
): string {
  let text = '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  message.content.forEach((item) => {
    if (item.data.type === 'text_delta') {
      text += (item.data as TextDelta).delta;
    } else if (item.data.type === 'transcript_citation') {
      const citation = item.data as TranscriptCitation;
      const key = `transcript-${citation.transcript_id}-${citation.chunk_index}`;
      const metadata = citationMap.get(key);
      if (metadata) {
        const url = `${origin}/transcript/${citation.transcript_id}${citation.chunk_index >= 0 ? `#chunk-${citation.chunk_index}` : ''}`;
        text += ` [[${metadata.number}]](${url})`;
      }
    } else if (item.data.type === 'web_search_citation') {
      const citation = item.data as WebSearchCitation;
      const key = `web-${citation.url}`;
      const metadata = citationMap.get(key);
      if (metadata) {
        text += ` [[${metadata.number}]](${citation.url})`;
      }
    }
  });

  if (citations.length > 0) {
    text += '\n\nSources:';
    citations.forEach((metadata) => {
      text += '\n';
      if (metadata.type === 'transcript') {
        const citation = metadata.citation as TranscriptCitation;
        const title = transcriptTitles.get(citation.transcript_id) || 'Transcript';
        const url = `${origin}/transcript/${citation.transcript_id}${citation.chunk_index >= 0 ? `#chunk-${citation.chunk_index}` : ''}`;
        const detail = citation.chunk_index >= 0 ? `Paragraph ${citation.chunk_index + 1}` : 'Transcript Summary';
        text += `* [[${metadata.number}] ${title} | ${detail}](${url})`;
      } else {
        const citation = metadata.citation as WebSearchCitation;
        const title = webTitles.get(citation.url);
        const fallbackTitle = new URL(citation.url).hostname.replace('www.', '');
        const displayTitle = title || fallbackTitle;
        const displayText = `${displayTitle} | ${citation.url.split('#')[0]}`;
        text += `* [[${metadata.number}] ${displayText}](${citation.url})`;
      }
    });
  }

  return text;
}

