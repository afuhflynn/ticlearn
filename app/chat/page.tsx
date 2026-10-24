import { ChatLanding } from "@/components/chat/chat-landing";

export default async function ChatLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string; q?: string }>;
}) {
  const { note, q } = await searchParams;
  return <ChatLanding noteId={note ?? null} initialQuestion={q ?? null} />;
}
