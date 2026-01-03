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
  isStreaming?: boolean;
}

export interface TranscriptOverlayProps {
  citation: TranscriptCitation;
  citationNumber: number;
  authToken: string | undefined;
  preFetchedTranscript?: Transcript | null;
  fetchingPromise?: Promise<void>;
  getTranscript?: (id: string) => Transcript | undefined;
  onClose: () => void;
}

export interface CitationMetadata {
  type: 'transcript' | 'web';
  citation: TranscriptCitation | WebSearchCitation;
  number: number;
  title?: string;
}

