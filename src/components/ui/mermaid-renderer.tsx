'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidRendererProps {
  chart: string;
}

export function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        // Dynamic import to avoid SSR issues
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        });

        const { svg: rendered } = await mermaid.render(idRef.current, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to render diagram');
          console.error('Mermaid render error:', err);
        }
      }
    }

    renderChart();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center rounded-lg border bg-gray-50 p-6">
        <div className="animate-pulse text-sm text-gray-400">Rendering diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram my-3 flex justify-center overflow-x-auto rounded-lg border bg-white p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
