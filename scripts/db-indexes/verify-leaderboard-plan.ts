import { prisma } from "@/lib/prisma";

async function main() {
  const page: unknown = await prisma.$queryRawUnsafe(
    `EXPLAIN SELECT "s"."id", "s"."total_points", "s"."user_id" FROM "user_stats" AS "s" INNER JOIN "users" AS "u" ON ("u"."id" = "s"."user_id") WHERE "u"."role" <> 'ADMIN' ORDER BY "s"."total_points" DESC, "s"."user_id" ASC LIMIT 20`,
  );
  console.log(JSON.stringify(page, null, 2));
  const rank: unknown = await prisma.$queryRawUnsafe(
    `EXPLAIN SELECT COUNT(*) FROM "user_stats" AS "s" INNER JOIN "users" AS "u" ON ("u"."id" = "s"."user_id") WHERE "u"."role" <> 'ADMIN' AND "s"."total_points" > 0`,
  );
  console.log(JSON.stringify(rank, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
