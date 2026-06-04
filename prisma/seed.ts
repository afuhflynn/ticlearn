import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding exam structure...");

  // ── Exam Levels ──────────────────────────────────────────
  async function upsertLevel(code: string, name: string) {
    return prisma.examLevel.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
  }

  const gceAL = await upsertLevel("GCE_AL", "GCE A-Level");
  const gceOL = await upsertLevel("GCE_OL", "GCE O-Level");
  const gceALComm = await upsertLevel(
    "GCE_AL_COMMERCIAL",
    "GCE A-Level (Commercial/TVEE)",
  );
  const gceOLComm = await upsertLevel(
    "GCE_OL_COMMERCIAL",
    "GCE O-Level (Commercial/TVEE)",
  );
  const hnd = await upsertLevel("HND", "HND");
  console.log("Exam levels seeded.");

  // ── Helper: upsert a program ─────────────────────────────
  async function upsertProgram(examLevelId: string, code: string, name: string) {
    return prisma.program.upsert({
      where: { code },
      update: {},
      create: { examLevelId, name, code },
    });
  }

  // ── Helper: create components for a program ──────────────
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

  // ── Programs: GCE A-Level General ────────────────────────
  const alSubjects: Array<{ code: string; name: string }> = [
    { code: "CS", name: "Computer Science" },
    { code: "ICT", name: "Information & Communication Technology" },
    { code: "BIO", name: "Biology" },
    { code: "CHEM", name: "Chemistry" },
    { code: "PHY", name: "Physics" },
    { code: "PMM", name: "Pure Mathematics with Mechanics" },
    { code: "PMS", name: "Pure Mathematics with Statistics" },
    { code: "FM", name: "Further Mathematics" },
    { code: "FSN", name: "Food Science and Nutrition" },
    { code: "GEOL", name: "Geology" },
    { code: "ENG", name: "English Language" },
    { code: "LIT", name: "Literature in English" },
    { code: "FRENCH", name: "French" },
    { code: "SBE_FR", name: "Special Bilingual Education French" },
    { code: "HIST", name: "History" },
    { code: "GEOG", name: "Geography" },
    { code: "RS", name: "Religious Studies" },
    { code: "PHIL", name: "Philosophy" },
    { code: "ECONS", name: "Economics" },
    { code: "ACCT", name: "Accounting" },
  ];
  for (const subj of alSubjects) {
    await upsertProgram(gceAL.id, subj.code, subj.name);
  }

  // ── Programs: GCE O-Level General ────────────────────────
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
    { code: "OL_CITIZEN", name: "Citizenship Education" },
    { code: "OL_FOOD", name: "Food and Nutrition" },
    { code: "OL_GEOL", name: "Geology" },
    { code: "OL_HUMAN_BIO", name: "Human Biology" },
    { code: "OL_ICT", name: "ICT" },
    { code: "OL_LOGIC", name: "Logic" },
  ];
  for (const subj of olSubjects) {
    await upsertProgram(gceOL.id, subj.code, subj.name);
  }

  // ── Programs: GCE A-Level Commercial (TVEE) ──────────────
  const alCommercialSpecialties: Array<{ code: string; name: string }> = [
    { code: "AL_ACC", name: "Accounting" },
    { code: "AL_MKT", name: "Marketing" },
    { code: "AL_SAC", name: "Secretarial Administration and Communication" },
    { code: "AL_HEC", name: "Home Economics" },
    { code: "AL_TIMS", name: "Taxation and Information Management Systems" },
    { code: "AL_TOUR", name: "Tourism Management" },
  ];
  for (const spec of alCommercialSpecialties) {
    await upsertProgram(gceALComm.id, spec.code, spec.name);
  }

  // ── Programs: GCE O-Level Commercial (TVEE IL) ──────────
  const olCommercialSpecialties: Array<{ code: string; name: string }> = [
    { code: "OL_ACC_COM", name: "Accounting" },
    { code: "OL_MKT_COM", name: "Marketing" },
    { code: "OL_SAC_COM", name: "Secretarial Administration and Communication" },
    { code: "OL_HEC_COM", name: "Home Economics" },
  ];
  for (const spec of olCommercialSpecialties) {
    await upsertProgram(gceOLComm.id, spec.code, spec.name);
  }

  // ── Programs: HND (unchanged) ────────────────────────────
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

  // ── Components: GCE A-Level General ─────────────────────
  for (const subj of alSubjects) {
    const isCSorICT = subj.code === "CS" || subj.code === "ICT";
    await createComponents(subj.code, [
      { code: "P1", name: "Paper 1", type: "PAPER" },
      { code: "P2", name: "Paper 2", type: "PAPER" },
      ...(isCSorICT ? [{ code: "P3", name: "Paper 3", type: "PAPER" as const }] : []),
    ]);
  }

  // ── Components: GCE O-Level General ─────────────────────
  for (const subj of olSubjects) {
    await createComponents(subj.code, [
      { code: "P1", name: "Paper 1", type: "PAPER" },
      { code: "P2", name: "Paper 2", type: "PAPER" },
    ]);
  }

  // ── Components: GCE A-Level Commercial ─────────────────
  const alCommercialSubjects: Record<string, Array<{ code: string; name: string }>> = {
    AL_ACC: [
      { code: "FIN_ACC", name: "Financial Accounting" },
      { code: "COST_MGT", name: "Cost and Management Accounting" },
      { code: "CORP_ACC", name: "Corporate Accounting" },
      { code: "TAXATION", name: "Taxation" },
      { code: "BUS_MATH", name: "Business Mathematics" },
      { code: "ECON", name: "Economics" },
      { code: "BUS_MGT", name: "Business Management" },
      { code: "COMM_FIN", name: "Commerce and Finance" },
    ],
    AL_MKT: [
      { code: "PROF_MKT", name: "Professional Marketing Practice" },
      { code: "MKT_SKILLS", name: "Marketing Skills and Techniques" },
      { code: "DIGITAL_MKT", name: "Digital Marketing Practice" },
      { code: "BUS_MATH", name: "Business Mathematics" },
      { code: "ECON", name: "Economics" },
      { code: "BUS_MGT", name: "Business Management" },
      { code: "COMM_FIN", name: "Commerce and Finance" },
      { code: "ICT", name: "ICT" },
    ],
    AL_SAC: [
      { code: "ORG_ADMIN", name: "Organisation of Administrative Work" },
      { code: "PROF_COMM", name: "Professional Communication Skills" },
      { code: "INFO_PROC", name: "Information Processing" },
      { code: "ICT", name: "ICT" },
      { code: "PROF_ENG", name: "Professional English" },
      { code: "LAW", name: "Law" },
      { code: "BUS_MATH", name: "Business Mathematics" },
    ],
    AL_HEC: [
      { code: "CATERING", name: "Catering Management and Dietetics" },
      { code: "RESOURCE_MGT", name: "Resource Management in Home Studies" },
      { code: "FAMILY_ED", name: "Family Life Education and Gerontology" },
      { code: "NAT_SCI", name: "Natural Science" },
      { code: "ENTREP", name: "Entrepreneurship" },
      { code: "PROF_ENG", name: "Professional English" },
    ],
    AL_TIMS: [
      { code: "FIN_ACC", name: "Financial Accounting" },
      { code: "TAX_PRACTICE", name: "Principles and Practice of Taxation" },
      { code: "INFO_MGT_SYS", name: "Information Management Systems for Business" },
      { code: "BUS_MATH", name: "Business Mathematics" },
      { code: "ECON", name: "Economics" },
      { code: "BUS_MGT", name: "Business Management" },
      { code: "COMM_FIN", name: "Commerce and Finance" },
      { code: "ENTREP", name: "Entrepreneurship" },
      { code: "ICT", name: "ICT" },
    ],
    AL_TOUR: [
      { code: "TOURISM_MGT", name: "Tourism Management" },
      { code: "HOSP_MGT", name: "Hospitality Management" },
      { code: "TRAVEL_OPS", name: "Travel Agency Operations" },
      { code: "BUS_MATH", name: "Business Mathematics" },
      { code: "ECON", name: "Economics" },
      { code: "BUS_MGT", name: "Business Management" },
      { code: "COMM_FIN", name: "Commerce and Finance" },
      { code: "ICT", name: "ICT" },
    ],
  };
  for (const [specCode, subjects] of Object.entries(alCommercialSubjects)) {
    await createComponents(
      specCode,
      subjects.map((s) => ({ ...s, type: "COURSE" as const })),
    );
  }

  // ── Components: GCE O-Level Commercial ─────────────────
  const olCommercialSubjects: Record<string, Array<{ code: string; name: string }>> = {
    OL_ACC_COM: [
      { code: "FIN_ACC", name: "Financial Accounting" },
      { code: "COMMERCE", name: "Commerce" },
      { code: "BUS_MATH", name: "Business Mathematics" },
      { code: "ENG", name: "English Language" },
    ],
    OL_MKT_COM: [
      { code: "PRIN_MKT", name: "Principles of Marketing" },
      { code: "COMMERCE", name: "Commerce" },
      { code: "BUS_MATH", name: "Business Mathematics" },
      { code: "ENG", name: "English Language" },
    ],
    OL_SAC_COM: [
      { code: "SEC_DUTIES", name: "Secretarial Duties" },
      { code: "OFFICE_PRAC", name: "Office Practice" },
      { code: "ENG", name: "English Language" },
      { code: "COMMERCE", name: "Commerce" },
    ],
    OL_HEC_COM: [
      { code: "HOME_MGT", name: "Home Management" },
      { code: "FOOD_NUTR", name: "Food and Nutrition" },
      { code: "ENG", name: "English Language" },
      { code: "MATH", name: "Mathematics" },
    ],
  };
  for (const [specCode, subjects] of Object.entries(olCommercialSubjects)) {
    await createComponents(
      specCode,
      subjects.map((s) => ({ ...s, type: "COURSE" as const })),
    );
  }

  // ── Components: HND (unchanged) ─────────────────────────
  for (const spec of hndSpecialties) {
    await createComponents(spec.code, [
      { code: "Y1", name: "Year 1", type: "COURSE" },
      { code: "Y2", name: "Year 2", type: "COURSE" },
    ]);
  }

  console.log("Components seeded.");

  // ── Topics ───────────────────────────────────────────────
  const topicMap: Record<string, Array<{ name: string; order: number }>> = {
    // ── A-Level CS (unchanged) ──
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
    // ── A-Level ICT (unchanged) ──
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
    // ── A-Level Biology ──
    "BIO:P1": [
      { name: "Cell Biology", order: 1 },
      { name: "Genetics & Evolution", order: 2 },
      { name: "Ecology", order: 3 },
      { name: "Variety of Life", order: 4 },
      { name: "Biochemistry", order: 5 },
    ],
    "BIO:P2": [
      { name: "Human Physiology", order: 1 },
      { name: "Plant Physiology", order: 2 },
      { name: "Health & Disease", order: 3 },
      { name: "Reproduction", order: 4 },
      { name: "Biotechnology", order: 5 },
    ],
    // ── A-Level Chemistry ──
    "CHEM:P1": [
      { name: "Atomic Structure & Bonding", order: 1 },
      { name: "Periodic Chemistry", order: 2 },
      { name: "Physical Chemistry", order: 3 },
      { name: "Chemical Energetics", order: 4 },
      { name: "Equilibria", order: 5 },
    ],
    "CHEM:P2": [
      { name: "Organic Chemistry", order: 1 },
      { name: "Inorganic Chemistry", order: 2 },
      { name: "Qualitative & Quantitative Analysis", order: 3 },
      { name: "Transition Metals", order: 4 },
    ],
    // ── A-Level Physics ──
    "PHY:P1": [
      { name: "Mechanics", order: 1 },
      { name: "Waves & Sound", order: 2 },
      { name: "Light & Optics", order: 3 },
      { name: "Electricity & Magnetism", order: 4 },
      { name: "Modern Physics", order: 5 },
    ],
    "PHY:P2": [
      { name: "Thermal Physics", order: 1 },
      { name: "Atomic & Nuclear Physics", order: 2 },
      { name: "Electronics", order: 3 },
      { name: "Fields & Particles", order: 4 },
    ],
    // ── A-Level Pure Math with Mechanics ──
    "PMM:P1": [
      { name: "Algebra & Functions", order: 1 },
      { name: "Trigonometry", order: 2 },
      { name: "Calculus", order: 3 },
      { name: "Vectors", order: 4 },
      { name: "Numerical Methods", order: 5 },
    ],
    "PMM:P2": [
      { name: "Mechanics: Kinematics", order: 1 },
      { name: "Mechanics: Dynamics", order: 2 },
      { name: "Mechanics: Statics", order: 3 },
      { name: "Mechanics: Momentum", order: 4 },
    ],
    // ── A-Level Pure Math with Statistics ──
    "PMS:P1": [
      { name: "Algebra & Functions", order: 1 },
      { name: "Trigonometry", order: 2 },
      { name: "Calculus", order: 3 },
      { name: "Vectors", order: 4 },
      { name: "Numerical Methods", order: 5 },
    ],
    "PMS:P2": [
      { name: "Probability", order: 1 },
      { name: "Probability Distributions", order: 2 },
      { name: "Statistical Inference", order: 3 },
      { name: "Hypothesis Testing", order: 4 },
      { name: "Correlation & Regression", order: 5 },
    ],
    // ── A-Level Further Mathematics ──
    "FM:P1": [
      { name: "Complex Numbers", order: 1 },
      { name: "Matrices & Determinants", order: 2 },
      { name: "Further Algebra", order: 3 },
      { name: "Series & Sequences", order: 4 },
    ],
    "FM:P2": [
      { name: "Further Calculus", order: 1 },
      { name: "Differential Equations", order: 2 },
      { name: "Coordinate Geometry", order: 3 },
      { name: "Linear Programming", order: 4 },
    ],
    // ── A-Level Food Science & Nutrition ──
    "FSN:P1": [
      { name: "Food Science", order: 1 },
      { name: "Nutrition & Health", order: 2 },
      { name: "Food Commodities", order: 3 },
      { name: "Food Microbiology", order: 4 },
    ],
    "FSN:P2": [
      { name: "Diet Planning", order: 1 },
      { name: "Food Preparation & Cooking", order: 2 },
      { name: "Food Spoilage & Preservation", order: 3 },
      { name: "Meal Management", order: 4 },
    ],
    // ── A-Level Geology ──
    "GEOL:P1": [
      { name: "Earth Structure & Composition", order: 1 },
      { name: "Minerals & Rocks", order: 2 },
      { name: "Plate Tectonics", order: 3 },
      { name: "Geological Time", order: 4 },
    ],
    "GEOL:P2": [
      { name: "Sedimentology & Stratigraphy", order: 1 },
      { name: "Structural Geology", order: 2 },
      { name: "Economic Geology", order: 3 },
      { name: "Field Geology", order: 4 },
    ],
    // ── A-Level English Language ──
    "ENG:P1": [
      { name: "Language & Meaning", order: 1 },
      { name: "Grammar & Structure", order: 2 },
      { name: "Phonetics & Phonology", order: 3 },
      { name: "Language Acquisition", order: 4 },
    ],
    "ENG:P2": [
      { name: "Essay Writing", order: 1 },
      { name: "Comprehension & Summary", order: 2 },
      { name: "Language & Society", order: 3 },
      { name: "Creative Writing", order: 4 },
    ],
    // ── A-Level Literature in English ──
    "LIT:P1": [
      { name: "Poetry Analysis", order: 1 },
      { name: "Drama Studies", order: 2 },
      { name: "Prose Fiction", order: 3 },
      { name: "Literary Criticism", order: 4 },
    ],
    "LIT:P2": [
      { name: "African Literature", order: 1 },
      { name: "Shakespeare", order: 2 },
      { name: "Modern Drama", order: 3 },
      { name: "Comparative Literature", order: 4 },
    ],
    // ── A-Level French ──
    "FRENCH:P1": [
      { name: "Grammaire & Conjugaison", order: 1 },
      { name: "Compréhension Écrite", order: 2 },
      { name: "Vocabulaire", order: 3 },
      { name: "Civilisation", order: 4 },
    ],
    "FRENCH:P2": [
      { name: "Rédaction & Expression Écrite", order: 1 },
      { name: "Traduction (Version & Thème)", order: 2 },
      { name: "Littérature", order: 3 },
    ],
    // ── A-Level Special Bilingual Ed. French ──
    "SBE_FR:P1": [
      { name: "Grammaire Approfondie", order: 1 },
      { name: "Compréhension", order: 2 },
      { name: "Expression Écrite", order: 3 },
    ],
    "SBE_FR:P2": [
      { name: "Traduction Avancée", order: 1 },
      { name: "Littérature Francophone", order: 2 },
      { name: "Civilisation & Culture", order: 3 },
    ],
    // ── A-Level History ──
    "HIST:P1": [
      { name: "African Civilizations", order: 1 },
      { name: "Colonialism in Africa", order: 2 },
      { name: "Nationalist Movements", order: 3 },
      { name: "World War I & II", order: 4 },
    ],
    "HIST:P2": [
      { name: "Cameroon History (Pre-colonial)", order: 1 },
      { name: "Cameroon Under German/French/British Rule", order: 2 },
      { name: "Post-Independence Cameroon", order: 3 },
      { name: "International Relations", order: 4 },
    ],
    // ── A-Level Geography ──
    "GEOG:P1": [
      { name: "Physical Geography", order: 1 },
      { name: "Map Reading & Interpretation", order: 2 },
      { name: "Climatology", order: 3 },
      { name: "Geomorphology", order: 4 },
    ],
    "GEOG:P2": [
      { name: "Human Geography", order: 1 },
      { name: "Economic Geography", order: 2 },
      { name: "Regional Geography of Cameroon", order: 3 },
      { name: "Environmental Management", order: 4 },
    ],
    // ── A-Level Religious Studies ──
    "RS:P1": [
      { name: "The Nature of Religion", order: 1 },
      { name: "Christianity", order: 2 },
      { name: "Islam", order: 3 },
      { name: "African Traditional Religion", order: 4 },
    ],
    "RS:P2": [
      { name: "Religious Ethics", order: 1 },
      { name: "Marriage & Family", order: 2 },
      { name: "Human Rights & Social Justice", order: 3 },
      { name: "Religion & Society", order: 4 },
    ],
    // ── A-Level Philosophy ──
    "PHIL:P1": [
      { name: "Epistemology", order: 1 },
      { name: "Metaphysics", order: 2 },
      { name: "Logic & Reasoning", order: 3 },
      { name: "Ethics", order: 4 },
    ],
    "PHIL:P2": [
      { name: "History of Philosophy", order: 1 },
      { name: "Political Philosophy", order: 2 },
      { name: "Philosophy of Mind", order: 3 },
      { name: "Existentialism", order: 4 },
    ],
    // ── A-Level Economics ──
    "ECONS:P1": [
      { name: "Basic Economic Concepts", order: 1 },
      { name: "Demand & Supply", order: 2 },
      { name: "Market Structures", order: 3 },
      { name: "National Income", order: 4 },
      { name: "International Trade", order: 5 },
    ],
    "ECONS:P2": [
      { name: "Money & Banking", order: 1 },
      { name: "Economic Development", order: 2 },
      { name: "Macroeconomic Policy", order: 3 },
      { name: "Public Finance", order: 4 },
    ],
    // ── A-Level Accounting ──
    "ACCT:P1": [
      { name: "Principles of Accounting", order: 1 },
      { name: "Books of Accounts", order: 2 },
      { name: "Trial Balance & Financial Statements", order: 3 },
      { name: "Control Accounts", order: 4 },
    ],
    "ACCT:P2": [
      { name: "Partnership Accounts", order: 1 },
      { name: "Company Accounts", order: 2 },
      { name: "Interpretation of Accounts", order: 3 },
      { name: "Cost & Management Accounting", order: 4 },
    ],

    // ── O-Level Subjects (unchanged, plus new) ──
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
    // ── New O-Level: Citizenship Education ──
    "OL_CITIZEN:P1": [
      { name: "Rights & Responsibilities", order: 1 },
      { name: "Government Structures", order: 2 },
      { name: "The Constitution", order: 3 },
    ],
    "OL_CITIZEN:P2": [
      { name: "Democracy & Governance", order: 1 },
      { name: "Civic Engagement", order: 2 },
      { name: "Cameroon's Political System", order: 3 },
    ],
    // ── New O-Level: Food & Nutrition ──
    "OL_FOOD:P1": [
      { name: "Nutrition & Health", order: 1 },
      { name: "Food Commodities", order: 2 },
      { name: "Food Science", order: 3 },
    ],
    "OL_FOOD:P2": [
      { name: "Meal Planning & Preparation", order: 1 },
      { name: "Food Preservation", order: 2 },
      { name: "Diet & Special Needs", order: 3 },
    ],
    // ── New O-Level: Geology ──
    "OL_GEOL:P1": [
      { name: "Earth Structure", order: 1 },
      { name: "Minerals & Rocks", order: 2 },
      { name: "Plate Tectonics", order: 3 },
    ],
    "OL_GEOL:P2": [
      { name: "Geological Processes", order: 1 },
      { name: "Economic Geology", order: 2 },
      { name: "Field Geology", order: 3 },
    ],
    // ── New O-Level: Human Biology ──
    "OL_HUMAN_BIO:P1": [
      { name: "Cells & Tissues", order: 1 },
      { name: "Skeletal & Muscular Systems", order: 2 },
      { name: "Circulatory & Respiratory Systems", order: 3 },
    ],
    "OL_HUMAN_BIO:P2": [
      { name: "Digestive & Excretory Systems", order: 1 },
      { name: "Nervous & Endocrine Systems", order: 2 },
      { name: "Reproductive System & Health", order: 3 },
    ],
    // ── New O-Level: ICT ──
    "OL_ICT:P1": [
      { name: "Introduction to ICT", order: 1 },
      { name: "Hardware & Software", order: 2 },
      { name: "Networking & Internet", order: 3 },
    ],
    "OL_ICT:P2": [
      { name: "Word Processing & Spreadsheets", order: 1 },
      { name: "Database Concepts", order: 2 },
      { name: "Web Technologies", order: 3 },
    ],
    // ── New O-Level: Logic ──
    "OL_LOGIC:P1": [
      { name: "Propositional Logic", order: 1 },
      { name: "Syllogisms & Deductive Reasoning", order: 2 },
      { name: "Inductive Reasoning", order: 3 },
    ],
    "OL_LOGIC:P2": [
      { name: "Logical Fallacies", order: 1 },
      { name: "Critical Thinking", order: 2 },
      { name: "Problem Solving Strategies", order: 3 },
    ],

    // ── HND (unchanged) ──
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

  // ── Topics: A-Level Commercial subjects ─────────────────
  const alCommercialTopicMap: Record<string, Array<{ name: string; order: number }>> = {
    "AL_ACC:FIN_ACC": [
      { name: "Double Entry System", order: 1 },
      { name: "Final Accounts", order: 2 },
      { name: "Depreciation & Provisions", order: 3 },
      { name: "Incomplete Records", order: 4 },
    ],
    "AL_ACC:COST_MGT": [
      { name: "Cost Classification", order: 1 },
      { name: "Marginal & Absorption Costing", order: 2 },
      { name: "Budgeting", order: 3 },
      { name: "Standard Costing & Variance Analysis", order: 4 },
    ],
    "AL_ACC:CORP_ACC": [
      { name: "Share Capital & Debentures", order: 1 },
      { name: "Company Financial Statements", order: 2 },
      { name: "Consolidated Accounts", order: 3 },
      { name: "Corporate Governance", order: 4 },
    ],
    "AL_ACC:TAXATION": [
      { name: "Principles of Taxation", order: 1 },
      { name: "Income Tax", order: 2 },
      { name: "Value Added Tax", order: 3 },
      { name: "Tax Administration", order: 4 },
    ],
    "AL_ACC:BUS_MATH": [
      { name: "Business Arithmetic", order: 1 },
      { name: "Interest & Annuities", order: 2 },
      { name: "Statistics for Business", order: 3 },
      { name: "Index Numbers", order: 4 },
    ],
    "AL_ACC:ECON": [
      { name: "Demand & Supply Analysis", order: 1 },
      { name: "Market Structures", order: 2 },
      { name: "National Income", order: 3 },
      { name: "Monetary & Fiscal Policy", order: 4 },
    ],
    "AL_ACC:BUS_MGT": [
      { name: "Principles of Management", order: 1 },
      { name: "Organizational Structure", order: 2 },
      { name: "Leadership & Motivation", order: 3 },
      { name: "Strategic Management", order: 4 },
    ],
    "AL_ACC:COMM_FIN": [
      { name: "Trade & Commerce", order: 1 },
      { name: "Financial Institutions", order: 2 },
      { name: "International Trade", order: 3 },
      { name: "Business Finance", order: 4 },
    ],
    "AL_MKT:PROF_MKT": [
      { name: "Marketing Principles", order: 1 },
      { name: "Marketing Mix (4Ps)", order: 2 },
      { name: "Market Research", order: 3 },
      { name: "Consumer Behavior", order: 4 },
    ],
    "AL_MKT:MKT_SKILLS": [
      { name: "Selling Skills", order: 1 },
      { name: "Advertising & Promotion", order: 2 },
      { name: "Brand Management", order: 3 },
      { name: "Public Relations", order: 4 },
    ],
    "AL_MKT:DIGITAL_MKT": [
      { name: "Digital Marketing Channels", order: 1 },
      { name: "Social Media Marketing", order: 2 },
      { name: "SEO & SEM", order: 3 },
      { name: "Email & Content Marketing", order: 4 },
    ],
    "AL_MKT:BUS_MATH": [
      { name: "Business Arithmetic", order: 1 },
      { name: "Statistics for Marketing", order: 2 },
      { name: "Market Analysis", order: 3 },
    ],
    "AL_MKT:ECON": [
      { name: "Demand & Supply", order: 1 },
      { name: "Market Structures", order: 2 },
      { name: "Macroeconomic Indicators", order: 3 },
    ],
    "AL_MKT:BUS_MGT": [
      { name: "Principles of Management", order: 1 },
      { name: "Marketing Management", order: 2 },
      { name: "Organizational Behavior", order: 3 },
    ],
    "AL_MKT:COMM_FIN": [
      { name: "Trade & Commerce", order: 1 },
      { name: "Financial Institutions", order: 2 },
      { name: "International Trade", order: 3 },
    ],
    "AL_MKT:ICT": [
      { name: "ICT Applications in Business", order: 1 },
      { name: "Database Concepts", order: 2 },
      { name: "E-commerce", order: 3 },
    ],
    "AL_SAC:ORG_ADMIN": [
      { name: "Office Organization", order: 1 },
      { name: "Records Management", order: 2 },
      { name: "Administrative Procedures", order: 3 },
      { name: "Human Resource Administration", order: 4 },
    ],
    "AL_SAC:PROF_COMM": [
      { name: "Business Correspondence", order: 1 },
      { name: "Oral Communication", order: 2 },
      { name: "Report Writing", order: 3 },
      { name: "Interpersonal Skills", order: 4 },
    ],
    "AL_SAC:INFO_PROC": [
      { name: "Data Entry & Processing", order: 1 },
      { name: "Word Processing", order: 2 },
      { name: "Spreadsheet Applications", order: 3 },
      { name: "Database Management", order: 4 },
    ],
    "AL_SAC:ICT": [
      { name: "Computer Hardware", order: 1 },
      { name: "Software Applications", order: 2 },
      { name: "Networking Basics", order: 3 },
    ],
    "AL_SAC:PROF_ENG": [
      { name: "English Grammar & Usage", order: 1 },
      { name: "Business Writing", order: 2 },
      { name: "Reading Comprehension", order: 3 },
    ],
    "AL_SAC:LAW": [
      { name: "Elements of Law", order: 1 },
      { name: "Contract Law", order: 2 },
      { name: "Employment Law", order: 3 },
      { name: "Business Law", order: 4 },
    ],
    "AL_SAC:BUS_MATH": [
      { name: "Business Calculations", order: 1 },
      { name: "Statistics", order: 2 },
      { name: "Financial Mathematics", order: 3 },
    ],
    "AL_HEC:CATERING": [
      { name: "Catering Principles", order: 1 },
      { name: "Menu Planning", order: 2 },
      { name: "Food Production", order: 3 },
      { name: "Dietetics", order: 4 },
    ],
    "AL_HEC:RESOURCE_MGT": [
      { name: "Home Resource Management", order: 1 },
      { name: "Family Budgeting", order: 2 },
      { name: "Housing & Interior Design", order: 3 },
      { name: "Time Management", order: 4 },
    ],
    "AL_HEC:FAMILY_ED": [
      { name: "Family Relationships", order: 1 },
      { name: "Child Development", order: 2 },
      { name: "Gerontology", order: 3 },
      { name: "Family Health", order: 4 },
    ],
    "AL_HEC:NAT_SCI": [
      { name: "Basic Chemistry", order: 1 },
      { name: "Basic Biology", order: 2 },
      { name: "Food Science", order: 3 },
    ],
    "AL_HEC:ENTREP": [
      { name: "Entrepreneurial Mindset", order: 1 },
      { name: "Business Planning", order: 2 },
      { name: "Small Business Management", order: 3 },
    ],
    "AL_HEC:PROF_ENG": [
      { name: "English Grammar", order: 1 },
      { name: "Report Writing", order: 2 },
      { name: "Professional Communication", order: 3 },
    ],
    "AL_TIMS:FIN_ACC": [
      { name: "Double Entry & Final Accounts", order: 1 },
      { name: "Company Accounts", order: 2 },
      { name: "Accounting Standards", order: 3 },
    ],
    "AL_TIMS:TAX_PRACTICE": [
      { name: "Tax Principles", order: 1 },
      { name: "Income & Corporate Tax", order: 2 },
      { name: "VAT & Indirect Taxes", order: 3 },
      { name: "Tax Planning", order: 4 },
    ],
    "AL_TIMS:INFO_MGT_SYS": [
      { name: "Information Systems Concepts", order: 1 },
      { name: "Database Design", order: 2 },
      { name: "System Analysis & Design", order: 3 },
      { name: "IT Governance", order: 4 },
    ],
    "AL_TIMS:BUS_MATH": [
      { name: "Business Calculations", order: 1 },
      { name: "Statistics & Data Analysis", order: 2 },
      { name: "Financial Mathematics", order: 3 },
    ],
    "AL_TIMS:ECON": [
      { name: "Microeconomics", order: 1 },
      { name: "Macroeconomics", order: 2 },
      { name: "Taxation & Economics", order: 3 },
    ],
    "AL_TIMS:BUS_MGT": [
      { name: "Management Principles", order: 1 },
      { name: "Strategic Management", order: 2 },
      { name: "Change Management", order: 3 },
    ],
    "AL_TIMS:COMM_FIN": [
      { name: "Trade & Commerce", order: 1 },
      { name: "Financial Markets", order: 2 },
      { name: "International Trade", order: 3 },
    ],
    "AL_TIMS:ENTREP": [
      { name: "Entrepreneurship Principles", order: 1 },
      { name: "Business Planning", order: 2 },
      { name: "Small Business Finance", order: 3 },
    ],
    "AL_TIMS:ICT": [
      { name: "ICT Fundamentals", order: 1 },
      { name: "Database Applications", order: 2 },
      { name: "Information Security", order: 3 },
    ],
    "AL_TOUR:TOURISM_MGT": [
      { name: "Tourism Concepts", order: 1 },
      { name: "Tourism Planning & Development", order: 2 },
      { name: "Sustainable Tourism", order: 3 },
      { name: "Tour Operations", order: 4 },
    ],
    "AL_TOUR:HOSP_MGT": [
      { name: "Hotel Operations", order: 1 },
      { name: "Front Office Management", order: 2 },
      { name: "Food & Beverage Management", order: 3 },
      { name: "Housekeeping Management", order: 4 },
    ],
    "AL_TOUR:TRAVEL_OPS": [
      { name: "Travel Agency Operations", order: 1 },
      { name: "Ticketing & Reservations", order: 2 },
      { name: "Tour Guiding", order: 3 },
    ],
    "AL_TOUR:BUS_MATH": [
      { name: "Business Arithmetic", order: 1 },
      { name: "Statistics for Tourism", order: 2 },
      { name: "Revenue Management", order: 3 },
    ],
    "AL_TOUR:ECON": [
      { name: "Tourism Economics", order: 1 },
      { name: "Demand & Supply", order: 2 },
      { name: "Economic Impact of Tourism", order: 3 },
    ],
    "AL_TOUR:BUS_MGT": [
      { name: "Management Principles", order: 1 },
      { name: "Hospitality Management", order: 2 },
      { name: "Customer Service Management", order: 3 },
    ],
    "AL_TOUR:COMM_FIN": [
      { name: "Commerce in Tourism", order: 1 },
      { name: "Financial Management", order: 2 },
      { name: "International Tourism Finance", order: 3 },
    ],
    "AL_TOUR:ICT": [
      { name: "ICT in Tourism", order: 1 },
      { name: "Online Booking Systems", order: 2 },
      { name: "Digital Marketing for Tourism", order: 3 },
    ],
  };

  // ── Topics: O-Level Commercial subjects ─────────────────
  const olCommercialTopicMap: Record<string, Array<{ name: string; order: number }>> = {
    "OL_ACC_COM:FIN_ACC": [
      { name: "Double Entry Bookkeeping", order: 1 },
      { name: "Cash Book & Bank Reconciliation", order: 2 },
      { name: "Trial Balance & Final Accounts", order: 3 },
    ],
    "OL_ACC_COM:COMMERCE": [
      { name: "Trade & Commerce", order: 1 },
      { name: "Retail & Wholesale", order: 2 },
      { name: "Foreign Trade", order: 3 },
    ],
    "OL_ACC_COM:BUS_MATH": [
      { name: "Basic Arithmetic for Business", order: 1 },
      { name: "Interest & Discount", order: 2 },
      { name: "Profit & Loss Calculations", order: 3 },
    ],
    "OL_ACC_COM:ENG": [
      { name: "Comprehension", order: 1 },
      { name: "Letter & Report Writing", order: 2 },
      { name: "Grammar & Vocabulary", order: 3 },
    ],
    "OL_MKT_COM:PRIN_MKT": [
      { name: "Marketing Concepts", order: 1 },
      { name: "Product & Pricing", order: 2 },
      { name: "Promotion & Distribution", order: 3 },
    ],
    "OL_MKT_COM:COMMERCE": [
      { name: "Trade & Commerce", order: 1 },
      { name: "Retail & Wholesale", order: 2 },
      { name: "Foreign Trade", order: 3 },
    ],
    "OL_MKT_COM:BUS_MATH": [
      { name: "Basic Arithmetic for Business", order: 1 },
      { name: "Market Calculations", order: 2 },
      { name: "Statistics", order: 3 },
    ],
    "OL_MKT_COM:ENG": [
      { name: "Comprehension", order: 1 },
      { name: "Letter & Report Writing", order: 2 },
      { name: "Grammar & Vocabulary", order: 3 },
    ],
    "OL_SAC_COM:SEC_DUTIES": [
      { name: "Office Procedures", order: 1 },
      { name: "Filing & Records Management", order: 2 },
      { name: "Communication in the Office", order: 3 },
    ],
    "OL_SAC_COM:OFFICE_PRAC": [
      { name: "Office Equipment", order: 1 },
      { name: "Typewriting & Word Processing", order: 2 },
      { name: "Meeting & Conference Procedures", order: 3 },
    ],
    "OL_SAC_COM:ENG": [
      { name: "Comprehension", order: 1 },
      { name: "Business Letter Writing", order: 2 },
      { name: "Grammar & Vocabulary", order: 3 },
    ],
    "OL_SAC_COM:COMMERCE": [
      { name: "Trade & Commerce", order: 1 },
      { name: "Retail & Wholesale", order: 2 },
      { name: "Foreign Trade", order: 3 },
    ],
    "OL_HEC_COM:HOME_MGT": [
      { name: "Home Organization", order: 1 },
      { name: "Family Budgeting", order: 2 },
      { name: "Home Safety & First Aid", order: 3 },
    ],
    "OL_HEC_COM:FOOD_NUTR": [
      { name: "Nutrition & Health", order: 1 },
      { name: "Food Preparation", order: 2 },
      { name: "Food Preservation", order: 3 },
    ],
    "OL_HEC_COM:ENG": [
      { name: "Comprehension", order: 1 },
      { name: "Letter & Report Writing", order: 2 },
      { name: "Grammar & Vocabulary", order: 3 },
    ],
    "OL_HEC_COM:MATH": [
      { name: "Arithmetic", order: 1 },
      { name: "Measurement & Budgeting", order: 2 },
      { name: "Data Handling", order: 3 },
    ],
  };

  const allComponents = await prisma.component.findMany({
    include: { program: true },
  });

  for (const comp of allComponents) {
    const key = `${comp.program.code}:${comp.code}`;
    const topics =
      topicMap[key] ||
      alCommercialTopicMap[key] ||
      olCommercialTopicMap[key];
    if (topics) {
      await prisma.topic.createMany({
        data: topics.map((t) => ({
          componentId: comp.id,
          name: t.name,
          order: t.order,
        })),
        skipDuplicates: true,
      });
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
