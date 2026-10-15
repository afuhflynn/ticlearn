import { prisma } from "@/lib/prisma";
import { resolveChain } from "@/lib/ai/registry";

async function main() {
  const stamp = Date.now();
  const owner = await prisma.user.create({
    data: {
      name: "Note Owner",
      email: `m2-owner-${stamp}@example.com`,
      emailVerified: true,
    },
  });
  const other = await prisma.user.create({
    data: {
      name: "Other",
      email: `m2-other-${stamp}@example.com`,
      emailVerified: true,
    },
  });

  const note = await prisma.note.create({
    data: {
      userId: owner.id,
      title: "Cell Respiration",
      fileUrl: "https://example.com/resp.pdf",
      fileName: "resp.pdf",
      fileType: "PDF",
      keyPoints: [],
      extractedText:
        "Glycolysis happens in the cytoplasm and splits glucose into two pyruvate molecules, netting two ATP.",
      status: "READY",
    },
  });

  const own = await prisma.chatConversation.create({
    data: { userId: owner.id, title: "About respiration", noteId: note.id },
    select: { id: true, noteId: true },
  });
  console.log("conversation carries the note:", own.noteId === note.id);

  const found = await prisma.chatConversation.findFirst({
    where: { id: own.id, userId: owner.id },
    include: {
      note: {
        select: { id: true, title: true, extractedText: true, userId: true },
      },
    },
  });
  console.log(
    "owner resolves their own note:",
    found?.note?.id === note.id,
    "| text is readable:",
    Boolean(found?.note?.extractedText?.includes("Glycolysis")),
  );

  const stolen = await prisma.chatConversation.findFirst({
    where: { id: own.id, userId: other.id },
    include: { note: { select: { userId: true } } },
  });
  console.log(
    "another student cannot load that conversation:",
    stolen === null,
  );

  const groundable = await prisma.knowledgeChunk.findMany({
    where: { sourceType: "note", sourceId: note.id },
  });
  console.log("note chunks (none written today):", groundable.length);

  const plain = await prisma.chatConversation.create({
    data: { userId: owner.id, title: "General" },
    select: { noteId: true },
  });
  console.log("a general chat has no note:", plain.noteId === null);

  console.log("fast_chat chain:", resolveChain("fast_chat").join(" -> "));
  console.log("quiz_gen chain:", resolveChain("quiz_gen").join(" -> "));

  await prisma.user.delete({ where: { id: owner.id } });
  await prisma.user.delete({ where: { id: other.id } });
  console.log(
    "scratch removed:",
    await prisma.user.count({ where: { email: { contains: `m2-` } } }),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
