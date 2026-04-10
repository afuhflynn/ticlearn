import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useChatConversations() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.chatConversations,
    queryFn: api.queries.chat.getConversations,
  });

  return {
    conversations: data?.conversations ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useChatConversation(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.chatConversation(id),
    queryFn: () => api.queries.chat.getConversation(id),
    enabled: !!id,
  });

  return {
    conversation: data?.conversation,
    messages: data?.conversation?.messages ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.mutations.chat.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatConversations });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.mutations.chat.updateConversation(id, { title }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chatConversations });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.chatConversations });
    },
  });
}

export function useAddChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.mutations.chat.addMessage,
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chatConversation(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chatConversations });
    },
  });
}
