"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

const COMMIT_PAUSE_MS = 300;

type UrlSearchInputProps = {
  // Current value from the URL. The input stays local while typing and
  // writes back on a trailing pause, Enter, or blur. Escape reverts to
  // the URL value.
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

export function UrlSearchInput({
  value,
  onCommit,
  placeholder = "Search...",
  className,
  ariaLabel = "Search",
}: UrlSearchInputProps) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // A shared link, refresh, back, or forward changes the URL value from
  // outside. Pick it up when the input is not being typed in.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocal(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const scheduleCommit = (next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next === value) return;
    timerRef.current = setTimeout(() => {
      commitRef.current(next);
    }, COMMIT_PAUSE_MS);
  };

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (local !== value) commitRef.current(local);
  };

  return (
    <div className={className ?? "relative"}>
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-8"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          scheduleCommit(e.target.value);
        }}
        onBlur={flush}
        onKeyDown={(e) => {
          if (e.key === "Enter") flush();
          if (e.key === "Escape") {
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
            setLocal(value);
          }
        }}
      />
    </div>
  );
}
