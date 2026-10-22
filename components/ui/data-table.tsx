"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableColumn<_T> {
  key: string;
  header: string;
  sortable?: boolean;
}

export interface DataTableProps {
  columns: DataTableColumn<any>[];
  rows: Record<string, any>[];
  caption: string;
  onRowClick?: (row: Record<string, any>) => void;
}

export function DataTable({
  columns,
  rows,
  caption,
  onRowClick,
}: DataTableProps) {
  return (
    <div>
      <span aria-live="polite" className="sr-only">
        {rows.length} rows
      </span>
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.key}
                aria-sort={c.sortable ? "none" : undefined}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={String(r.id ?? JSON.stringify(r))}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key}>{r[c.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
