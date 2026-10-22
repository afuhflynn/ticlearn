import { computeDailyMetrics } from "../lib/kpi";
import { prisma } from "../lib/prisma";

async function main() {
  const earliest = await prisma.kpiEvent.findFirst({
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (!earliest) {
    console.log("No KpiEvent records found. Nothing to backfill.");
    return;
  }

  const start = new Date(earliest.createdAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  console.log(
    `Backfilling metrics from ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`,
  );

  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    await computeDailyMetrics(new Date(d));
    count++;
    if (count % 30 === 0) {
      console.log(`  Processed ${count} days...`);
    }
  }

  console.log(`Backfill complete. ${count} days processed.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
