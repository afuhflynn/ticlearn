"use client";

import React, { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ExcelGrid } from "./ExcelGrid";
import { AccessTable } from "./AccessTable";
import { CProgram } from "./CProgram";

// constants @todo: Remove them to a dedicated constants file
const codeBlockRegex = /```(c|pascal)\n([\s\S]*?)```/g;
const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
const arrayGridRegex =
  /(?:Row\s*(\d+)[,\s]+(?:(\d+)[,\s]+)?(\d+)?)|(?:\[\s*([^\]]+)\s*\])/gi;

// Parse old-style markdown tables |A|B|
const oldTableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;

// Parse old-style arrays [A, B, C]
// Match anything in brackets EXCEPT [object Object]
// Good: [Sales, Stock, Summary], [S001, 01/03/2025, P001, 15]
// Bad: [object Object]
const oldArrayRegex = /\[([^\]]+)\]/g;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractOldVisuals(contentMd: string): {
  markdown: string;
  tables: { columns: string[]; data: string[][] }[];
  arrays: string[][];
} {
  const tables: { columns: string[]; data: string[][] }[] = [];
  const arrays: string[][] = [];
  
  // Reset regex lastIndex
  const tableRegex = new RegExp(oldTableRegex.source, "g");
  const arrayRegex = new RegExp(oldArrayRegex.source, "g");
  
  // Extract tables first
  let tableMatch;
  while ((tableMatch = tableRegex.exec(contentMd)) !== null) {
    const headerRow = tableMatch[1].split("|").map((h) => h.trim()).filter(Boolean);
    const dataRows: string[][] = [];
    const dataSection = tableMatch[2];
    const rowLines = dataSection.trim().split("\n");
    
    for (const rowLine of rowLines) {
      const cells = rowLine.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length > 0) dataRows.push(cells);
    }
    
    if (headerRow.length > 0 && dataRows.length > 0) {
      tables.push({ columns: headerRow, data: dataRows });
    }
  }
  
  // Remove tables from markdown - create unique placeholders for EACH table
  let markdown = contentMd;
  for (let i = 0; i < tables.length; i++) {
    const tableStr = `|${tables[i].columns.join("|")}|\n|${tables[i].columns.map(() => "---").join("|")}|\n${tables[i].data.map(row => "|" + row.join("|") + "|").join("\n")}`;
    markdown = markdown.replace(tableStr, `{{TABLE_${i}}}`);
  }
  
  // Clean up extra newlines from removed tables
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
  
  // Reset and extract arrays
  let arrayMatch;
  const foundArrays: string[] = [];
  while ((arrayMatch = arrayRegex.exec(markdown)) !== null) {
    const content = arrayMatch[1];
    // Skip [object Object] and other garbage
    if (content.includes("object") || content === "") continue;
    const cells = content.split(",").map((c) => c.trim());
    if (cells.length >= 1 && cells.some((c) => c.length > 0)) {
      arrays.push(cells);
      foundArrays.push(arrayMatch[0]);
    }
  }
  
  // Replace arrays with placeholders
  for (let i = 0; i < foundArrays.length; i++) {
    markdown = markdown.replace(foundArrays[i], `{{ARRAY_${i}}}`);
  }
  
  // Clean up extra newlines from removed tables
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();
  
  return { markdown, tables, arrays };
}

// Visual marker parser: [[type:content]]
const visualMarkerPattern = /\[\[(\w+):([\s\S]*?)\]\]/g;

interface ParsedVisual {
  type: string;
  content: string;
  fullMatch: string;
}

function parseVisualMarkers(contentMd: string): {
  markdown: string;
  visuals: ParsedVisual[];
} {
  const visuals: ParsedVisual[] = [];

  // Find all matches first
  let match;
  const regex = new RegExp(visualMarkerPattern.source, "g");
  while ((match = regex.exec(contentMd)) !== null) {
    const type = match[1].toLowerCase();
    const content = match[2].trim();
    visuals.push({ type, content, fullMatch: match[0] });
  }

  // Replace markers with placeholders in markdown
  let markdown = contentMd;
  for (let i = 0; i < visuals.length; i++) {
    markdown = markdown.replace(visuals[i].fullMatch, `{{VISUAL_${i}}}`);
  }

  return { markdown, visuals };
}

