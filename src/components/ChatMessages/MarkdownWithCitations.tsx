import ReactMarkdown from 'react-markdown';
import type { ChatObject, TranscriptCitation } from '@/api/generated/schemas';
import type { CitationMetadata } from './types';
import { ChatObjectRenderer } from './ChatObjectRenderer';

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
  let combinedText = '';
  const citations: ChatObject[] = [];
  const citationPlaceholder = '__CITATION__';
  
  segments.forEach((segment) => {
    if (segment.type === 'text') {
      combinedText += segment.content as string;
    } else {
      const citationIndex = citations.length;
      combinedText += `${citationPlaceholder}${citationIndex}${citationPlaceholder}`;
      citations.push(segment.content as ChatObject);
    }
  });

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

  combinedText = combinedText.replace(
    new RegExp(`${citationPlaceholder}(\\d+)${citationPlaceholder}${citationPlaceholder}(\\d+)${citationPlaceholder}`, 'g'),
    (match, index1, index2) => `${citationPlaceholder}${index1}${citationPlaceholder} ${citationPlaceholder}${index2}${citationPlaceholder}`
  );

  let processedText = combinedText.replace(
    new RegExp(`${citationPlaceholder}(\\d+)${citationPlaceholder}`, 'g'),
    (match, index) => `\`CITATION_${index}\``
  );
  
  processedText = processedText.replace(/(`CITATION_-?\d+`)(`CITATION_-?\d+`)+/g, (match) => {
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
          let codeText = '';
          
          if (node && 'children' in node && Array.isArray(node.children) && node.children.length > 0) {
            const firstChild = node.children[0];
            if (firstChild && typeof firstChild === 'object' && 'value' in firstChild) {
              codeText = String(firstChild.value);
            }
          }
          
          if (!codeText) {
            if (typeof children === 'string') {
              codeText = children;
            } else if (Array.isArray(children)) {
              codeText = children.map(c => typeof c === 'string' ? c : String(c)).join('');
            } else {
              codeText = String(children);
            }
          }
          
          const trimmed = codeText.trim();
          const citationMatch = trimmed.match(/^CITATION_(-?\d+)$/);
          
          if (citationMatch) {
            const citationIndex = parseInt(citationMatch[1], 10);
            if (citationIndex >= 0 && citationIndex < citations.length) {
              return <CitationPill index={citationIndex} />;
            }
          }
          
          const mergedMatch = trimmed.match(/^CITATION_(-?\d+)(?:CITATION_(-?\d+))+$/);
          if (mergedMatch) {
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
          
          const isInline = !className;
          return isInline ? (
            <code className="bg-foreground-muted/20 px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
              {children}
            </code>
          ) : (
            <code className={className}>{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-background-tertiary p-3 rounded-lg overflow-x-auto mb-1 text-sm border border-border">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary-500 pl-3 italic my-1 text-foreground-secondary">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} className="text-primary-400 hover:text-primary-300 underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        h1: ({ children }) => <h1 className="text-xl font-bold mt-10 mb-2 first:mt-0 text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mt-8 mb-1.5 first:mt-0 text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-6 mb-1 first:mt-0 text-foreground">{children}</h3>,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {processedText}
    </ReactMarkdown>
  );
}
