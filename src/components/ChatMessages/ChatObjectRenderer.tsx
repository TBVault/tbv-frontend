import type { 
  ChatObject,
  TranscriptCitation,
  WebSearchCitation,
  Transcript,
} from '@/api/generated/schemas';
import type { CitationMetadata } from './types';
import { TranscriptPreviewPopover } from './TranscriptPreviewPopover';

export function ChatObjectRenderer({ 
  chatObject, 
  citationMap,
  transcriptTitles,
  webTitles,
  transcriptData,
}: { 
  chatObject: ChatObject;
  citationMap: Map<string, CitationMetadata>;
  transcriptTitles: Map<string, string>;
  webTitles: Map<string, string>;
  transcriptData?: Map<string, Transcript>;
}) {
  const data = chatObject.data;

  if (data.type === 'text_delta') {
    return null;
  }

  if (data.type === 'chat_progress') {
    return null;
  }

  if (data.type === 'transcript_citation') {
    const citation = data as TranscriptCitation;
    const key = `transcript-${citation.transcript_id}-${citation.chunk_index}`;
    const metadata = citationMap.get(key);
    const title = transcriptTitles.get(citation.transcript_id) || 'Transcript';
    const truncatedTitleMobile = title.length > 8 ? title.substring(0, 8) + '...' : title;
    const truncatedTitleDesktop = title.length > 20 ? title.substring(0, 20) + '...' : title;
    const transcript = transcriptData?.get(citation.transcript_id);
    const isLoading = !transcript && transcriptData !== undefined;
    
    const pillContent = (
      <span
        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-full text-sm font-medium transition-colors cursor-pointer select-none"
      >
        <span className="inline-flex items-center justify-center w-4 h-4 bg-primary-500 text-white text-xs font-bold rounded-full">
          {metadata?.number || '?'}
        </span>
        <svg className="w-3.5 h-3.5 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs sm:hidden">{truncatedTitleMobile}</span>
        <span className="text-xs hidden sm:inline">{truncatedTitleDesktop}</span>
      </span>
    );
    
    return (
      <TranscriptPreviewPopover
        citation={citation}
        citationNumber={metadata?.number || 0}
        transcript={transcript}
        transcriptTitle={title}
        isLoading={isLoading}
      >
        {pillContent}
      </TranscriptPreviewPopover>
    );
  }

  if (data.type === 'web_search_citation') {
    const citation = data as WebSearchCitation;
    const key = `web-${citation.url}`;
    const metadata = citationMap.get(key);
    const title = webTitles.get(citation.url);
    const displayText = title || new URL(citation.url).hostname.replace('www.', '');
    const truncatedTextMobile = displayText.length > 8 ? displayText.substring(0, 8) + '...' : displayText;
    const truncatedTextDesktop = displayText.length > 20 ? displayText.substring(0, 20) + '...' : displayText;
    
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-500/20 hover:bg-secondary-500/30 text-secondary-400 rounded-full text-sm font-medium transition-colors select-none"
        title={title || citation.url}
      >
        <span className="inline-flex items-center justify-center w-4 h-4 bg-secondary-500 text-white text-xs font-bold rounded-full">
          {metadata?.number || '?'}
        </span>
        <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
        <span className="text-xs sm:hidden">{truncatedTextMobile}</span>
        <span className="text-xs hidden sm:inline">{truncatedTextDesktop}</span>
      </a>
    );
  }

  if (data.type === 'chat_topic') {
    return null;
  }

  return null;
}
