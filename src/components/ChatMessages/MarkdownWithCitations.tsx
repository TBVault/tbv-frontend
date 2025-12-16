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

  // Process text to replace placeholders with inline code that we can intercept
  // Use inline code syntax that ReactMarkdown will process
  // Add a space between adjacent citations to prevent ReactMarkdown from merging them into one code block
  let processedText = combinedText.replace(
    new RegExp(`${citationPlaceholder}(\\d+)${citationPlaceholder}`, 'g'),
    (match, index) => `\`CITATION_${index}\``
  );
  
  // Add a space between adjacent inline code blocks to prevent merging
  // This regex finds two adjacent backtick-wrapped code blocks and adds a space between them
  processedText = processedText.replace(/`([^`]+)`([ \n]*?)`([^`]+)`/g, (match, code1, space, code2) => {
    // If both are citation placeholders, add a space
    if (code1.match(/^CITATION_\d+$/) && code2.match(/^CITATION_\d+$/)) {
      return `\`${code1}\` \`${code2}\``;
    }
    return match; // Keep original if not both citations
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
          const trimmed = codeText.trim();
          const citationMatch = trimmed.match(/^CITATION_(\d+)$/);
          
          if (citationMatch) {
            const citationIndex = parseInt(citationMatch[1], 10);
            return <CitationPill index={citationIndex} />;
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

