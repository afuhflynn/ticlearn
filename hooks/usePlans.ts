"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

export interface PlanTier {
  key: string;
  label: string;
  priceXaf: number;
  period: string;
  periodDays: number | null;
  semesterMonths: number | null;
  credits: number;
  features: string[];
  cta: string;
  popular: boolean;
  notForSale: boolean;
  limits: {
    pdfUploads: number;
    quizGenerations: number;
    aiTutorMessages: number;
    maxConversationMessages: number;
  };
}

export function usePlans() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.plans,
    queryFn: async () => {
      const result = await api.queries.plans();
      return result.tiers;
    },
    ...family("plans"),
  });

  return {
    tiers: (data ?? []) as PlanTier[],
    isLoading,
    isError,
    refetch,
  };
}
