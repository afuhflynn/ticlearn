import { prisma } from "../lib/prisma";

function lookupComponent(programId: string, code: string) {
  return prisma.component.findFirstOrThrow({
    where: { programId, code },
  });
}

async function ensureSeedData() {
  const gceAL =
    (await prisma.examLevel.findUnique({ where: { code: "GCE_AL" } })) ||
    (await prisma.examLevel.create({ data: { name: "GCE A-Level", code: "GCE_AL" } }));

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

  const unknown =
    (await prisma.program.findUnique({ where: { code: "UNKNOWN" } })) ||
    (await prisma.program.create({
      data: { examLevelId: gceAL.id, name: "Unknown", code: "UNKNOWN" },
    }));

  const cs =
    (await prisma.program.findUnique({ where: { code: "CS" } })) ||
    (await prisma.program.create({
      data: { examLevelId: gceAL.id, name: "Computer Science", code: "CS" },
    }));

  const ict =
    (await prisma.program.findUnique({ where: { code: "ICT" } })) ||
    (await prisma.program.create({
      data: { examLevelId: gceAL.id, name: "Information & Communication Technology", code: "ICT" },
    }));

  // Create components for each program (skip if already exist)
  for (const program of [cs, ict]) {
    const existing = await prisma.component.findFirst({
      where: { programId: program.id, code: "P3" },
    });
    if (!existing) {
      await prisma.component.createMany({
        data: [
          { programId: program.id, name: "Paper 1", code: "P1", type: "PAPER" },
          { programId: program.id, name: "Paper 2", code: "P2", type: "PAPER" },
          { programId: program.id, name: "Paper 3", code: "P3", type: "PAPER" },
        ],
      });
    }
  }

  const csP3 = await lookupComponent(cs.id, "P3");
  const ictP3 = await lookupComponent(ict.id, "P3");
  const csP1 = await lookupComponent(cs.id, "P1");
  const ictP1 = await lookupComponent(ict.id, "P1");

  return { unknown, cs, ict, csP3, ictP3, csP1, ictP1 };
}

async function migrate() {
  console.log("Phase 0 Migration — Profile-Centric Architecture");
  console.log("================================================");
  console.log("");

  // Step 0: Ensure seed data
  console.log("[0/5] Seeding exam structure...");
  const { unknown, cs, ict, csP3, ictP3 } = await ensureSeedData();
  console.log("      Seed data ready.");

  const users = await prisma.user.findMany({
    include: {
      userStats: true,
      paper3UserStats: true,
    },
  });
  console.log(`[1/5] Found ${users.length} users to migrate.\n`);

  let profilesCreated = 0;
  let attemptsBackfilled = 0;
  let sourcesMapped = 0;

  for (const user of users) {
    // Skip users who already have a profile
    if (user.activeProfileId) {
      const existingProfile = await prisma.examProfile.findUnique({
        where: { id: user.activeProfileId },
      });
      if (existingProfile) {
        console.log(`      Skipping user ${user.email} — profile already exists.`);
        continue;
      }
    }

    // Step 2: Create ExamProfile
    const profile = await prisma.examProfile.create({
      data: {
        userId: user.id,
        examLevelId: (await prisma.examLevel.findUniqueOrThrow({ where: { code: "GCE_AL" } })).id,
        programId: unknown.id,
      },
    });
    profilesCreated++;

    // Step 3: Set activeProfileId
    await prisma.user.update({
      where: { id: user.id },
      data: { activeProfileId: profile.id },
    });

    // Step 4: Backfill examProfileId on attempt models
    const mockBackfill = await prisma.paper3MockAttempt.updateMany({
      where: { userId: user.id, examProfileId: null },
      data: { examProfileId: profile.id },
    });
    const attemptBackfill = await prisma.paper3Attempt.updateMany({
      where: { userId: user.id, examProfileId: null },
      data: { examProfileId: profile.id },
    });
    const qAttemptBackfill = await prisma.paper3QuestionAttempt.updateMany({
      where: { userId: user.id, examProfileId: null },
      data: { examProfileId: profile.id },
    });
    const quizBackfill = await prisma.quizAttempt.updateMany({
      where: { userId: user.id, examProfileId: null },
      data: { examProfileId: profile.id },
    });
    const examBackfill = await prisma.examSession.updateMany({
      where: { userId: user.id, examProfileId: null },
      data: { examProfileId: profile.id },
    });

    // Stats models — just set data field (no FK relation)
    if (user.userStats) {
      await prisma.userStats.update({
        where: { userId: user.id },
        data: { examProfileId: profile.id },
      });
    }
    if (user.paper3UserStats) {
      await prisma.paper3UserStats.update({
        where: { userId: user.id },
        data: { examProfileId: profile.id },
      });
    }

    attemptsBackfilled +=
      mockBackfill.count +
      attemptBackfill.count +
      qAttemptBackfill.count +
      quizBackfill.count +
      examBackfill.count;

    // Step 5: Map Paper3Source to component
    const userSources = await prisma.paper3Source.findMany({
      where: { componentId: null },
      select: { id: true, subject: true },
    });

    for (const source of userSources) {
      const componentId =
        source.subject === "COMPUTER_SCIENCE" ? csP3.id : source.subject === "ICT" ? ictP3.id : null;
      if (!componentId) continue;

      await prisma.paper3Source.update({
        where: { id: source.id },
        data: { componentId },
      });

      // Also backfill componentId on questions from this source
      await prisma.paper3Question.updateMany({
        where: { sourceId: source.id, componentId: null },
        data: { componentId },
      });

      sourcesMapped++;
    }
  }

  console.log(`\n[2/5] Profiles created: ${profilesCreated}`);
  console.log(`[3/5] Attempt rows backfilled: ${attemptsBackfilled}`);
  console.log(`[4/5] Sources mapped to components: ${sourcesMapped}`);

  // Step 5: Verify
  console.log(`\n[5/5] Verification...`);
  const profileCount = await prisma.examProfile.count();
  const userWithProfile = await prisma.user.count({ where: { activeProfileId: { not: null } } });
  const nullMockAttempts = await prisma.paper3MockAttempt.count({ where: { examProfileId: null } });
  const nullSources = await prisma.paper3Source.count({ where: { componentId: null } });

  console.log(`      Total profiles: ${profileCount}`);
  console.log(`      Users with activeProfileId: ${userWithProfile}`);
  console.log(`      Mock attempts without profile: ${nullMockAttempts}`);
  console.log(`      Sources without component: ${nullSources}`);

  if (nullMockAttempts === 0 && userWithProfile === users.length) {
    console.log("\n✅ Migration complete. All users have profiles.");
  } else {
    console.log("\n⚠️  Migration finished with warnings. Review above.");
  }
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
