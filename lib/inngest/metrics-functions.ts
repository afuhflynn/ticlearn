import { computeDailyMetrics } from "@/lib/kpi";
import { inngest } from "./client";

export const computeDailyMetricsJob = inngest.createFunction(
  {
    name: "Compute Daily Metrics",
    id: "compute-daily-metrics",
    triggers: { cron: "0 0,23 * * *" },
  },
  async ({ step }) => {
    const now = new Date();
    const targetDate = new Date(now);

    // Midnight run finalizes yesterday; 23:00 run refreshes today's in-progress KPIs.
    if (now.getUTCHours() === 0) {
      targetDate.setUTCDate(targetDate.getUTCDate() - 1);
    }

    const metrics = await step.run("compute-daily-metrics", async () => {
      return computeDailyMetrics(targetDate);
    });

    return {
      success: true,
      date: targetDate.toISOString().split("T")[0],
      count: metrics.length,
    };
  },
);
