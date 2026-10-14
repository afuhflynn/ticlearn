import { ensurePlatformSettings } from "../lib/platform-settings";
import { prisma } from "../lib/prisma";

async function main() {
  // Level of study is a plain string on the user, constrained to Year 1
  // through Year 4 in application code, so there is no level table and
  // nothing academic to seed. No programme, subject, component, blueprint
  // or topic row is created here, by design.
  await ensurePlatformSettings();
  console.log(
    "Seed complete: platform settings ensured, no content rows created.",
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
