import { inngest } from "./client";
import { computeDailyMetrics } from "@/lib/kpi";

export const computeDailyMetricsJob = inngest.createFunction(
  {
    name: "Compute Daily Metrics",
    id: "compute-daily-metrics",
    triggers: { cron: "0 0 * * *" },
  },
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const metrics = await step.run("compute-yesterday-metrics", async () => {
      return computeDailyMetrics(yesterday);
    });

    return {
      success: true,
      date: yesterday.toISOString().split("T")[0],
      count: metrics.length,
    };
  },
);
