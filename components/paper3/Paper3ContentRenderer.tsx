"use client";

import React, { ReactNode } from "react";
import ReactMarkdown, { Components } from "react-markdown";
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

interface ContentSegment {
  type: "text" | "table" | "array";
  content: string;
  arrayData?: string[];
  tableColumns?: string[];
  tableData?: string[][];
}

function isValidArrayString(str: string): boolean {
  if (!str.startsWith("[") || !str.endsWith("]")) return false;
  const inner = str.slice(1, -1);
  if (inner.includes("object") || inner.includes(":")) return false;
  const items = inner.split(",").map((s) => s.trim());
  return items.length > 0 && items.every((s) => s.length > 0);
}

function parseArrayString(str: string): string[] {
  const inner = str.slice(1, -1);
  return inner.split(",").map((s) => s.trim());
}

function parseContentMd(contentMd: string): ContentSegment[] {
  const segments: ContentSegment[] = [];

  if (!contentMd) return segments;

  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/gi;
  const arrayRegex = /\[([^\]]+)\]/gi;

  interface Match {
    type: "table" | "array";
    start: number;
    end: number;
    content: string;
  }

  const matches: Match[] = [];

  let tableMatch;
  while ((tableMatch = tableRegex.exec(contentMd)) !== null) {
    matches.push({
      type: "table",
      start: tableMatch.index,
      end: tableMatch.index + tableMatch[0].length,
      content: tableMatch[0],
    });
  }

  let arrayMatch;
  while ((arrayMatch = arrayRegex.exec(contentMd)) !== null) {
    const innerContent = arrayMatch[1];
    if (innerContent.includes("object") || innerContent.trim() === "") continue;
    if (!isValidArrayString(arrayMatch[0])) continue;

    matches.push({
      type: "array",
      start: arrayMatch.index,
      end: arrayMatch.index + arrayMatch[0].length,
      content: arrayMatch[0],
    });
  }

  matches.sort((a, b) => a.start - b.start);

  let lastEnd = 0;

  for (const match of matches) {
    if (match.start > lastEnd) {
      const textContent = contentMd.slice(lastEnd, match.start).trim();
      if (textContent) {
        segments.push({ type: "text", content: textContent });
      }
    }

    if (match.type === "table") {
      const parsed = parseTableMarkdown(match.content);
      if (parsed) {
        segments.push({
          type: "table",
          content: "",
          tableColumns: parsed.columns,
          tableData: parsed.data,
        });
      }
    } else if (match.type === "array") {
      const parsed = parseArrayString(match.content);
      if (parsed) {
        segments.push({
          type: "array",
          content: "",
          arrayData: parsed,
        });
      }
    }

    lastEnd = match.end;
  }

  if (lastEnd < contentMd.length) {
    const textContent = contentMd.slice(lastEnd).trim();
    if (textContent) {
      segments.push({ type: "text", content: textContent });
    }
  }

  return segments;
}

function parseTableMarkdown(
  markdown: string,
): { columns: string[]; data: string[][] } | null {
  const lines = markdown.trim().split("\n");
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const columns = headerLine
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c !== "");

  if (columns.length === 0) return null;

  const data: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const row = lines[i]
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");
    if (row.length > 0) {
      data.push(row);
    }
  }

  // Allow header-only tables - don't require data rows
  return { columns, data };
}

const markdownComponents: Components = {
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
  // Disable default table/list rendering - we've extracted them into segments
  table({ children, ...props }) {
    return null;
  },
  ul({ children, ...props }) {
    return (
      <ul {...props} className="list-disc pl-5">
        {children}
      </ul>
    );
  },
  ol({ children, ...props }) {
    return (
      <ol {...props} className="pl-5 list-decimal" type="1">
        {children}
      </ol>
    );
  },
  li({ children, ...props }) {
    return <li {...props}>{children}</li>;
  },
  p({ children, ...props }) {
    return (
      <p {...props} className="text-lg">
        {children}
      </p>
    );
  },
  h1({ children, ...props }) {
    return (
      <h1 {...props} className="text-3xl font-semibold">
        {children}
      </h1>
    );
  },
  h2({ children, ...props }) {
    return (
      <h2 {...props} className="text-2xl font-semibold">
        {children}
      </h2>
    );
  },
  h3({ children, ...props }) {
    return (
      <h3 {...props} className="text-xl font-semibold">
        {children}
      </h3>
    );
  },
  h4({ children, ...props }) {
    return (
      <h4 {...props} className="text-lg font-semibold">
        {children}
      </h4>
    );
  },
  h5({ children, ...props }) {
    return (
      <h5 {...props} className="text-sm font-semibold">
        {children}
      </h5>
    );
  },
  h6({ children, ...props }) {
    return (
      <h6 {...props} className="text-xs font-semibold">
        {children}
      </h6>
    );
  },
  a() {
    return null;
  },
  link() {
    return null;
  },
};

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
  const segments = parseContentMd(contentMd || "");

  const renderSegment = (segment: ContentSegment, index: number): ReactNode => {
    switch (segment.type) {
      case "text":
        return (
          <ReactMarkdown key={`text-${index}`} components={markdownComponents}>
            {segment.content}
          </ReactMarkdown>
        );

      case "table":
        return (
          <AccessTable
            key={`table-${index}`}
            tableName={`Table ${index + 1}`}
            columns={segment.tableColumns || []}
            data={segment.tableData || []}
            className="w-full"
          />
        );

      case "array":
        return (
          <ExcelGrid
            key={`array-${index}`}
            data={[segment.arrayData || []]}
            className="w-full"
          />
        );

      default:
        return null;
    }
  };

  if (segments.length === 0) {
    return (
      <div className={cn("space-y-2 w-full", className)}>
        {contentMd && (
          <ReactMarkdown components={markdownComponents}>
            {contentMd}
          </ReactMarkdown>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 w-full", className)}>
      {segments.map(renderSegment)}
    </div>
  );
}

export default Paper3ContentRenderer;
