import React from 'react';

interface MarkdownReportRendererProps {
  content: string;
}

export const MarkdownReportRenderer: React.FC<MarkdownReportRendererProps> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: any[] = [];
  
  let currentTable: string[] = [];
  let currentCodeBlock: string[] = [];
  let inCodeBlock = false;
  let inVisualFlowSection = false;
  let currentAsciiLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block fences
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', lines: [...currentCodeBlock] });
        currentCodeBlock = [];
        inCodeBlock = false;
      } else {
        if (currentTable.length > 0) {
          blocks.push({ type: 'table', lines: [...currentTable] });
          currentTable = [];
        }
        if (currentAsciiLines.length > 0) {
          blocks.push({ type: 'ascii', lines: [...currentAsciiLines] });
          currentAsciiLines = [];
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      currentCodeBlock.push(line);
      continue;
    }

    // Markdown Table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (currentAsciiLines.length > 0) {
        blocks.push({ type: 'ascii', lines: [...currentAsciiLines] });
        currentAsciiLines = [];
      }
      currentTable.push(line);
      continue;
    } else if (currentTable.length > 0) {
      blocks.push({ type: 'table', lines: [...currentTable] });
      currentTable = [];
    }

    // Check headings
    if (trimmed.startsWith('#')) {
      if (currentAsciiLines.length > 0) {
        blocks.push({ type: 'ascii', lines: [...currentAsciiLines] });
        currentAsciiLines = [];
      }

      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace(/^###\s+/, '');
        inVisualFlowSection = title.includes('Visual Money') || title.includes('Control Flow');
        blocks.push({ type: 'h3', text: title });
      } else if (trimmed.startsWith('## ')) {
        inVisualFlowSection = false;
        blocks.push({ type: 'h2', text: trimmed.replace(/^##\s+/, '') });
      } else if (trimmed.startsWith('# ')) {
        inVisualFlowSection = false;
        blocks.push({ type: 'h1', text: trimmed.replace(/^#\s+/, '') });
      }
      continue;
    }

    // ASCII Diagram Detection (arrows, box connectors, or visual flow section)
    const isAsciiChar = line.includes('↓') || line.includes('├──') || line.includes('└──') || line.includes('──→') || line.includes('│');
    if (isAsciiChar || (inVisualFlowSection && trimmed.length > 0 && !trimmed.startsWith('•') && !trimmed.startsWith('-'))) {
      currentAsciiLines.push(line);
      continue;
    } else if (currentAsciiLines.length > 0) {
      blocks.push({ type: 'ascii', lines: [...currentAsciiLines] });
      currentAsciiLines = [];
    }

    // Bullet points & Numbered lists
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ type: 'bullet', text: trimmed.replace(/^[•\-\*]\s+/, '') });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({ type: 'number', text: trimmed });
    } else if (trimmed.length > 0) {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  // Flush remaining buffers
  if (currentTable.length > 0) {
    blocks.push({ type: 'table', lines: [...currentTable] });
  }
  if (currentAsciiLines.length > 0) {
    blocks.push({ type: 'ascii', lines: [...currentAsciiLines] });
  }
  if (currentCodeBlock.length > 0) {
    blocks.push({ type: 'code', lines: [...currentCodeBlock] });
  }

  // Inline formatting helper for bold, badges, inline code
  const renderInline = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        if (inner === 'CRITICAL' || inner === 'CRITICAL ALERT' || inner === 'DISCREPANCY DETECTED' || inner === 'FAILED') {
          return <span key={index} className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">{inner}</span>;
        } else if (inner === 'WARNING' || inner === 'WARNING ALERT' || inner === 'DEFICIT') {
          return <span key={index} className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">{inner}</span>;
        } else if (inner === 'HEALTHY' || inner === 'OPERATIONAL' || inner === 'PASSED' || inner === 'BALANCED' || inner === 'ACTIVE') {
          return <span key={index} className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{inner}</span>;
        }
        return <strong key={index} className="font-extrabold text-white">{inner}</strong>;
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="px-1.5 py-0.5 rounded bg-white/10 text-violet-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-4 font-sans text-xs text-gray-200 leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.type === 'h1') {
          return (
            <h1 key={bIdx} className="text-base font-black text-white border-b border-white/10 pb-2 pt-4 flex items-center gap-2">
              {renderInline(block.text)}
            </h1>
          );
        }
        if (block.type === 'h2') {
          return (
            <h2 key={bIdx} className="text-sm font-black text-violet-300 border-b border-white/10 pb-2 pt-3 flex items-center gap-2">
              {renderInline(block.text)}
            </h2>
          );
        }
        if (block.type === 'h3') {
          return (
            <h3 key={bIdx} className="text-xs font-black text-violet-300 pt-3 pb-1 flex items-center gap-2 tracking-wider uppercase">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.type === 'bullet') {
          return (
            <div key={bIdx} className="flex items-start gap-2.5 pl-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
              <div className="text-gray-300">{renderInline(block.text)}</div>
            </div>
          );
        }
        if (block.type === 'number') {
          return (
            <div key={bIdx} className="flex items-start gap-2 pl-2 py-0.5">
              <div className="text-gray-300">{renderInline(block.text)}</div>
            </div>
          );
        }
        if (block.type === 'ascii') {
          return (
            <pre key={bIdx} className="p-4 my-2 rounded-2xl bg-black/80 border border-violet-500/30 font-mono text-[11px] text-violet-300 leading-relaxed overflow-x-auto shadow-2xl">
              {block.lines.join('\n')}
            </pre>
          );
        }
        if (block.type === 'code') {
          return (
            <pre key={bIdx} className="p-4 my-2 rounded-2xl bg-black/90 border border-violet-500/40 font-mono text-[11px] text-emerald-300 leading-relaxed overflow-x-auto shadow-2xl">
              {block.lines.join('\n')}
            </pre>
          );
        }
        if (block.type === 'table') {
          const headerLine = block.lines[0];
          const dataLines = block.lines.filter((l: string) => !l.includes(':---') && !l.includes('---'));
          const headers = headerLine ? headerLine.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
          const rows = dataLines.slice(1).map((l: string) => l.split('|').map((s: string) => s.trim()).filter(Boolean));

          return (
            <div key={bIdx} className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 my-3 shadow-xl">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-white/10 bg-violet-950/40 text-violet-200 font-bold uppercase text-[9px] tracking-wider">
                    {headers.map((h: string, hIdx: number) => (
                      <th key={hIdx} className="p-2.5">{renderInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {rows.map((row: string[], rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell: string, cIdx: number) => (
                        <td key={cIdx} className="p-2.5">{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={bIdx} className="text-gray-300 leading-relaxed">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
};
