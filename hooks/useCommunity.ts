import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { family, invalidateGroups } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

export function useCommunityPosts(subject?: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.communityPosts, subject],
    queryFn: async () => {
      const result = await api.queries.community.getPosts({ subject });
      return {
        posts: result.posts || [],
        total: result.total || 0,
      };
    },
    ...family("community"),
  });

  return {
    posts: data?.posts || [],
    total: data?.total || 0,
    isLoading,
    error,
  };
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      content: string;
      imageUrl?: string;
      subject?: string;
    }) => {
      const result = await api.mutations.community.createPost(data);
      return result;
    },
    onSuccess: () => {
      void invalidateGroups(queryClient, "community");
      toast.success("Post created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await api.mutations.community.likePost(postId);
      return result;
    },
    onSuccess: () => {
      void invalidateGroups(queryClient, "community");
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await api.mutations.community.deletePost(postId);
      return result;
    },
    onSuccess: () => {
      void invalidateGroups(queryClient, "community");
      toast.success("Post deleted");
    },
  });
}
