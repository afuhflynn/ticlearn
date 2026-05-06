"use client";

import { cn } from "@/lib/utils";

interface AccessTableProps {
  tableName: string;
  columns: string[];
  data: string[][];
  primaryKey?: string;
  foreignKeys?: string[];
  caption?: string;
  className?: string;
}

export function AccessTable({
  tableName,
  columns,
  data,
  primaryKey,
  foreignKeys = [],
  caption,
  className,
}: AccessTableProps) {
  return (
    <div className={cn("my-4 w-full", className)}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-mono">
          {tableName}
        </span>
        {primaryKey && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
            PK: {primaryKey}
          </span>
        )}
        {foreignKeys.length > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
            FK: {foreignKeys.join(", ")}
          </span>
        )}
      </div>

      {caption && (
        <p className="text-sm text-gray-600 mb-2">{caption}</p>
      )}

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full">
          <thead>
            <tr className="bg-blue-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className={cn(
                    "px-3 py-2 border border-blue-300 text-left font-semibold",
                    col === primaryKey && "bg-green-50",
                    foreignKeys.includes(col) && "bg-yellow-50"
                  )}
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    {col === primaryKey && (
                      <span className="text-xs text-green-600">🔑</span>
                    )}
                    {foreignKeys.includes(col) && (
                      <span className="text-xs text-yellow-600">→</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-4 border border-gray-300 text-center text-gray-500 italic"
                >
                  No data
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className={cn(
                        "px-3 py-2 border border-gray-300",
                        columns[cellIdx] === primaryKey && "font-semibold bg-green-50",
                        foreignKeys.includes(columns[cellIdx]) && "bg-yellow-50"
                      )}
                    >
                      {cell || <span className="text-gray-400">NULL</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AccessTable;