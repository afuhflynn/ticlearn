import { ChatLanding } from "@/components/chat/chat-landing";

export default async function ChatLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  return <ChatLanding noteId={note ?? null} />;
}
