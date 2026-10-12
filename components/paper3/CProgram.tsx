"use client";

import { cn } from "@/lib/utils";

interface CProgramProps {
  code: string;
  language: "c" | "pascal";
  caption?: string;
  className?: string;
}

export function CProgram({
  code,
  language,
  caption,
  className,
}: CProgramProps) {
  const langLabel = language === "c" ? "C" : "Pascal";

  return (
    <div className={cn("my-4", className)}>
      {caption && <p className="text-sm text-gray-600 mb-2">{caption}</p>}
      <div className="rounded-lg overflow-hidden border bg-gray-900">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
          <span className="text-xs text-gray-400 uppercase">
            {langLabel} Programming
          </span>
          <span className="text-xs text-gray-500 font-mono">
            {code.split("\n").length} lines
          </span>
        </div>
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-green-400">
            {code.split("\n").map((line, idx) => (
              <div key={idx} className="flex">
                <span className="w-8 text-gray-600 select-none text-right mr-4">
                  {idx + 1}
                </span>
                <span>{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

export default CProgram;
