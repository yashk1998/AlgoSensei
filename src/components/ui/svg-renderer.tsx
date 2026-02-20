'use client';

import { useMemo } from 'react';

interface SvgRendererProps {
  content: string;
}

/**
 * Sanitize SVG content to prevent XSS attacks.
 * Removes script tags, event handlers, and dangerous attributes.
 */
function sanitizeSvg(raw: string): string {
  return raw
    // Remove script elements
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove event handler attributes
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/href\s*=\s*'javascript:[^']*'/gi, '')
    // Remove xlink:href with javascript
    .replace(/xlink:href\s*=\s*"javascript:[^"]*"/gi, '')
    .replace(/xlink:href\s*=\s*'javascript:[^']*'/gi, '');
}

export function SvgRenderer({ content }: SvgRendererProps) {
  const sanitized = useMemo(() => sanitizeSvg(content), [content]);

  // Verify it actually contains an <svg> tag
  if (!/<svg[\s>]/i.test(sanitized)) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        Invalid SVG content
      </div>
    );
  }

  return (
    <div
      className="svg-visualization my-3 flex justify-center overflow-x-auto rounded-lg border bg-white p-4"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
