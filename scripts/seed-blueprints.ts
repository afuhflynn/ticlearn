import { prisma } from "../lib/prisma";

async function seedBlueprints() {
  console.log("Seeding CS exam blueprints...");

  const csP1 = await prisma.component.findFirst({
    where: { program: { code: "CS" }, code: "P1" },
  });
  const csP2 = await prisma.component.findFirst({
    where: { program: { code: "CS" }, code: "P2" },
  });
  const csP3 = await prisma.component.findFirst({
    where: { program: { code: "CS" }, code: "P3" },
  });

  if (!csP1 || !csP2 || !csP3) {
    console.error("CS components not found. Run seed first.");
    process.exit(1);
  }

  // CS Paper 1 - 50 MCQ, 1 mark each, 60 min
  const bp1 = await prisma.examBlueprint.upsert({
    where: {
      componentId_name: { componentId: csP1.id, name: "CS Paper 1 Standard" },
    },
    update: {},
    create: {
      componentId: csP1.id,
      name: "CS Paper 1 Standard",
      description: "GCE A-Level Computer Science Paper 1 - Multiple Choice",
      totalMarks: 50,
      durationMin: 60,
      sections: {
        create: [
          {
            name: "Section A",
            questionCount: 50,
            marksPerQuestion: 1,
            totalMarks: 50,
            questionType: "MCQ",
            order: 1,
          },
        ],
      },
    },
  });
  console.log(
    `  ${bp1.name} - ${bp1.totalMarks} marks, ${bp1.durationMin} min`,
  );

  // CS Paper 2 - Structured, 100 marks, 120 min
  const bp2 = await prisma.examBlueprint.upsert({
    where: {
      componentId_name: { componentId: csP2.id, name: "CS Paper 2 Standard" },
    },
    update: {},
    create: {
      componentId: csP2.id,
      name: "CS Paper 2 Standard",
      description: "GCE A-Level Computer Science Paper 2 - Structured Theory",
      totalMarks: 100,
      durationMin: 120,
      sections: {
        create: [
          {
            name: "Section A",
            questionCount: 5,
            marksPerQuestion: 20,
            totalMarks: 60,
            questionType: "STRUCTURED",
            answerRule: "Answer any 3",
            order: 1,
          },
          {
            name: "Section B",
            questionCount: 1,
            marksPerQuestion: 40,
            totalMarks: 40,
            questionType: "STRUCTURED",
            order: 2,
          },
        ],
      },
    },
  });
  console.log(
    `  ${bp2.name} - ${bp2.totalMarks} marks, ${bp2.durationMin} min`,
  );

  // CS Paper 3 - Practical, 100 marks, 180 min
  const bp3 = await prisma.examBlueprint.upsert({
    where: {
      componentId_name: { componentId: csP3.id, name: "CS Paper 3 Standard" },
    },
    update: {},
    create: {
      componentId: csP3.id,
      name: "CS Paper 3 Standard",
      description: "GCE A-Level Computer Science Paper 3 - Practical",
      totalMarks: 100,
      durationMin: 180,
      sections: {
        create: [
          {
            name: "Section A",
            questionCount: 4,
            marksPerQuestion: 10,
            totalMarks: 40,
            questionType: "PRACTICAL",
            order: 1,
          },
          {
            name: "Section B",
            questionCount: 3,
            marksPerQuestion: 20,
            totalMarks: 60,
            questionType: "PRACTICAL",
            order: 2,
          },
        ],
      },
    },
  });
  console.log(
    `  ${bp3.name} - ${bp3.totalMarks} marks, ${bp3.durationMin} min`,
  );

  console.log("Blueprint seed complete.");
}

seedBlueprints()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
