/**
 * Dev only fixture seed for the prompt registry full AI pass.
 *
 * Creates (idempotently) a verified ADMIN verify user, an exam profile
 * linked to a seeded GCE A-Level program with a small visible blueprint,
 * and a READY note with preset extracted text, so `/verify-release prompt
 * registry` can drive quiz plus exam plus Paper 3 plus chat through the
 * running app without hand building data.
 *
 * Refuses to run when NODE_ENV is production. Run with:
 *   set -a; source .env; set +a
 *   npx -y tsx scripts/seed-verify-fixture.ts
 */
import { auth } from "@/lib/auth";
import { grantCredits } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

const EMAIL = process.env.VERIFY_FIXTURE_EMAIL ?? "verify.fixture@example.com";
const PASSWORD = process.env.VERIFY_FIXTURE_PASSWORD ?? "verifyPass123";
const BLUEPRINT_NAME = "Verify Fixture Mock";
const NOTE_TITLE = "Verify Fixture Note";

const NOTE_TEXT = `Photosynthesis converts light energy into chemical energy inside chloroplasts. Chlorophyll absorbs red and blue light while reflecting green. The light dependent reactions split water, release oxygen, and produce ATP and NADPH. The Calvin cycle then fixes carbon dioxide into glucose using that stored energy.

Cellular respiration releases the stored energy in mitochondria through glycolysis, the Krebs cycle, and oxidative phosphorylation. Aerobic respiration yields far more ATP per glucose molecule than anaerobic fermentation. Students often confuse where each stage happens, so trace the movement of carbon, oxygen, and energy carriers across both processes.`;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed-verify-fixture refuses to run in production");
  }

  let user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    const signed = await auth.api.signUpEmail({
      body: { name: "Verify Fixture", email: EMAIL, password: PASSWORD },
    });
    user = await prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
    console.log(`user created: ${user.id} (signup ok: ${Boolean(signed)})`);
  } else {
    console.log(`user exists: ${user.id}`);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, role: "ADMIN" },
  });
  const granted = await grantCredits({
    userId: user.id,
    amount: 500,
    type: "BONUS",
    description: "Verify fixture balance for the full AI pass",
    referenceId: "verify-fixture",
  });
  console.log(`fixture credit balance: ${granted.balance}`);

  const program = await prisma.program.findFirst({
    where: { examLevel: { code: "GCE_AL" } },
    include: { components: { take: 5 } },
    orderBy: { code: "asc" },
  });
  if (!program || program.components.length === 0) {
    throw new Error(
      "No seeded GCE A-Level program with components found; run pnpm db:seed first",
    );
  }
  const component =
    program.components.find((c) => c.type === "PAPER") ?? program.components[0];

  let profile = await prisma.examProfile.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!profile) {
    profile = await prisma.examProfile.create({
      data: { userId: user.id, onboardingCompleted: true },
    });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { activeProfileId: profile.id },
  });
  await prisma.examProfileProgram.upsert({
    where: {
      examProfileId_programId: {
        examProfileId: profile.id,
        programId: program.id,
      },
    },
    update: {},
    create: { examProfileId: profile.id, programId: program.id },
  });

  let blueprint = await prisma.examBlueprint.findFirst({
    where: { componentId: component.id, name: BLUEPRINT_NAME },
  });
  if (!blueprint) {
    blueprint = await prisma.examBlueprint.create({
      data: {
        componentId: component.id,
        name: BLUEPRINT_NAME,
        totalMarks: 5,
        durationMin: 30,
        visibleForStudents: true,
      },
    });
  }
  await prisma.blueprintSection.deleteMany({
    where: { blueprintId: blueprint.id },
  });
  await prisma.blueprintSection.create({
    data: {
      blueprintId: blueprint.id,
      name: "Section A",
      questionCount: 5,
      marksPerQuestion: 1,
      totalMarks: 5,
      questionType: "MCQ",
      order: 0,
    },
  });

  const existingNote = await prisma.note.findFirst({
    where: { userId: user.id, title: NOTE_TITLE },
  });
  const note =
    existingNote ??
    (await prisma.note.create({
      data: {
        userId: user.id,
        title: NOTE_TITLE,
        subject: "Biology",
        fileUrl: "fixture://verify-biology",
        fileName: "verify-biology.docx",
        fileType: "WORD",
        extractedText: NOTE_TEXT,
        topics: ["Photosynthesis", "Cellular respiration"],
        keyPoints: ["Chlorophyll absorbs red and blue light"],
        summary: "Photosynthesis stores energy; respiration releases it.",
        status: "READY",
      },
    }));

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        userId: user.id,
        profileId: profile.id,
        program: program.code,
        componentId: component.id,
        blueprintId: blueprint.id,
        noteId: note.id,
      },
      null,
      2,
    ),
  );
  console.log(
    "Next: sign in through the app (or its auth API) with the email above, then drive quiz plus exam plus chat. Space model calls about 15 seconds apart (free tier quota is 5 per minute).",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("seed-verify-fixture failed:", error);
    process.exit(1);
  });
