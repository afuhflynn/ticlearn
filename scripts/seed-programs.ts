import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding comprehensive program data...");

  const gceOL = await prisma.examLevel.findUnique({
    where: { code: "GCE_OL" },
  });
  const gceAL = await prisma.examLevel.findUnique({
    where: { code: "GCE_AL" },
  });
  const hnd = await prisma.examLevel.findUnique({ where: { code: "HND" } });

  if (!gceOL || !gceAL || !hnd) {
    console.error("Exam levels not found. Run prisma/seed.ts first.");
    process.exit(1);
  }

  // GCE O-Level subjects
  const oLevelSubjects = [
    { name: "English Language", code: "ENL" },
    { name: "French", code: "FRE" },
    { name: "Mathematics", code: "MAT" },
    { name: "Additional Mathematics", code: "ADM" },
    { name: "Biology", code: "BIO" },
    { name: "Chemistry", code: "CHE" },
    { name: "Physics", code: "PHY" },
    { name: "Human Biology", code: "HBI" },
    { name: "Geography", code: "GEO" },
    { name: "History", code: "HIS" },
    { name: "Economics", code: "ECO" },
    { name: "Commerce", code: "COM" },
    { name: "Accounting", code: "ACC" },
    { name: "Computer Science", code: "CSC" },
    { name: "Literature in English", code: "LIT" },
    { name: "Religious Studies", code: "REL" },
    { name: "Citizenship", code: "CTZ" },
    { name: "Food and Nutrition", code: "FDN" },
    { name: "Entrepreneurship", code: "ENT" },
    { name: "Logic", code: "LOG" },
  ];

  for (const subj of oLevelSubjects) {
    await prisma.program.upsert({
      where: { code: `OL_${subj.code}` },
      update: {},
      create: {
        examLevelId: gceOL.id,
        name: subj.name,
        code: `OL_${subj.code}`,
      },
    });
  }
  console.log(`  GCE O-Level: ${oLevelSubjects.length} subjects seeded`);

  // GCE A-Level subjects (comprehensive)
  const aLevelSubjects = [
    { name: "Biology", code: "BIO" },
    { name: "Chemistry", code: "CHE" },
    { name: "Physics", code: "PHY" },
    { name: "Mathematics", code: "MAT" },
    { name: "Further Mathematics", code: "FMA" },
    { name: "Computer Science", code: "CSC" },
    { name: "ICT", code: "ICT" },
    { name: "Economics", code: "ECO" },
    { name: "Geography", code: "GEO" },
    { name: "History", code: "HIS" },
    { name: "Literature in English", code: "LIT" },
    { name: "French", code: "FRE" },
    { name: "Accounting", code: "ACC" },
    { name: "Business Management", code: "BUS" },
  ];

  for (const subj of aLevelSubjects) {
    await prisma.program.upsert({
      where: { code: subj.code },
      update: {},
      create: {
        examLevelId: gceAL.id,
        name: subj.name,
        code: subj.code,
      },
    });
  }
  console.log(`  GCE A-Level: ${aLevelSubjects.length} subjects seeded`);

  // HND specialties
  const hndSpecialties = [
    { name: "Software Engineering", code: "SWE" },
    { name: "Computer Science & Networks", code: "CSN" },
    { name: "Database Management", code: "DBM" },
    { name: "Computer Graphics & Web Design", code: "CGW" },
    { name: "Accounting & Finance", code: "ACC" },
    { name: "Banking & Finance", code: "BNK" },
    { name: "Marketing", code: "MKT" },
    { name: "Corporate Communication", code: "CCM" },
    { name: "Civil Engineering Technology", code: "CIV" },
    { name: "Building Construction", code: "BDC" },
    { name: "Chemical Manufacturing", code: "CHM" },
    { name: "Nursing", code: "NRS" },
    { name: "Crop Production Technology", code: "CRP" },
    { name: "Animal Production Technology", code: "ANP" },
    { name: "Customs & Transit", code: "CST" },
    { name: "E-Commerce", code: "ECM" },
  ];

  for (const spec of hndSpecialties) {
    await prisma.program.upsert({
      where: { code: `HND_${spec.code}` },
      update: {},
      create: {
        examLevelId: hnd.id,
        name: spec.name,
        code: `HND_${spec.code}`,
      },
    });
  }
  console.log(`  HND: ${hndSpecialties.length} specialties seeded`);

  console.log("Program seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
