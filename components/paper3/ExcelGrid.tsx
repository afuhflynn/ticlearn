"use client";

import { cn } from "@/lib/utils";

interface ExcelGridProps {
  data: string[][];
  highlightCells?: [number, number][];
  caption?: string;
  showRowNumbers?: boolean;
  showColLetters?: boolean;
  className?: string;
}

export function ExcelGrid({
  data,
  highlightCells = [],
  caption,
  showRowNumbers = true,
  showColLetters = true,
  className,
}: ExcelGridProps) {
  if (!data || data.length === 0) return null;

  const numRows = data.length;
  const numCols = data[0]?.length || 0;

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
                  <td className="w-10 h-10 bg-gray-200 border border-gray-400 font-mono text-center text-gray-600 px-4">
                    {rowIdx + 1}
                  </td>
                )}
                {/* Data cells */}
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className={cn(
                      "w-12 h-10 border border-gray-400 text-center font-mono px-10",
                      isHighlighted(rowIdx, colIdx)
                        ? "bg-blue-500 text-white font-bold"
                        : "bg-white",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExcelGrid;