// Render a visual marker to React component
function renderVisualMarker(visual: ParsedVisual): React.ReactNode {
  const { type, content } = visual;

  // Excel grid: [[excel:Sales, Stock, Summary]]
  if (type === "excel") {
    const cells = content.split(",").map((c) => c.trim());
    return <ExcelGrid key={`excel-${content.slice(0, 20)}`} data={[cells]} />;
  }

  // Access table: [[table:|A|B||--|--||1|2||3|4|]]
  if (type === "table") {
    const rows = content.split("\n").map((row) =>
      row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean),
    );
    if (rows.length >= 2) {
      return (
        <AccessTable
          key={`table-${content.slice(0, 20)}`}
          tableName="Table"
          columns={rows[0]}
          data={rows.slice(1)}
        />
      );
    }
  }

  // C program: [[c:printf("x");]] or [[c:int main() {...}]]
  if (type === "c") {
    return (
      <CProgram key={`c-${content.slice(0, 10)}`} code={content} language="c" />
    );
  }

  // Pascal program: [[pascal:writeln(x);]] or [[pascal:begin ... end]]
  if (type === "pascal") {
    return (
      <CProgram
        key={`pascal-${content.slice(0, 10)}`}
        code={content}
        language="pascal"
      />
    );
  }

  // Unknown type - return null
  return null;
}

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

function isValidTable(table: unknown): table is VisualElementTable {
  if (!table || typeof table !== "object") return false;
  const t = table as Record<string, unknown>;
  if (typeof t.tableName !== "string" || t.tableName.length === 0) return false;
  if (!Array.isArray(t.columns) || t.columns.length === 0) return false;
  if (!Array.isArray(t.data) || t.data.length === 0) return false;
  return t.data.every(
    (row: unknown) =>
      Array.isArray(row) &&
      row.every((cell: unknown) => typeof cell === "string"),
  );
}

function isValidArray(arr: unknown): arr is VisualElementArray {
  if (!arr || typeof arr !== "object") return false;
  const a = arr as Record<string, unknown>;
  if (!Array.isArray(a.data) || a.data.length === 0) return false;

  // Accept both formats: number[] (e.g., [3, 4]) or object { rows, cols } or null/undefined
  const dims = a.dimensions as unknown;
  if (dims === undefined || dims === null) {
    // No dimensions provided - compute from data
    return a.data.every(
      (row: unknown) =>
        Array.isArray(row) &&
        row.every((cell: unknown) => typeof cell === "string"),
    );
  }
  if (Array.isArray(dims) && dims.length >= 2) {
    return dims.every((d) => !isNaN(Number(d)));
  }
  if (typeof dims === "object" && dims !== null) {
    // Handle { rows, cols } object format
    const dimObj = dims as Record<string, unknown>;
    return !isNaN(Number(dimObj.rows)) && !isNaN(Number(dimObj.cols));
  }
  // If dimensions exist but invalid format, still allow if data is valid
  return a.data.every(
    (row: unknown) =>
      Array.isArray(row) &&
      row.every((cell: unknown) => typeof cell === "string"),
  );
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

function parseMarkdownVisuals(contentMd: string): VisualElements {
  const visuals: VisualElements = { tables: [], arrays: [], codeBlocks: [] };

  if (!contentMd || typeof contentMd !== "string") return visuals;

  // Parse markdown tables -> Access tables

  let tableMatch;
  while ((tableMatch = tableRegex.exec(contentMd)) !== null) {
    const headerRow = tableMatch[1]
      .split("|")
      .map((h) => h.trim())
      .filter(Boolean);
    const dataRows: string[][] = [];
    const dataSection = tableMatch[2];
    const rowLines = dataSection.trim().split("\n");
    for (const rowLine of rowLines) {
      const cells = rowLine
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length > 0) dataRows.push(cells);
    }
    if (headerRow.length > 0 && dataRows.length > 0) {
      visuals.tables!.push({
        id: `md-table-${visuals.tables!.length + 1}`,
        tableName: `Table ${visuals.tables!.length + 1}`,
        columns: headerRow,
        data: dataRows,
      });
    }
  }

  // Parse ```c or ```pascal code blocks
  let codeMatch;
  while ((codeMatch = codeBlockRegex.exec(contentMd)) !== null) {
    const language = codeMatch[1] as "c" | "pascal";
    const code = codeMatch[2].trim();
    if (code.length > 0) {
      visuals.codeBlocks!.push({
        language,
        code,
      });
    }
  }

  // Parse markdown array grids (looking for patterns like [1,2,3] or [Sales,Stock] in rows)

  const arrayRows: string[][] = [];
  let hasArrays = false;
  const gridMatch = contentMd.match(arrayGridRegex);
  if (gridMatch && gridMatch.length >= 2) {
    for (const m of gridMatch) {
      const cells = m
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((c) => c.trim());
      if (cells.length > 0 && cells.some((c) => c.length > 0)) {
        arrayRows.push(cells);
        hasArrays = true;
      }
    }
    if (hasArrays) {
      visuals.arrays!.push({
        id: `md-array-${visuals.arrays!.length + 1}`,
        dimensions: [arrayRows.length, arrayRows[0]?.length || 0],
        data: arrayRows,
      });
    }
  }

  return visuals;
}

