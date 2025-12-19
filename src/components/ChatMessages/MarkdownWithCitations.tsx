import ReactMarkdown from 'react-markdown';
import type { ChatObject, TranscriptCitation } from '@/api/generated/schemas';
import type { CitationMetadata } from './types';
import { ChatObjectRenderer } from './ChatObjectRenderer';

// Component to render markdown with inline citations embedded at exact positions
export function MarkdownWithCitations({ 
  segments,
  citationMap,
  transcriptTitles,
  webTitles,
  onTranscriptClick
}: { 
  segments: Array<{ type: 'text' | 'citation'; content: string | ChatObject }>;
  citationMap: Map<string, CitationMetadata>;
  transcriptTitles: Map<string, string>;
  webTitles: Map<string, string>;
  onTranscriptClick: (citation: TranscriptCitation, number: number) => void;
}) {
  // Build text with citation placeholders and store citations
  let combinedText = '';
  const citations: ChatObject[] = [];
  const citationPlaceholder = '__CITATION__';
  
  segments.forEach((segment) => {
    if (segment.type === 'text') {
      combinedText += segment.content as string;
    } else {
      // Insert placeholder and store citation
      const citationIndex = citations.length;
      combinedText += `${citationPlaceholder}${citationIndex}${citationPlaceholder}`;
      citations.push(segment.content as ChatObject);
    }
  });

  // Create custom component for citations
  const CitationPill = ({ index }: { index: number }) => {
    if (index >= citations.length) {
      return null;
    }
    
    const chatObject = citations[index];
    const rendered = (
      <ChatObjectRenderer
        chatObject={chatObject}
        citationMap={citationMap}
        transcriptTitles={transcriptTitles}
        webTitles={webTitles}
        onTranscriptClick={onTranscriptClick}
      />
    );
    
    if (!rendered) {
      return null;
    }
    
    return (
      <span className="inline-flex align-baseline mx-0.5">
        {rendered}
      </span>
    );
  };

  // First, add spaces between adjacent citation placeholders to prevent ReactMarkdown from merging them
  // Handle case where citation is followed immediately by another citation (no character in between)
  combinedText = combinedText.replace(
    new RegExp(`${citationPlaceholder}(\\d+)${citationPlaceholder}${citationPlaceholder}(\\d+)${citationPlaceholder}`, 'g'),
    (match, index1, index2) => `${citationPlaceholder}${index1}${citationPlaceholder} ${citationPlaceholder}${index2}${citationPlaceholder}`
  );

  // Process text to replace placeholders with inline code that we can intercept
  // Use inline code syntax that ReactMarkdown will process
  let processedText = combinedText.replace(
    new RegExp(`${citationPlaceholder}(\\d+)${citationPlaceholder}`, 'g'),
    (match, index) => `\`CITATION_${index}\``
  );
  
  // Final safety check: ensure adjacent inline code citations have spaces between them
  // This handles any edge cases where citations might still be adjacent
  // Match sequences of adjacent citation code blocks (e.g., `CITATION_0``CITATION_1``CITATION_2`)
  // and add spaces between them
  processedText = processedText.replace(/(`CITATION_-?\d+`)(`CITATION_-?\d+`)+/g, (match) => {
    // Replace all double backticks (``) with space + backtick (` `)
    return match.replace(/``/g, '` `');
  });

  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 mt-4 first:mt-0 last:mb-0 leading-normal">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-1 space-y-0">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-1 space-y-0">{children}</ol>,
        li: ({ children }) => <li className="leading-normal mb-0">{children}</li>,
        code: ({ children, className, node }) => {
          // Check if this is a citation placeholder by examining the node
          // ReactMarkdown passes the raw value in node.children[0].value for code nodes
          let codeText = '';
          
          if (node && 'children' in node && Array.isArray(node.children) && node.children.length > 0) {
            const firstChild = node.children[0];
            if (firstChild && typeof firstChild === 'object' && 'value' in firstChild) {
              codeText = String(firstChild.value);
            }
          }
          
          // Fallback to children if node doesn't have the value
          if (!codeText) {
            if (typeof children === 'string') {
              codeText = children;
            } else if (Array.isArray(children)) {
              codeText = children.map(c => typeof c === 'string' ? c : String(c)).join('');
            } else {
              codeText = String(children);
            }
          }
          
          // Check if this matches our citation pattern
          // Handle both positive and negative numbers (e.g., CITATION_0, CITATION_-1)
          const trimmed = codeText.trim();
          const citationMatch = trimmed.match(/^CITATION_(-?\d+)$/);
          
          if (citationMatch) {
            const citationIndex = parseInt(citationMatch[1], 10);
            // Only render if index is valid (non-negative and within bounds)
            if (citationIndex >= 0 && citationIndex < citations.length) {
              return <CitationPill index={citationIndex} />;
            }
          }
          
          // Also check if multiple citations got merged (e.g., CITATION_0CITATION_1)
          // This can happen if ReactMarkdown merges adjacent inline code blocks
          const mergedMatch = trimmed.match(/^CITATION_(-?\d+)(?:CITATION_(-?\d+))+$/);
          if (mergedMatch) {
            // Extract all citation indices from merged string
            const allMatches = trimmed.match(/CITATION_(-?\d+)/g);
            if (allMatches) {
              return (
                <>
                  {allMatches.map((match, idx) => {
                    const indexMatch = match.match(/CITATION_(-?\d+)/);
                    if (indexMatch) {
                      const citationIndex = parseInt(indexMatch[1], 10);
                      if (citationIndex >= 0 && citationIndex < citations.length) {
                        return <CitationPill key={idx} index={citationIndex} />;
                      }
                    }
                    return null;
                  })}
                </>
              );
            }
          }
          
          // Regular inline code
          const isInline = !className;
          return isInline ? (
            <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-gray-100 p-2 rounded-lg overflow-x-auto mb-1 text-sm">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gray-300 pl-3 italic my-1 text-gray-700">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        h1: ({ children }) => <h1 className="text-xl font-bold mt-10 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mt-8 mb-1.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-6 mb-1 first:mt-0">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {processedText}
    </ReactMarkdown>
  );
}

