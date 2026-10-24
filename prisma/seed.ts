import { hashPassword } from "better-auth/crypto";
import { ensurePlatformSettings } from "../lib/platform-settings";
import { prisma } from "../lib/prisma";

/**
 * Seeds the platform settings row and one demo account whose material is the
 * source of the landing page screenshots (spec 0014, AC-19).
 *
 * The demo note is Operating Systems: Process Scheduling. The Tip conversation
 * quotes page 3 of that note, and the quiz attempt answers the first question
 * right and the second one wrong, so the three screenshots the marketing page
 * shows can be regenerated after any interface change.
 *
 * Sign in with the demo email and password below. The PDF the note points at
 * lives at public/demo/operating-systems-process-scheduling.pdf. The account
 * is created only outside production, or with SEED_DEMO=1 there, since it
 * carries a password published in this file.
 */

const DEMO_EMAIL = "demo@tic.local";
// In production the demo account is an offence the repo publishes the password
// for, so the seed only creates it outside production, or when SEED_DEMO=1
// forces it there.
const DEMO_SEEDED =
  process.env.NODE_ENV !== "production" || process.env.SEED_DEMO === "1";
const DEMO_PASSWORD = "TicLearn2026";
const DEMO_USER_ID = "demo-user-operating-systems";
const DEMO_NOTE_ID = "demo-note-operating-systems";
const DEMO_QUIZ_ID = "demo-quiz-process-scheduling";
const DEMO_ATTEMPT_ID = "demo-attempt-process-scheduling";
const DEMO_CONVERSATION_ID = "demo-conversation-round-robin";

const NOTE_TITLE = "Operating Systems: Process Scheduling";

const EXTRACTED_TEXT = `Operating Systems
Chapter 4: Process Scheduling

4.1 The scheduling problem

A computer with one processor can run only one process at a time. Every other
ready process waits in a queue. The scheduler is the part of the operating
system that decides which process runs next and for how long. Good scheduling
keeps the processor busy, keeps response time short, and treats every process
fairly.

4.2 When the scheduler runs

The scheduler is called when a process moves from running to waiting, when a
process moves from running to ready, when a process moves from waiting to
ready, and when a process terminates. The first and the last of these are
non preemptive: the running process gives up the processor on its own. The
other two are preemptive: the operating system takes the processor away.

4.3 Scheduling criteria

Throughput is the number of processes completed per unit of time. Turnaround
time is the time from submission to completion. Waiting time is the total time
spent in the ready queue. Response time is the time from submission to the
first response. No algorithm optimises all four at once, so every scheduler is
a compromise.

4.4 First come first served

First come first served runs processes in the order they arrive. It is simple
and it never starves a process, but a long job at the front of the queue makes
every short job behind it wait. This is the convoy effect.

4.5 Shortest job first

Shortest job first runs the process with the smallest next CPU burst. It gives
the smallest average waiting time when every burst is known in advance. In
practice the next burst is only an estimate, taken from the length of the
previous bursts.

4.6 Round robin

Round robin gives every ready process a turn in a fixed time slice, called a
quantum. When the slice ends the process goes to the back of the ready queue
and the next process runs. The size of the slice decides how the system feels.

A time slice that is too short turns the processor into a switchboard: too
much time goes to saving and restoring context, and too little to useful work.
A time slice that is too long makes round robin behave like first come first
served, and a student clicking a button waits behind a batch job. A slice of
about ten to one hundred milliseconds is the usual compromise.

4.7 Priority scheduling

Priority scheduling always runs the ready process with the highest priority.
It can starve a low priority process forever. Ageing fixes this by raising the
priority of a waiting process a little on every pass, so no process waits
without end.

4.8 Summary

The scheduler chooses the next process. Preemption lets the system take the
processor back. Throughput, turnaround, waiting and response time pull in
different directions. Round robin protects response time, shortest job first
protects average waiting time, and priority scheduling needs ageing to stay
fair.`;

