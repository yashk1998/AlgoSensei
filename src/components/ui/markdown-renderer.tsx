import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Components } from 'react-markdown';
import { useMemo, useState, useRef, Children, isValidElement } from 'react';
import { Copy, Check } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SvgRenderer } from './svg-renderer';

// Lazy-load Mermaid renderer since it pulls in the heavy mermaid library
const MermaidRenderer = dynamic(
  () => import('./mermaid-renderer').then(m => ({ default: m.MermaidRenderer })),
  { ssr: false, loading: () => <div className="animate-pulse rounded-lg border bg-gray-50 p-6 text-center text-sm text-gray-400">Loading diagram...</div> }
);

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Extract the language and text content from a <pre><code> tree.
 * Returns null when the pre block isn't a fenced code block.
 */
function extractCodeBlock(children: React.ReactNode): { language: string; text: string } | null {
  const child = Children.toArray(children).find(
    (c) => isValidElement(c) && (c.type === 'code' || (c.props as any)?.className?.includes('language-'))
  );

  if (!isValidElement(child)) return null;

  const className: string = (child.props as any).className || '';
  const match = /language-(\w+)/.exec(className);
  const language = match?.[1] || '';
  const text = String((child.props as any).children || '').replace(/\n$/, '');

  return { language, text };
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const mightContainCode = content.includes('```') || content.includes('`') ||
                          content.includes('    ') || content.includes('\t');

  const processedContent = mightContainCode ? content : content.split('\n').join('  \n');

  const components: Components = useMemo(() => ({
    pre: ({ node, className: preClassName, children, ...props }) => {
      const [copied, setCopied] = useState(false);
      const preRef = useRef<HTMLPreElement>(null);

      const block = extractCodeBlock(children);

      // Render SVG blocks as actual inline SVGs
      if (block?.language === 'svg') {
        return <SvgRenderer content={block.text} />;
      }

      // Render Mermaid blocks as diagrams
      if (block?.language === 'mermaid') {
        return <MermaidRenderer chart={block.text} />;
      }

      const copyToClipboard = async () => {
        if (preRef.current) {
          const codeElement = preRef.current.querySelector('code');
          const textContent = codeElement?.textContent || '';
          await navigator.clipboard.writeText(textContent);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      };

      return (
        <div className="relative group">
          {block?.language && (
            <div className="flex items-center justify-between rounded-t-md bg-gray-800 px-4 py-1.5 text-xs text-gray-400">
              <span>{block.language}</span>
            </div>
          )}
          <pre ref={preRef} {...props} className={cn(
            "overflow-auto p-4 bg-gray-900 text-gray-100",
            block?.language ? "rounded-b-md" : "rounded-md",
            preClassName
          )}>
            {children}
          </pre>
          <button
            onClick={copyToClipboard}
            className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      );
    },
    code: ({ node, className: codeClassName, children, ...props }) => {
      const isInline = !codeClassName && typeof children === 'string';
      return (
        <code
          {...props}
          className={cn(
            isInline
              ? "px-1 py-0.5 bg-gray-100 rounded text-sm"
              : "block text-sm",
            codeClassName
          )}
        >
          {children}
        </code>
      );
    }
  }), []);

  return (
    <ReactMarkdown
      className={cn("markdown prose dark:prose-invert max-w-none", className)}
      remarkPlugins={[remarkGfm]}
      components={components}
    >
      {processedContent}
    </ReactMarkdown>
  );
}
