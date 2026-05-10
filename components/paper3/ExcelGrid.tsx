"use client";

import { cn } from "@/lib/utils";

interface ExcelGridProps {
  data: string[][];
  highlightCells?: [number, number][];
  caption?: string;
  showRowNumbers?: boolean;
  showColLetters?: boolean;
  isHeaderRow?: number;
  className?: string;
}

export function ExcelGrid({
  data,
  highlightCells = [],
  caption,
  showRowNumbers = true,
  showColLetters = true,
  isHeaderRow,
  className,
}: ExcelGridProps) {
  if (!data || data.length === 0) return null;

  const numRows = data.length;
  const numCols = Math.max(...data.map((row) => row.length), 0);

  // Generate column letters A, B, C, ... Z, AA, AB, ...
  const getColumnLetter = (col: number): string => {
    let letter = "";
    while (col >= 0) {
      letter = String.fromCharCode(65 + (col % 26)) + letter;
      col = Math.floor(col / 26) - 1;
    }
    return letter;
  };

  const colLetters = Array.from({ length: numCols }, (_, i) =>
    getColumnLetter(i),
  );
  const rowNumbers = Array.from({ length: numRows }, (_, i) => i + 1);

  const isHighlighted = (row: number, col: number) =>
    highlightCells.some(([r, c]) => r === row && c === col);

  return (
    <div className={cn("my-4 w-full", className)}>
      {caption && (
        <p className="text-sm text-gray-600 mb-2 font-medium">{caption}</p>
      )}
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              {/* Corner cell */}
              <th className="w-10 h-8 bg-gray-200 border border-gray-400" />
              {/* Column letters */}
              {showColLetters &&
                colLetters.map((letter) => (
                  <th
                    key={letter}
                    className="w-12 h-8 bg-gray-200 border border-gray-400 font-mono text-center text-gray-600"
                  >
                    {letter}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {/* Row number */}
                {showRowNumbers && (
                  <td className={cn(
                    "w-10 h-10 border border-gray-400 font-mono text-center px-4",
                    rowIdx === isHeaderRow
                      ? "bg-gray-300 text-gray-700 font-semibold"
                      : "bg-gray-200 text-gray-600",
                  )}>
                    {rowIdx + 1}
                  </td>
                )}
                {/* Data cells */}
                {Array.from({ length: numCols }).map((_, colIdx) => {
                  const cell = row[colIdx] ?? "";
                  const isHeader = rowIdx === isHeaderRow;
                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        "w-12 h-10 border border-gray-400 text-center font-mono px-10",
                        isHighlighted(rowIdx, colIdx)
                          ? "bg-blue-500 text-white font-bold"
                          : isHeader
                            ? "bg-gray-100 font-semibold"
                            : "bg-white",
                      )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExcelGrid;