export function Paper3ContentRenderer({
  contentMd,
  content,
  visualElements,
  className,
}: Paper3ContentRendererProps) {
  const renderVisualElements = (): ReactNode[] => {
    const parts: ReactNode[] = [];
    let hasVisualData = false;

    // Track what's being processed for debugging
    const debugLog: string[] = [];

    // 1. Try structured visualElements first (from AI JSON)
    if (visualElements && typeof visualElements === "object") {
      // Render Access tables with validation
      if (visualElements.tables && Array.isArray(visualElements.tables)) {
        for (const table of visualElements.tables) {
          const tableData = table as unknown as Record<string, unknown>;
          if (isValidTable(table)) {
            parts.push(
              <AccessTable
                key={`table-${table.id}`}
                tableName={table.tableName}
                columns={table.columns}
                data={table.data}
                primaryKey={table.primaryKey}
                foreignKeys={table.foreignKeys}
                className="w-full"
              />,
            );
            hasVisualData = true;
            debugLog.push(
              `✓ Table rendered: ${table.tableName} (${table.columns.length} cols, ${table.data.length} rows)`,
            );
          } else {
            debugLog.push(
              `✗ Table skipped: invalid data - id=${tableData.id || "unknown"}`,
            );
            // Fallback: try to render with whatever data available
            const hasData =
              Array.isArray(tableData.data) && tableData.data.length > 0;
            if (hasData) {
              const cols = Array.isArray(tableData.columns)
                ? tableData.columns
                : (tableData.data as string[][])[0] || [];
              parts.push(
                <AccessTable
                  key={`table-${tableData.id || "fallback"}-fallback`}
                  tableName={(tableData.tableName as string) || "Data Table"}
                  columns={cols}
                  data={tableData.data as string[][]}
                  className="w-full"
                />,
              );
              hasVisualData = true;
              debugLog.push(
                `✓ Table rendered (fallback): ${tableData.tableName || "Data Table"}`,
              );
            }
          }
        }
      }

      // Render Excel grids/arrays with validation
      if (visualElements.arrays && Array.isArray(visualElements.arrays)) {
        for (const array of visualElements.arrays) {
          const arrData = array as unknown as Record<string, unknown>;
          if (isValidArray(array)) {
            // Convert number[][] to [number, number][]
            const highlight: [number, number][] = [];
            if (array.highlightCells) {
              for (const cell of array.highlightCells) {
                if (Array.isArray(cell) && cell.length >= 2) {
                  highlight.push([cell[0], cell[1]]);
                }
              }
            }
            parts.push(
              <ExcelGrid
                key={`array-${array.id}`}
                data={array.data}
                highlightCells={highlight}
                className="w-full"
              />,
            );
            hasVisualData = true;
            const rows = array.data.length;
            const cols = array.data[0]?.length || "?";
            debugLog.push(`✓ Array rendered: ${array.id} (${rows}x${cols})`);
          } else {
            debugLog.push(
              `✗ Array skipped: invalid data - id=${arrData.id || "unknown"}`,
            );
            // Fallback: render with whatever data is available
            if (Array.isArray(arrData.data) && arrData.data.length > 0) {
              parts.push(
                <ExcelGrid
                  key={`array-${arrData.id || "fallback"}-fallback`}
                  data={arrData.data as string[][]}
                />,
              );
              hasVisualData = true;
              debugLog.push(`✓ Array rendered (fallback)`);
            }
          }
        }
      }

      // Render C/Pascal code blocks with validation
      if (
        visualElements.codeBlocks &&
        Array.isArray(visualElements.codeBlocks)
      ) {
        for (const block of visualElements.codeBlocks) {
          const blockData = block as unknown as Record<string, unknown>;
          if (isValidCodeBlock(block)) {
            parts.push(
              <CProgram
                key={`code-${String(block.code).slice(0, 10)}`}
                code={block.code}
                language={block.language}
              />,
            );
            hasVisualData = true;
            debugLog.push(
              `✓ Code block rendered: ${block.language} (${block.code.length} chars)`,
            );
          } else {
            debugLog.push(
              `✗ Code block skipped: invalid - language=${blockData.language}`,
            );
            // Fallback rendering
            if (
              typeof blockData.code === "string" &&
              blockData.code.length > 0
            ) {
              parts.push(
                <CProgram
                  key={`code-${String(blockData.code).slice(0, 10)}-fallback`}
                  code={String(blockData.code)}
                  language={(blockData.language as "c" | "pascal") || "c"}
                />,
              );
              hasVisualData = true;
              debugLog.push(`✓ Code rendered (fallback)`);
            }
          }
        }
      }
    }

    // 2. Fallback: Try parsing from markdown if no structured visuals succeeded
    if (!hasVisualData && contentMd && typeof contentMd === "string") {
      // Check if there are tables or code blocks in the markdown
      const mdHasTables = tableRegex.exec(contentMd);
      const mdHasCode = codeBlockRegex.exec(contentMd);
      const mdHasArrays = contentMd.match(arrayGridRegex);

      // console.log({ mdHasArrays, mdHasCode, mdHasTables });
      if (mdHasTables || mdHasCode || mdHasArrays) {
        const fallbackVisuals = parseMarkdownVisuals(contentMd);

        for (const table of fallbackVisuals.tables || []) {
          parts.push(
            <AccessTable
              key={`md-table-${table.id}`}
              tableName={table.tableName}
              columns={table.columns}
              data={table.data}
            />,
          );
          hasVisualData = true;
          debugLog.push(`✓ Table from markdown: ${table.tableName}`);
        }

        for (const array of fallbackVisuals.arrays || []) {
          parts.push(
            <ExcelGrid key={`md-array-${array.id}`} data={array.data} />,
          );
          hasVisualData = true;
          debugLog.push(`✓ Array from markdown: ${array.id}`);
        }

        for (const block of fallbackVisuals.codeBlocks || []) {
          parts.push(
            <CProgram
              key={`md-code-${block.code.slice(0, 10)}`}
              code={block.code}
              language={block.language}
            />,
          );
          hasVisualData = true;
          debugLog.push(`✓ Code from markdown: ${block.language}`);
        }
      }
    }

    // Log results in development
    if (debugLog.length > 0) {
      console.log(
        "[Paper3ContentRenderer] Visual elements:",
        debugLog.join(", "),
      );
    }

    return parts;
  };

  // 1. Parse visual markers first (inline intercept) - [[excel:...]], [[table:...]], etc.
  const { markdown: processedMd, visuals: markerVisuals } = parseVisualMarkers(
    contentMd || "",
  );

  // 2. Build component map from markers
  const visualComponents = markerVisuals.map(renderVisualMarker);

  // 3. If [[markers]] exist, render inline (placeholders replaced with actual components)
  if (markerVisuals.length > 0) {
    const placeholderMap = new Map(
      markerVisuals.map((v, i) => [`{{VISUAL_${i}}}`, visualComponents[i]])
    );

    return (
      <div className={cn("space-y-4 w-full", className)}>
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
            // Disable default table rendering - tables handled via placeholders
            table({ node, children, ...props }) {
              return null;
            },
            // Intercept paragraphs and replace placeholders inline
            p({ node, children, ...props }) {
              const text = String(children);
              for (const [placeholder, component] of placeholderMap) {
                if (text === placeholder) {
                  return <>{component}</>;
                }
                if (text.includes(placeholder)) {
                  const parts = text.split(placeholder);
                  return (
                    <>
                      {parts[0]}
                      {component}
                      {parts[1]}
                    </>
                  );
                }
              }
              return <p {...props}>{children}</p>;
            },
            // Also handle list items
            li({ node, children, ...props }) {
              const text = String(children);
              for (const [placeholder, component] of placeholderMap) {
                if (text.includes(placeholder)) {
                  const parts = text.split(placeholder);
                  return (
                    <li {...props}>
                      {parts[0]}
                      {component}
                      {parts[1]}
                    </li>
                  );
                }
              }
              return <li {...props}>{children}</li>;
            },
          }}
        >
          {processedMd}
        </ReactMarkdown>
      </div>
    );
  }

  // 4. Try AI visualElements (structured JSON from database) - render inline
  if (visualElements && typeof visualElements === "object") {
    const aiComponents: React.ReactNode[] = [];
    const placeholderMap = new Map<string, React.ReactNode>();
    let tableCount = 0;
    let arrayCount = 0;
    let codeCount = 0;

    // Render tables
    if (visualElements.tables && Array.isArray(visualElements.tables)) {
      for (const table of visualElements.tables) {
        if (isValidTable(table)) {
          const placeholder = `{{TABLE_${tableCount}}}`;
          const component = (
            <AccessTable
              key={`ai-table-${table.id}`}
              tableName={table.tableName}
              columns={table.columns}
              data={table.data}
              primaryKey={table.primaryKey}
              foreignKeys={table.foreignKeys}
              className="w-full"
            />
          );
          placeholderMap.set(placeholder, component);
          aiComponents.push(component);
          tableCount++;
        }
      }
    }

    // Render arrays
    if (visualElements.arrays && Array.isArray(visualElements.arrays)) {
      for (const array of visualElements.arrays) {
        if (isValidArray(array)) {
          const placeholder = `{{ARRAY_${arrayCount}}}`;
          const component = (
            <ExcelGrid
              key={`ai-array-${array.id}`}
              data={array.data}
              className="w-full"
            />
          );
          placeholderMap.set(placeholder, component);
          aiComponents.push(component);
          arrayCount++;
        }
      }
    }

    // Render code blocks
    if (visualElements.codeBlocks && Array.isArray(visualElements.codeBlocks)) {
      for (const block of visualElements.codeBlocks) {
        if (isValidCodeBlock(block)) {
          const placeholder = `{{CODE_${codeCount}}}`;
          const component = (
            <CProgram
              key={`ai-code-${String(block.code).slice(0, 10)}`}
              code={block.code}
              language={block.language}
            />
          );
          placeholderMap.set(placeholder, component);
          aiComponents.push(component);
          codeCount++;
        }
      }
    }

    // If we have AI components, render inline by adding placeholders to markdown
    if (placeholderMap.size > 0) {
      // Build markdown with placeholders at start
      let mdWithPlaceholders = contentMd || "";
      
      // Prepend placeholders before the main content
      const placeholderList = Array.from(placeholderMap.keys()).join("\n\n");
      mdWithPlaceholders = placeholderList + "\n\n" + mdWithPlaceholders;

      return (
        <div className={cn("space-y-4 w-full", className)}>
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
              // Disable default table rendering for AI visualElements too
              table({ node, children, ...props }) {
                return null;
              },
              p({ node, children, ...props }) {
                const text = String(children);
                for (const [ph, comp] of placeholderMap) {
                  if (text === ph) return <>{comp}</>;
                  if (text.includes(ph)) {
                    const parts = text.split(ph);
                    return <>{parts[0]}{comp}{parts[1]}</>;
                  }
                }
                return <p {...props}>{children}</p>;
              },
              li({ node, children, ...props }) {
                const text = String(children);
                for (const [ph, comp] of placeholderMap) {
                  if (text.includes(ph)) {
                    const parts = text.split(ph);
                    return <li {...props}>{parts[0]}{comp}{parts[1]}</li>;
                  }
                }
                return <li {...props}>{children}</li>;
              },
            }}
          >
            {mdWithPlaceholders}
          </ReactMarkdown>
        </div>
      );
    }
  }

  // 5. Fallback: No markers, no AI visualElements - extract from markdown
  const { markdown: processedMdOld, tables, arrays } = extractOldVisuals(contentMd || "");

  // Build component arrays for placeholders
  const tableComponents = tables.map((t, i) => (
    <AccessTable key={`table-${i}`} tableName="Table" columns={t.columns} data={t.data} />
  ));
  const arrayComponents = arrays.map((a, i) => (
    <ExcelGrid key={`array-${i}`} data={[a]} />
  ));

  // Build placeholder map
  const placeholderMapOld = new Map<string, React.ReactNode>();
  for (let i = 0; i < tables.length; i++) {
    placeholderMapOld.set(`{{TABLE_${i}}}`, tableComponents[i]);
  }
  for (let i = 0; i < arrays.length; i++) {
    placeholderMapOld.set(`{{ARRAY_${i}}}`, arrayComponents[i]);
  }

  // Simple render: replace placeholders in text nodes
  const renderWithPlaceholders = (text: string): React.ReactNode => {
    let result: React.ReactNode[] = [];
    let remaining = text;
    
    for (const [placeholder, component] of placeholderMapOld) {
      if (remaining.includes(placeholder)) {
        const parts = remaining.split(placeholder);
        result.push(parts[0], component);
        remaining = parts[1] || "";
      }
    }
    result.push(remaining);
    
    return <>{result}</>;
  };

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
            // Disable default table rendering - we handle tables via placeholders
            table({ node, children, ...props }) {
              return null;
            },
            // Replace placeholders in paragraphs
            p({ node, children, ...props }) {
              const text = String(children);
              if (placeholderMapOld.has(text)) {
                return <>{placeholderMapOld.get(text)}</>;
              }
              for (const [ph, comp] of placeholderMapOld) {
                if (text.includes(ph)) {
                  return <>{renderWithPlaceholders(text)}</>;
                }
              }
              return <p {...props}>{children}</p>;
            },
            // Replace placeholders in list items
            li({ node, children, ...props }) {
              const text = String(children);
              if (placeholderMapOld.has(text)) {
                return <>{placeholderMapOld.get(text)}</>;
              }
              for (const [ph, comp] of placeholderMapOld) {
                if (text.includes(ph)) {
                  return <li {...props}>{renderWithPlaceholders(text)}</li>;
                }
              }
              return <li {...props}>{children}</li>;
            },
          }}
        >
          {processedMdOld}
        </ReactMarkdown>
      )}
    </div>
  );
}

export default Paper3ContentRenderer;
