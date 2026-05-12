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

  // Seed Topics for each Component
  console.log("Seeding topics...");

  const allComponents = await prisma.component.findMany({
    include: { program: true },
  });

  const topicMap: Record<string, Array<{ name: string; order: number }>> = {
    "CS:P1": [
      { name: "Data Representation", order: 1 },
      { name: "Computer Architecture & Hardware", order: 2 },
      { name: "Operating Systems", order: 3 },
      { name: "Networking & Communication", order: 4 },
      { name: "Data Structures", order: 5 },
      { name: "Software Engineering", order: 6 },
      { name: "Programming Paradigms", order: 7 },
      { name: "Database Concepts", order: 8 },
      { name: "Number Systems & Boolean Algebra", order: 9 },
    ],
    "CS:P2": [
      { name: "Algorithm Design", order: 1 },
      { name: "System Development Life Cycle", order: 2 },
      { name: "Database Design & Normalization", order: 3 },
      { name: "Network Design & Security", order: 4 },
      { name: "Software Testing & Maintenance", order: 5 },
      { name: "File Organization & Access Methods", order: 6 },
    ],
    "CS:P3": [
      { name: "Spreadsheet Modelling", order: 1 },
      { name: "Database Design & SQL", order: 2 },
      { name: "C Programming", order: 3 },
      { name: "Pascal Programming", order: 4 },
      { name: "Web Development (HTML/CSS)", order: 5 },
      { name: "Algorithm Design & Pseudocode", order: 6 },
      { name: "System Development Life Cycle", order: 7 },
    ],
    "ICT:P1": [
      { name: "Data Representation", order: 1 },
      { name: "Hardware & Software", order: 2 },
      { name: "Networking & Internet", order: 3 },
      { name: "ICT Applications", order: 4 },
      { name: "Security & Ethics", order: 5 },
    ],
    "ICT:P2": [
      { name: "System Analysis & Design", order: 1 },
      { name: "Database Management", order: 2 },
      { name: "Network Management", order: 3 },
      { name: "Web Technologies", order: 4 },
      { name: "ICT Project Management", order: 5 },
    ],
    "ICT:P3": [
      { name: "Spreadsheet Modelling", order: 1 },
      { name: "Database Design & SQL", order: 2 },
      { name: "C Programming", order: 3 },
      { name: "Pascal Programming", order: 4 },
      { name: "Web Development (HTML/CSS)", order: 5 },
      { name: "Algorithm Design & Pseudocode", order: 6 },
      { name: "System Development Life Cycle", order: 7 },
    ],
  };

  for (const comp of allComponents) {
    const key = `${comp.program.code}:${comp.code}`;
    const topics = topicMap[key];
    if (topics) {
      for (const topic of topics) {
        await prisma.topic.upsert({
          where: { componentId_name: { componentId: comp.id, name: topic.name } },
          update: { order: topic.order },
          create: { componentId: comp.id, name: topic.name, order: topic.order },
        });
      }
    }
  }

  console.log("Topics seeded.");
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
