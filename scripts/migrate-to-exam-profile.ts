import { prisma } from "../lib/prisma";

function lookupComponent(programId: string, code: string) {
  return prisma.component.findUnique({
    where: { programId_code: { programId, code } },
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
    const existing = await prisma.component.findUnique({
      where: { programId_code: { programId: program.id, code: "P3" } },
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

  for (const user of users) {
    if (user.activeProfileId) {
      const existingProfile = await prisma.examProfile.findUnique({
        where: { id: user.activeProfileId },
      });
      if (existingProfile) {
        console.log(`      Skipping user ${user.email} — profile already exists.`);
        continue;
      }
    }

    const profile = await prisma.examProfile.create({
      data: {
        userId: user.id,
        programId: unknown.id,
      },
    });
    profilesCreated++;

    await prisma.user.update({
      where: { id: user.id },
      data: { activeProfileId: profile.id },
    });

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
  }

  // Step 5: Map Paper3Source to component (outside user loop — global content)
  console.log(`\n[2/5] Profiles created: ${profilesCreated}`);
  console.log(`[3/5] Attempt rows backfilled: ${attemptsBackfilled}`);

  const csSourcesUpdated = await prisma.paper3Source.updateMany({
    where: { componentId: null, subject: "COMPUTER_SCIENCE" },
    data: { componentId: csP3?.id },
  });
  const ictSourcesUpdated = await prisma.paper3Source.updateMany({
    where: { componentId: null, subject: "ICT" },
    data: { componentId: ictP3?.id },
  });

  // Backfill question componentIds from their sources
  await prisma.$executeRawUnsafe(`
    UPDATE "paper3_questions" q
    SET "component_id" = s."component_id"
    FROM "paper3_sources" s
    WHERE q."source_id" = s."id" AND q."component_id" IS NULL
  `);

  const sourcesMapped = csSourcesUpdated.count + ictSourcesUpdated.count;
  console.log(`[4/5] Sources mapped to components: ${sourcesMapped}`);

  // Verification
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
