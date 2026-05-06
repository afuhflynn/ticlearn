"use client";

import React, { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ExcelGrid } from "./ExcelGrid";
import { AccessTable } from "./AccessTable";
import { CProgram } from "./CProgram";

interface VisualElementTable {
  id: string;
  tableName: string;
  columns: string[];
  data: string[][];
  primaryKey?: string;
  foreignKeys?: string[];
}

interface VisualElementArray {
  id: string;
  dimensions?: number[] | { rows: number; cols: number } | null;
  data: string[][];
  highlightCells?: number[][];
}

interface VisualElementCode {
  language: "c" | "pascal";
  code: string;
}

interface VisualElements {
  tables?: VisualElementTable[];
  arrays?: VisualElementArray[];
  codeBlocks?: VisualElementCode[];
}

interface Paper3ContentRendererProps {
  contentMd?: string | null;
  content?: string | null;
  visualElements?: VisualElements | null;
  className?: string;
}

export type { Paper3ContentRendererProps };

interface ParsedTable {
  type: "table";
  columns: string[];
  data: string[][];
  startIndex: number;
  endIndex: number;
}

interface ParsedArray {
  type: "array";
  data: string[];
  startIndex: number;
  endIndex: number;
}

type ContentSegment = 
  | { type: "text"; content: string }
  | { type: "table"; columns: string[]; data: string[][] }
  | { type: "array"; data: string[] };

function parseContentMd(contentMd: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  
  if (!contentMd) return segments;
  
  // Regex patterns for tables and arrays
  // Table: | header | header | \n | --- | --- | \n | row | row |
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  
  // Array: [item1, item2, item3] - but NOT [object Object]
  const arrayRegex = /\[([^\]]+)\]/g;
  
  // Find all matches with their positions
  interface Match {
    type: "table" | "array";
    start: number;
    end: number;
    content: string;
  }
  
  const matches: Match[] = [];
  
  // Find tables
  let tableMatch;
  while ((tableMatch = tableRegex.exec(contentMd)) !== null) {
    matches.push({
      type: "table",
      start: tableMatch.index,
      end: tableMatch.index + tableMatch[0].length,
      content: tableMatch[0],
    });
  }
  
  // Find arrays (but filter out [object Object] later)
  let arrayMatch;
  while ((arrayMatch = arrayRegex.exec(contentMd)) !== null) {
    const innerContent = arrayMatch[1];
    // Skip [object Object] or empty content
    if (innerContent.includes("object") || innerContent.trim() === "") continue;
    
    matches.push({
      type: "array",
      start: arrayMatch.index,
      end: arrayMatch.index + arrayMatch[0].length,
      content: arrayMatch[0],
    });
  }
  
  // Sort by position
  matches.sort((a, b) => a.start - b.start);
  
  // Build segments
  let lastEnd = 0;
  
  for (const match of matches) {
    // Add text before this match
    if (match.start > lastEnd) {
      const textContent = contentMd.slice(lastEnd, match.start).trim();
      if (textContent) {
        segments.push({ type: "text", content: textContent });
      }
    }
    
    // Add the visual element
    if (match.type === "table") {
      const parsed = parseTableMarkdown(match.content);
      if (parsed) {
        segments.push({ type: "table", ...parsed });
      }
    } else if (match.type === "array") {
      const parsed = parseArrayString(match.content);
      if (parsed) {
        segments.push({ type: "array", data: parsed });
      }
    }
    
    lastEnd = match.end;
  }
  
  // Add remaining text after last match
  if (lastEnd < contentMd.length) {
    const textContent = contentMd.slice(lastEnd).trim();
    if (textContent) {
      segments.push({ type: "text", content: textContent });
    }
  }
  
  return segments;
}

function parseTableMarkdown(markdown: string): { columns: string[]; data: string[][] } | null {
  const lines = markdown.trim().split("\n");
  if (lines.length < 2) return null;
  
  // Parse header row
  const headerLine = lines[0];
  const columns = headerLine.split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");
  
  if (columns.length === 0) return null;
  
  // Skip separator line (line 1) and parse data rows
  const data: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const row = lines[i].split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    if (row.length > 0) {
      data.push(row);
    }
  }
  
  if (data.length === 0) return null;
  
  return { columns, data };
}

function parseArrayString(str: string): string[] | null {
  // Remove brackets and split by comma
  const content = str.slice(1, -1); // Remove [ and ]
  const items = content.split(",").map((c) => c.trim());
  
  // Must have at least 1 item and no garbage
  if (items.length === 0) return null;
  if (items.some((item) => item === "")) return null;
  
  return items;
}

