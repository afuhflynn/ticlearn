import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

interface SearchableUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
}

export function useUserSearch(debounceMs: number = 300) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin", "users", "search", debouncedQuery],
    queryFn: () => api.mutations.admin.users.search(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  const search = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clear = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    searchQuery,
    setSearch: search,
    clearSearch: clear,
    results: (data?.users ?? []) as SearchableUser[],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    refetch,
  };
}
