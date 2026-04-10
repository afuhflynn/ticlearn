import { ChatThread } from "@/components/chat/chat-thread";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return <ChatThread conversationId={conversationId} />;
}