const SUMMARY =
  "How an operating system chooses which process runs next, from first come first served to round robin, and why the length of a time slice decides whether the machine feels responsive.";

const KEY_POINTS = [
  "The scheduler picks the next process and decides how long it runs.",
  "Preemptive scheduling takes the processor back; non preemptive scheduling waits for the process to give it up.",
  "Throughput, turnaround time, waiting time and response time trade off against each other.",
  "A round robin time slice that is too short wastes time on context switches; one that is too long feels unresponsive.",
];

const QUIZ_QUESTIONS = [
  {
    id: "demo-question-round-robin",
    type: "MCQ" as const,
    question:
      "Which scheduling algorithm gives every ready process a turn in a fixed time slice?",
    options: [
      "First come first served",
      "Round robin",
      "Shortest job first",
      "Priority scheduling",
    ],
    correctAnswer: "Round robin",
    explanation:
      "Round robin gives each ready process a turn for one quantum. When the quantum ends, the process goes to the back of the ready queue.",
  },
  {
    id: "demo-question-blocked",
    type: "MCQ" as const,
    question:
      "A process is waiting for the printer to finish. Which state is it in?",
    options: ["Running", "Ready", "Blocked", "Terminated"],
    correctAnswer: "Blocked",
    explanation:
      "A process waiting for an external event such as a printer is blocked. It moves back to ready when the event completes.",
  },
  {
    id: "demo-question-dispatcher",
    type: "MCQ" as const,
    question: "What does the dispatcher do?",
    options: [
      "It decides which process should run next.",
      "It switches the processor to the process chosen by the scheduler.",
      "It stores the program on disk.",
      "It counts the number of processes in the system.",
    ],
    correctAnswer:
      "It switches the processor to the process chosen by the scheduler.",
    explanation:
      "The scheduler chooses; the dispatcher performs the switch. That switch is the context switch, and it costs time.",
  },
];

const CHAT_QUESTION =
  "Why does the length of the round robin time slice matter?";

const CHAT_ANSWER = `From page 3 of **${NOTE_TITLE}**:

> A time slice that is too short turns the processor into a switchboard: too much time goes to saving and restoring context, and too little to useful work.

The slice is a trade. Shorter slices give every process a turn sooner, so the system feels responsive, but each switch costs time that no process gets back. Longer slices spend less time switching, but a short job can sit behind a long one and the machine feels slow.

Your note settles on ten to one hundred milliseconds as the usual compromise. If an exam asks you to justify a slice, say what it protects: response time on one side, useful work on the other.`;

