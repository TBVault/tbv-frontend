import type { 
  ChatSessionMessage, 
  TranscriptCitation,
  WebSearchCitation,
  Transcript,
} from '@/api/generated/schemas';

export interface ChatMessagesProps {
  messages: ChatSessionMessage[];
  preFetchedTranscripts?: Map<string, Transcript>;
  onChatTopic?: (topic: string) => void;
}

export interface TranscriptOverlayProps {
  citation: TranscriptCitation;
  citationNumber: number;
  authToken: string | undefined;
  preFetchedTranscript?: Transcript | null;
  onClose: () => void;
}

export interface CitationMetadata {
  type: 'transcript' | 'web';
  citation: TranscriptCitation | WebSearchCitation;
  number: number;
  title?: string;
}

