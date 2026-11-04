"use client";

import * as React from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TrioDate {
  day: number | null;
  month: number | null;
  year: number | null;
}

export interface TrioPickerProps {
  value: TrioDate;
  onChange: (value: TrioDate) => void;
  label?: string;
  helper?: string;
  error?: string;
  id?: string;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

export const TRIO_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const TRIO_YEAR_SPAN = 100;

export function trioYears(maxYear?: number, minYear?: number): number[] {
  const top = maxYear ?? new Date().getFullYear();
  const bottom = minYear ?? top - (TRIO_YEAR_SPAN - 1);
  const years: number[] = [];
  for (let year = top; year >= bottom; year -= 1) {
    years.push(year);
  }
  return years;
}

export function trioDaysInMonth(
  year: number | null,
  month: number | null,
): number {
  if (year === null || month === null) {
    return 31;
  }
  return new Date(year, month, 0).getDate();
}

export function trioClampDay(value: TrioDate): TrioDate {
  if (value.day === null) {
    return value;
  }
  const max = trioDaysInMonth(value.year, value.month);
  if (value.day <= max) {
    return value;
  }
  return { ...value, day: max };
}

function trioToInputValue(value: TrioDate): string {
  if (value.day === null || value.month === null || value.year === null) {
    return "";
  }
  const month = String(value.month).padStart(2, "0");
  const day = String(value.day).padStart(2, "0");
  return `${value.year}-${month}-${day}`;
}

function trioFromInputValue(raw: string): TrioDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    return { day: null, month: null, year: null };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    return { day: null, month: null, year: null };
  }
  const max = trioDaysInMonth(year, month);
  if (day < 1 || day > max) {
    return { day: null, month: null, year: null };
  }
  return { day, month, year };
}

function useCoarseSmallScreen(): boolean {
  return React.useSyncExternalStore(
    (notify) => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia === "undefined"
      ) {
        return () => {};
      }
      const query = window.matchMedia(
        "(max-width: 639px) and (pointer: coarse)",
      );
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () =>
      typeof window === "undefined" || typeof window.matchMedia === "undefined"
        ? false
        : window.matchMedia("(max-width: 639px) and (pointer: coarse)").matches,
    () => false,
  );
}

function TrioPicker({
  value,
  onChange,
  label = "Birth date",
  helper,
  error,
  id,
  minYear,
  maxYear,
  className,
}: TrioPickerProps) {
  const autoId = React.useId();
  const baseId = id ?? autoId;
  const helperId = `${baseId}-helper`;
  const errorId = `${baseId}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  const years = React.useMemo(
    () => trioYears(maxYear, minYear),
    [maxYear, minYear],
  );
  const maxDay = trioDaysInMonth(value.year, value.month);
  const days = React.useMemo(() => {
    const list: number[] = [];
    for (let day = 1; day <= 31; day += 1) {
      list.push(day);
    }
    return list;
  }, []);

  const useNative = useCoarseSmallScreen();

  if (useNative) {
    return (
      <Field className={className} data-slot="trio-picker">
        <FieldLabel htmlFor={`${baseId}-native`}>{label}</FieldLabel>
        <input
          id={`${baseId}-native`}
          data-slot="trio-picker-native"
          type="date"
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none select-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring aria-invalid:border-destructive"
          value={trioToInputValue(value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(trioFromInputValue(event.target.value))}
        />
        {helper && !error ? (
          <FieldDescription id={helperId}>{helper}</FieldDescription>
        ) : null}
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      </Field>
    );
  }

  return (
    <Field className={className} data-slot="trio-picker">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={value.day === null ? "" : String(value.day)}
          onValueChange={(raw) => onChange({ ...value, day: Number(raw) })}
        >
          <SelectTrigger
            aria-label="Day"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="min-h-11 w-full"
          >
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day} value={String(day)} disabled={day > maxDay}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.month === null ? "" : String(value.month)}
          onValueChange={(raw) =>
            onChange(trioClampDay({ ...value, month: Number(raw) }))
          }
        >
          <SelectTrigger
            aria-label="Month"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="min-h-11 w-full"
          >
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {TRIO_MONTHS.map((name, index) => (
              <SelectItem key={name} value={String(index + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.year === null ? "" : String(value.year)}
          onValueChange={(raw) =>
            onChange(trioClampDay({ ...value, year: Number(raw) }))
          }
        >
          <SelectTrigger
            aria-label="Year"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="min-h-11 w-full"
          >
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {helper && !error ? (
        <FieldDescription id={helperId}>{helper}</FieldDescription>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

export { TrioPicker };
