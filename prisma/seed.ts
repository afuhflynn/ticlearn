import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding exam structure...");

  // ── Exam Levels ──────────────────────────────────────────
  const gceAL = await prisma.examLevel.upsert({
    where: { code: "GCE_AL" },
    update: {},
    create: { name: "GCE A-Level", code: "GCE_AL" },
  });
  const gceOL = await prisma.examLevel.upsert({
    where: { code: "GCE_OL" },
    update: {},
    create: { name: "GCE O-Level", code: "GCE_OL" },
  });
  const hnd = await prisma.examLevel.upsert({
    where: { code: "HND" },
    update: {},
    create: { name: "HND", code: "HND" },
  });
  console.log("Exam levels seeded.");

  // ── Helper: upsert a program and return it ───────────────
  async function upsertProgram(
    examLevelId: string,
    code: string,
    name: string,
  ) {
    return prisma.program.upsert({
      where: { code },
      update: {},
      create: { examLevelId, name, code },
    });
  }

  // ── Programs ─────────────────────────────────────────────

  // GCE A-Level
  await upsertProgram(gceAL.id, "CS", "Computer Science");
  await upsertProgram(
    gceAL.id,
    "ICT",
    "Information & Communication Technology",
  );
  await upsertProgram(gceAL.id, "UNKNOWN", "Unknown");

  // GCE O-Level (common subjects)
  const olSubjects: Array<{ code: string; name: string }> = [
    { code: "OL_MATH", name: "Mathematics" },
    { code: "OL_ENG", name: "English Language" },
    { code: "OL_BIO", name: "Biology" },
    { code: "OL_PHY", name: "Physics" },
    { code: "OL_CHEM", name: "Chemistry" },
    { code: "OL_ECO", name: "Economics" },
    { code: "OL_GEO", name: "Geography" },
    { code: "OL_HIST", name: "History" },
    { code: "OL_LIT", name: "Literature in English" },
    { code: "OL_FRENCH", name: "French" },
    { code: "OL_CS", name: "Computer Science" },
    { code: "OL_ACC", name: "Accounting" },
    { code: "OL_ADD_MATH", name: "Additional Mathematics" },
    { code: "OL_AGRIC", name: "Agricultural Science" },
    { code: "OL_COMMERCE", name: "Commerce" },
  ];
  for (const subj of olSubjects) {
    await upsertProgram(gceOL.id, subj.code, subj.name);
  }

  // HND specialties
  const hndSpecialties: Array<{ code: string; name: string }> = [
    { code: "HND_SWE", name: "Software Engineering" },
    { code: "HND_ACCOUNTING", name: "Accounting" },
    { code: "HND_BANKING", name: "Banking & Finance" },
    { code: "HND_CIVIL_ENG", name: "Civil Engineering" },
    { code: "HND_ELECTRICAL_ENG", name: "Electrical Engineering" },
    { code: "HND_NURSING", name: "Nursing" },
    { code: "HND_BUS_MGT", name: "Business Management" },
    { code: "HND_HOSPITALITY", name: "Hospitality Management" },
  ];
  for (const spec of hndSpecialties) {
    await upsertProgram(hnd.id, spec.code, spec.name);
  }

  console.log("Programs seeded.");

  // ── Components ───────────────────────────────────────────

  // A-Level: CS + ICT get P1, P2, P3
  async function createComponents(
    programCode: string,
    comps: Array<{ code: string; name: string; type: "PAPER" | "COURSE" }>,
  ) {
    const prog = await prisma.program.findUniqueOrThrow({
      where: { code: programCode },
    });
    await prisma.component.createMany({
      data: comps.map((c) => ({ programId: prog.id, ...c })),
      skipDuplicates: true,
    });
  }

  await createComponents("CS", [
    { code: "P1", name: "Paper 1", type: "PAPER" },
    { code: "P2", name: "Paper 2", type: "PAPER" },
    { code: "P3", name: "Paper 3", type: "PAPER" },
  ]);
  await createComponents("ICT", [
    { code: "P1", name: "Paper 1", type: "PAPER" },
    { code: "P2", name: "Paper 2", type: "PAPER" },
    { code: "P3", name: "Paper 3", type: "PAPER" },
  ]);

  // O-Level: each subject gets P1 + P2
  for (const subj of olSubjects) {
    await createComponents(subj.code, [
      { code: "P1", name: "Paper 1", type: "PAPER" },
      { code: "P2", name: "Paper 2", type: "PAPER" },
    ]);
  }

  // HND: each specialty gets Year 1 + Year 2 (COURSE type)
  for (const spec of hndSpecialties) {
    await createComponents(spec.code, [
      { code: "Y1", name: "Year 1", type: "COURSE" },
      { code: "Y2", name: "Year 2", type: "COURSE" },
    ]);
  }

  console.log("Components seeded.");

  // ── Topics ───────────────────────────────────────────────

  const topicMap: Record<string, Array<{ name: string; order: number }>> = {
    // ── A-Level CS ──
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
    // ── A-Level ICT ──
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
    // ── O-Level Subjects ──
    "OL_MATH:P1": [
      { name: "Number Theory & Sets", order: 1 },
      { name: "Algebra", order: 2 },
      { name: "Geometry", order: 3 },
      { name: "Trigonometry", order: 4 },
      { name: "Probability", order: 5 },
    ],
    "OL_MATH:P2": [
      { name: "Statistics", order: 1 },
      { name: "Mensuration", order: 2 },
      { name: "Vectors & Transformations", order: 3 },
      { name: "Sequences & Series", order: 4 },
    ],
    "OL_ENG:P1": [
      { name: "Comprehension", order: 1 },
      { name: "Summary Writing", order: 2 },
      { name: "Vocabulary", order: 3 },
    ],
    "OL_ENG:P2": [
      { name: "Essay Writing", order: 1 },
      { name: "Letter Writing", order: 2 },
      { name: "Creative Writing", order: 3 },
    ],
    "OL_BIO:P1": [
      { name: "Cell Biology", order: 1 },
      { name: "Genetics & Evolution", order: 2 },
      { name: "Ecology", order: 3 },
      { name: "Variety of Life", order: 4 },
    ],
    "OL_BIO:P2": [
      { name: "Human Physiology", order: 1 },
      { name: "Plant Physiology", order: 2 },
      { name: "Health & Disease", order: 3 },
    ],
    "OL_PHY:P1": [
      { name: "Mechanics", order: 1 },
      { name: "Waves & Sound", order: 2 },
      { name: "Light & Optics", order: 3 },
      { name: "Electricity & Magnetism", order: 4 },
    ],
    "OL_PHY:P2": [
      { name: "Thermal Physics", order: 1 },
      { name: "Atomic & Nuclear Physics", order: 2 },
      { name: "Electronics", order: 3 },
    ],
    "OL_CHEM:P1": [
      { name: "Atomic Structure & Bonding", order: 1 },
      { name: "Periodic Chemistry", order: 2 },
      { name: "Physical Chemistry", order: 3 },
    ],
    "OL_CHEM:P2": [
      { name: "Organic Chemistry", order: 1 },
      { name: "Inorganic Chemistry", order: 2 },
      { name: "Qualitative & Quantitative Analysis", order: 3 },
    ],
    "OL_ECO:P1": [
      { name: "Basic Economic Concepts", order: 1 },
      { name: "Demand & Supply", order: 2 },
      { name: "Market Structures", order: 3 },
      { name: "National Income", order: 4 },
    ],
    "OL_ECO:P2": [
      { name: "Money & Banking", order: 1 },
      { name: "International Trade", order: 2 },
      { name: "Economic Development", order: 3 },
    ],
    "OL_GEO:P1": [
      { name: "Physical Geography", order: 1 },
      { name: "Map Reading & Interpretation", order: 2 },
      { name: "Climatology", order: 3 },
    ],
    "OL_GEO:P2": [
      { name: "Human Geography", order: 1 },
      { name: "Economic Geography", order: 2 },
      { name: "Regional Geography of Cameroon", order: 3 },
    ],
    "OL_HIST:P1": [
      { name: "African Civilizations", order: 1 },
      { name: "Colonialism in Africa", order: 2 },
      { name: "Nationalist Movements", order: 3 },
    ],
    "OL_HIST:P2": [
      { name: "Cameroon History (Pre-colonial)", order: 1 },
      { name: "Cameroon Under German/French/British Rule", order: 2 },
      { name: "Post-Independence Cameroon", order: 3 },
    ],
    "OL_LIT:P1": [
      { name: "Poetry Analysis", order: 1 },
      { name: "Drama Studies", order: 2 },
    ],
    "OL_LIT:P2": [
      { name: "Prose Fiction", order: 1 },
      { name: "Essay & Critical Analysis", order: 2 },
    ],
    "OL_FRENCH:P1": [
      { name: "Grammaire & Conjugaison", order: 1 },
      { name: "Compréhension Écrite", order: 2 },
      { name: "Vocabulaire", order: 3 },
    ],
    "OL_FRENCH:P2": [
      { name: "Rédaction & Expression Écrite", order: 1 },
      { name: "Civilisation & Culture", order: 2 },
    ],
    "OL_CS:P1": [
      { name: "Introduction to Computing", order: 1 },
      { name: "Computer Hardware", order: 2 },
      { name: "Software & Programming Concepts", order: 3 },
    ],
    "OL_CS:P2": [
      { name: "Data Processing", order: 1 },
      { name: "Internet & Web Technologies", order: 2 },
      { name: "Practical Problem Solving", order: 3 },
    ],
    "OL_ACC:P1": [
      { name: "Principles of Accounting", order: 1 },
      { name: "Books of Accounts", order: 2 },
      { name: "Trial Balance & Financial Statements", order: 3 },
    ],
    "OL_ACC:P2": [
      { name: "Partnership Accounts", order: 1 },
      { name: "Company Accounts", order: 2 },
      { name: "Interpretation of Accounts", order: 3 },
    ],
    "OL_ADD_MATH:P1": [
      { name: "Functions & Graphs", order: 1 },
      { name: "Calculus (Differentiation)", order: 2 },
      { name: "Calculus (Integration)", order: 3 },
      { name: "Matrices & Determinants", order: 4 },
    ],
    "OL_ADD_MATH:P2": [
      { name: "Binomial Theorem", order: 1 },
      { name: "Probability Distributions", order: 2 },
      { name: "Linear Programming", order: 3 },
    ],
    // ── HND Specialties ──
    "HND_SWE:Y1": [
      { name: "Introduction to Programming", order: 1 },
      { name: "Data Structures & Algorithms", order: 2 },
      { name: "Database Systems", order: 3 },
      { name: "Web Development Fundamentals", order: 4 },
      { name: "Discrete Mathematics", order: 5 },
    ],
    "HND_SWE:Y2": [
      { name: "Software Engineering Principles", order: 1 },
      { name: "Object-Oriented Programming", order: 2 },
      { name: "Network & Systems Administration", order: 3 },
      { name: "Mobile Application Development", order: 4 },
      { name: "Project Management", order: 5 },
    ],
    "HND_ACCOUNTING:Y1": [
      { name: "Financial Accounting I", order: 1 },
      { name: "Cost Accounting", order: 2 },
      { name: "Business Mathematics", order: 3 },
      { name: "Principles of Economics", order: 4 },
      { name: "Business Law", order: 5 },
    ],
    "HND_ACCOUNTING:Y2": [
      { name: "Financial Accounting II", order: 1 },
      { name: "Auditing", order: 2 },
      { name: "Taxation", order: 3 },
      { name: "Financial Management", order: 4 },
      { name: "Corporate Reporting", order: 5 },
    ],
    "HND_BANKING:Y1": [
      { name: "Principles of Banking", order: 1 },
      { name: "Microeconomics", order: 2 },
      { name: "Business Statistics", order: 3 },
      { name: "Financial Accounting", order: 4 },
    ],
    "HND_BANKING:Y2": [
      { name: "Monetary Economics", order: 1 },
      { name: "Risk Management", order: 2 },
      { name: "Investment Analysis", order: 3 },
      { name: "International Finance", order: 4 },
    ],
    "HND_CIVIL_ENG:Y1": [
      { name: "Engineering Mathematics", order: 1 },
      { name: "Engineering Mechanics", order: 2 },
      { name: "Surveying", order: 3 },
      { name: "Building Materials", order: 4 },
    ],
    "HND_CIVIL_ENG:Y2": [
      { name: "Structural Analysis", order: 1 },
      { name: "Soil Mechanics", order: 2 },
      { name: "Hydraulics", order: 3 },
      { name: "Construction Management", order: 4 },
    ],
    "HND_ELECTRICAL_ENG:Y1": [
      { name: "Engineering Mathematics", order: 1 },
      { name: "Circuit Analysis", order: 2 },
      { name: "Electronics", order: 3 },
      { name: "Electrical Machines", order: 4 },
    ],
    "HND_ELECTRICAL_ENG:Y2": [
      { name: "Power Systems", order: 1 },
      { name: "Control Systems", order: 2 },
      { name: "Telecommunications", order: 3 },
      { name: "Microprocessors & Embedded Systems", order: 4 },
    ],
    "HND_NURSING:Y1": [
      { name: "Anatomy & Physiology", order: 1 },
      { name: "Fundamentals of Nursing", order: 2 },
      { name: "Pharmacology", order: 3 },
      { name: "Microbiology", order: 4 },
    ],
    "HND_NURSING:Y2": [
      { name: "Medical-Surgical Nursing", order: 1 },
      { name: "Pediatric Nursing", order: 2 },
      { name: "Community Health Nursing", order: 3 },
      { name: "Mental Health Nursing", order: 4 },
    ],
    "HND_BUS_MGT:Y1": [
      { name: "Principles of Management", order: 1 },
      { name: "Organizational Behavior", order: 2 },
      { name: "Business Communication", order: 3 },
      { name: "Marketing Principles", order: 4 },
    ],
    "HND_BUS_MGT:Y2": [
      { name: "Strategic Management", order: 1 },
      { name: "Human Resource Management", order: 2 },
      { name: "Entrepreneurship", order: 3 },
      { name: "Business Research Methods", order: 4 },
    ],
    "HND_HOSPITALITY:Y1": [
      { name: "Introduction to Hospitality", order: 1 },
      { name: "Food & Beverage Management", order: 2 },
      { name: "Housekeeping Operations", order: 3 },
      { name: "Customer Service", order: 4 },
    ],
    "HND_HOSPITALITY:Y2": [
      { name: "Hotel Management", order: 1 },
      { name: "Event Planning & Management", order: 2 },
      { name: "Tourism Management", order: 3 },
      { name: "Hospitality Accounting", order: 4 },
    ],
  };

  const allComponents = await prisma.component.findMany({
    include: { program: true },
  });

  for (const comp of allComponents) {
    const key = `${comp.program.code}:${comp.code}`;
    const topics = topicMap[key];
    if (topics) {
      for (const topic of topics) {
        await prisma.topic.upsert({
          where: {
            componentId_name: { componentId: comp.id, name: topic.name },
          },
          update: { order: topic.order },
          create: {
            componentId: comp.id,
            name: topic.name,
            order: topic.order,
          },
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
