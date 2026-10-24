import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { family, invalidateGroups } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";
import { readState } from "@/lib/read-state";

export function useChatConversations() {
  const query = useQuery({
    queryKey: queryKeys.chatConversations,
    queryFn: api.queries.chat.getConversations,
    ...family("chat"),
  });

  return {
    conversations: query.data?.conversations ?? [],
    ...readState(query),
    refetch: query.refetch,
  };
}

export function useMessagesPaginated(conversationId: string) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.chatMessagesPaginated(conversationId),
    queryFn: ({ pageParam }) =>
      api.queries.chat.getMessages(conversationId, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
    // The chat family policy, like every other hook. The chat list needs the
    // previous messages on screen, and that is the one thing it cannot do
    // without a policy.
    ...family("chat"),
  });

  const messages = query.data?.pages.flatMap((page) => page.messages) ?? [];

  return {
    ...query,
    messages,
    conversationInfo: query.data?.pages[0]?.conversation ?? null,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables?: { noteId?: string }) =>
      api.mutations.chat.createConversation(variables?.noteId),
    onSuccess: () => {
      void invalidateGroups(queryClient, "chat", "dashboard");
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.mutations.chat.updateConversation(id, { title }),
    onSuccess: (_, { id }) => {
      void invalidateGroups(queryClient, "chat", "dashboard");
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatConversation(id),
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.mutations.chat.deleteConversation,
    onSuccess: () => {
      void invalidateGroups(queryClient, "chat", "dashboard");
    },
  });
}