async function seedDemoAccount() {
  const password = await hashPassword(DEMO_PASSWORD);

  await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "Ariane Nkeng",
      emailVerified: true,
      levelOfStudy: "Year 2",
      onboardingCompleted: true,
      onboardingSkipped: false,
    },
    create: {
      id: DEMO_USER_ID,
      name: "Ariane Nkeng",
      email: DEMO_EMAIL,
      emailVerified: true,
      levelOfStudy: "Year 2",
      onboardingCompleted: true,
      onboardingSkipped: false,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: DEMO_EMAIL },
  });

  await prisma.account.upsert({
    where: { id: "demo-account-operating-systems" },
    update: { password, userId: user.id },
    create: {
      id: "demo-account-operating-systems",
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password,
    },
  });

  // A dedicated demo account, so recreating its material on every seed is
  // safe and keeps the screenshots in step with this file.
  await prisma.quizAttempt.deleteMany({ where: { userId: user.id } });
  await prisma.chatConversation.deleteMany({ where: { userId: user.id } });
  await prisma.quiz.deleteMany({ where: { userId: user.id } });
  await prisma.note.deleteMany({ where: { userId: user.id } });

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // Topics live in their own table and are shared by every note that links
  // them, so create the three this note uses before linking.
  for (const [name, nameSlug] of [
    ["Process scheduling", "process-scheduling"],
    ["Round robin", "round-robin"],
    ["Context switching", "context-switching"],
  ] as const) {
    await prisma.topic.upsert({
      where: { nameSlug },
      update: { name },
      create: { name, nameSlug },
    });
  }

  await prisma.note.create({
    data: {
      id: DEMO_NOTE_ID,
      userId: user.id,
      title: NOTE_TITLE,
      fileUrl: "/demo/operating-systems-process-scheduling.pdf",
      fileName: "operating-systems-process-scheduling.pdf",
      fileType: "PDF",
      status: "READY",
      extractedText: EXTRACTED_TEXT,
      summary: SUMMARY,
      keyPoints: KEY_POINTS,
      createdAt: threeDaysAgo,
      updatedAt: twoDaysAgo,
      topicNotes: {
        create: [
          { topic: { connect: { nameSlug: "process-scheduling" } } },
          { topic: { connect: { nameSlug: "round-robin" } } },
          { topic: { connect: { nameSlug: "context-switching" } } },
        ],
      },
    },
  });

  await prisma.quiz.create({
    data: {
      id: DEMO_QUIZ_ID,
      userId: user.id,
      noteId: DEMO_NOTE_ID,
      noteTitle: NOTE_TITLE,
      title: "Process scheduling check",
      questionCount: QUIZ_QUESTIONS.length,
      status: "READY",
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
      questions: {
        create: QUIZ_QUESTIONS.map((question, index) => ({
          ...question,
          order: index,
        })),
      },
    },
  });

  await prisma.quizAttempt.create({
    data: {
      id: DEMO_ATTEMPT_ID,
      userId: user.id,
      quizId: DEMO_QUIZ_ID,
      quizTitle: "Process scheduling check",
      noteTitle: NOTE_TITLE,
      score: 67,
      totalQuestions: 3,
      correctAnswers: 2,
      completedAt: twoDaysAgo,
      answers: {
        create: [
          {
            questionId: "demo-question-round-robin",
            question: QUIZ_QUESTIONS[0].question,
            userAnswer: "Round robin",
            correctAnswer: "Round robin",
            isCorrect: true,
            explanation: QUIZ_QUESTIONS[0].explanation,
          },
          {
            questionId: "demo-question-blocked",
            question: QUIZ_QUESTIONS[1].question,
            userAnswer: "Ready",
            correctAnswer: "Blocked",
            isCorrect: false,
            explanation: QUIZ_QUESTIONS[1].explanation,
          },
          {
            questionId: "demo-question-dispatcher",
            question: QUIZ_QUESTIONS[2].question,
            userAnswer:
              "It switches the processor to the process chosen by the scheduler.",
            correctAnswer:
              "It switches the processor to the process chosen by the scheduler.",
            isCorrect: true,
            explanation: QUIZ_QUESTIONS[2].explanation,
          },
        ],
      },
    },
  });

  await prisma.chatConversation.create({
    data: {
      id: DEMO_CONVERSATION_ID,
      userId: user.id,
      noteId: DEMO_NOTE_ID,
      title: "Round robin time slice",
      createdAt: threeDaysAgo,
      updatedAt: twoDaysAgo,
      messages: {
        create: [
          {
            userId: user.id,
            role: "user",
            content: CHAT_QUESTION,
            parts: [{ type: "text", text: CHAT_QUESTION }],
            createdAt: threeDaysAgo,
          },
          {
            userId: user.id,
            role: "assistant",
            content: CHAT_ANSWER,
            parts: [{ type: "text", text: CHAT_ANSWER }],
            createdAt: twoDaysAgo,
          },
        ],
      },
    },
  });

  console.log(
    `Demo account seeded: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (note ${DEMO_NOTE_ID}).`,
  );
}

async function main() {
  // Level of study is a plain string on the user, constrained to Year 1
  // through Year 4 in application code, so there is no level table and
  // nothing academic beyond the demo material below.
  await ensurePlatformSettings();
  if (DEMO_SEEDED) {
    await seedDemoAccount();
  } else {
    console.log("Demo account skipped (SEED_DEMO=1 seeds it in production).");
  }
  console.log("Seed complete.");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
