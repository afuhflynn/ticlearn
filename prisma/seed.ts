import { prisma } from "@/lib/prisma";

async function main() {
  console.log("Seeding exam structure...");

  // Create Exam Levels
  const gceAL = await prisma.examLevel.upsert({
    where: { code: "GCE_AL" },
    update: {},
    create: { name: "GCE A-Level", code: "GCE_AL" },
  });
  await prisma.examLevel.upsert({
    where: { code: "GCE_OL" },
    update: {},
    create: { name: "GCE O-Level", code: "GCE_OL" },
  });
  await prisma.examLevel.upsert({
    where: { code: "HND" },
    update: {},
    create: { name: "HND", code: "HND" },
  });
  console.log("Exam levels seeded.");

  // Create Programs under GCE A-Level
  await prisma.program.upsert({
    where: { code: "CS" },
    update: {},
    create: { examLevelId: gceAL.id, name: "Computer Science", code: "CS" },
  });
  await prisma.program.upsert({
    where: { code: "ICT" },
    update: {},
    create: {
      examLevelId: gceAL.id,
      name: "Information & Communication Technology",
      code: "ICT",
    },
  });
  await prisma.program.upsert({
    where: { code: "UNKNOWN" },
    update: {},
    create: { examLevelId: gceAL.id, name: "Unknown", code: "UNKNOWN" },
  });
  console.log("Programs seeded.");

  // Create Components for each program
  const cs = await prisma.program.findUniqueOrThrow({ where: { code: "CS" } });
  await prisma.component.createMany({
    data: [
      { programId: cs.id, name: "Paper 1", code: "P1", type: "PAPER" },
      { programId: cs.id, name: "Paper 2", code: "P2", type: "PAPER" },
      { programId: cs.id, name: "Paper 3", code: "P3", type: "PAPER" },
    ],
    skipDuplicates: true,
  });

  const ict = await prisma.program.findUniqueOrThrow({
    where: { code: "ICT" },
  });
  await prisma.component.createMany({
    data: [
      { programId: ict.id, name: "Paper 1", code: "P1", type: "PAPER" },
      { programId: ict.id, name: "Paper 2", code: "P2", type: "PAPER" },
      { programId: ict.id, name: "Paper 3", code: "P3", type: "PAPER" },
    ],
    skipDuplicates: true,
  });

  console.log("Components seeded.");
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
