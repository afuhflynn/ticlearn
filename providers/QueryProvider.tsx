"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { queryFamilies } from "@/lib/query-families";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The floor for anything without a named family. Every hook that
            // holds student data names one from lib/query-families.ts, so this
            // only ever covers the rare unmapped read.
            staleTime: queryFamilies.notes.staleTimeMs,
            gcTime: queryFamilies.notes.gcTimeMs,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