function isValidTable(table: unknown): table is VisualElementTable {
  if (!table || typeof table !== "object") return false;
  const t = table as Record<string, unknown>;
  if (!Array.isArray(t.columns) || t.columns.length === 0) return false;
  if (!Array.isArray(t.data) || t.data.length === 0) return false;
  return true;
}

function isValidArray(arr: unknown): arr is VisualElementArray {
  if (!arr || typeof arr !== "object") return false;
  const a = arr as Record<string, unknown>;
  if (!Array.isArray(a.data) || a.data.length === 0) return false;
  return true;
}

function isValidCodeBlock(block: unknown): block is VisualElementCode {
  if (!block || typeof block !== "object") return false;
  const b = block as Record<string, unknown>;
  const lang = b.language as string;
  const code = b.code as string;
  return (
    (lang === "c" || lang === "pascal") &&
    typeof code === "string" &&
    code.length > 0
  );
}

interface CodeBlockInlineProps {
  children: string;
  className?: string;
}

function CodeBlockInline({ children, className }: CodeBlockInlineProps) {
  const language = className?.replace(/language-/, "") || "text";
  const code = children.trim();
  const isC = language === "c";
  const isPascal = language === "pascal";

  if (isC || isPascal) {
    return <CProgram code={code} language={language as "c" | "pascal"} />;
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border bg-gray-900">
      <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 uppercase">
        {language}
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Paper3ContentRenderer({
  contentMd,
  visualElements,
  className,
}: Paper3ContentRendererProps) {
  // Parse contentMd into segments
  const segments = parseContentMd(contentMd || "");
  
  // Build fallback visual elements from visualElements prop (AI structured data)
  const fallbackTables: { columns: string[]; data: string[][] }[] = [];
  const fallbackArrays: { data: string[] }[] = [];
  
  if (visualElements && typeof visualElements === "object") {
    if (visualElements.tables && Array.isArray(visualElements.tables)) {
      for (const table of visualElements.tables) {
        if (isValidTable(table)) {
          fallbackTables.push({ columns: table.columns, data: table.data });
        }
      }
    }
    
    if (visualElements.arrays && Array.isArray(visualElements.arrays)) {
      for (const array of visualElements.arrays) {
        if (isValidArray(array)) {
          fallbackArrays.push({ data: array.data.flat() });
        }
      }
    }
  }
  
  // Render each segment
  const renderSegment = (segment: ContentSegment, index: number): ReactNode => {
    switch (segment.type) {
      case "text":
        return (
          <ReactMarkdown
            key={`text-${index}`}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match;
                return isInline ? (
                  <code className="px-1 bg-gray-200 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <CodeBlockInline className={className as string}>
                    {String(children).replace(/\n$/, "")}
                  </CodeBlockInline>
                );
              },
            }}
          >
            {segment.content}
          </ReactMarkdown>
        );
        
      case "table":
        return (
          <AccessTable
            key={`table-${index}`}
            tableName={`Table ${index + 1}`}
            columns={segment.columns}
            data={segment.data}
            className="w-full"
          />
        );
        
      case "array":
        return (
          <ExcelGrid
            key={`array-${index}`}
            data={[segment.data]}
            className="w-full"
          />
        );
        
      default:
        return null;
    }
  };
  
  // If we have no segments from contentMd but have fallback visualElements, show them
  if (segments.length === 0 && fallbackTables.length === 0 && fallbackArrays.length === 0) {
    return (
      <div className={cn("space-y-4 w-full", className)}>
        {contentMd && (
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const isInline = !match;
                return isInline ? (
                  <code className="px-1 bg-gray-200 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                ) : (
                  <CodeBlockInline className={className as string}>
                    {String(children).replace(/\n$/, "")}
                  </CodeBlockInline>
                );
              },
            }}
          >
            {contentMd}
          </ReactMarkdown>
        )}
      </div>
    );
  }
  
  // Render all segments in order
  return (
    <div className={cn("space-y-4 w-full", className)}>
      {segments.map(renderSegment)}
      
      {/* Also render any fallback tables/arrays from visualElements that weren't in contentMd */}
      {fallbackTables.map((table, i) => (
        <AccessTable
          key={`fallback-table-${i}`}
          tableName={`Table ${segments.length + i + 1}`}
          columns={table.columns}
          data={table.data}
          className="w-full"
        />
      ))}
      {fallbackArrays.map((array, i) => (
        <ExcelGrid
          key={`fallback-array-${i}`}
          data={[array.data]}
          className="w-full"
        />
      ))}
    </div>
  );
}

export default Paper3ContentRenderer;
