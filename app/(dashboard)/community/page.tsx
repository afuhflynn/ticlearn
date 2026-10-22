"use client";

import {
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  Play,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PendingRegion } from "@/components/ui/pending-region";
import { Textarea } from "@/components/ui/textarea";
import {
  useCommunityPosts,
  useCreatePost,
  useLikePost,
  useQuizzes,
} from "@/hooks";
import { useSession } from "@/lib/auth-client";
import {
  CommunityPostListSkeleton,
  PublicQuizGridSkeleton,
} from "./community-skeleton";

type CommunityPost = {
  id: string;
  content: string;
  subject?: string | null;
  createdAt: string;
  isAnnouncement?: boolean;
  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
  user?: {
    name?: string | null;
  };
};

type PublicQuiz = {
  id: string;
  title: string;
  noteTitle: string;
  questionCount: number;
  attemptCount?: number;
  user?: {
    name?: string | null;
  };
};

export default function CommunityPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [newPostContent, setNewPostContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const {
    posts,
    isPending,
    isRefreshing,
    isError: postsError,
    isOffline: postsOffline,
    total,
    refetch: refetchPosts,
  } = useCommunityPosts();
  const {
    quizzes: publicQuizzes,
    isPending: quizzesPending,
    isRefreshing: quizzesRefreshing,
    isError: quizzesError,
    isOffline: quizzesOffline,
    refetch: refetchQuizzes,
  } = useQuizzes("public");
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const publicQuizList = publicQuizzes as PublicQuiz[];
  const communityPosts = posts as CommunityPost[];

  if (sessionPending) {
    return (
      <div className="space-y-8">
        <PublicQuizGridSkeleton />
        <CommunityPostListSkeleton />
      </div>
    );
  }

  const isGuest = !session;

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsCreating(true);
    await createPost.mutateAsync({
      content: newPostContent,
    });
    setNewPostContent("");
    setIsCreating(false);
  };

  const handleLike = async (postId: string) => {
    await likePost.mutateAsync(postId);
  };
  return (
    <div className="space-y-8">
      {isGuest && (
        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center text-sm">
          You're browsing as a guest.{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to create posts, like content, and start mocks.
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Connect with other learners, discover public quizzes, and share
          knowledge.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Public Quizzes</h2>
          {!isGuest && (
            <Button variant="outline" asChild>
              <Link href="/quizzes">View all my quizzes</Link>
            </Button>
          )}
        </div>

        <PendingRegion
          fallback={<PublicQuizGridSkeleton />}
          isError={quizzesError}
          isOffline={quizzesOffline}
          isPending={quizzesPending}
          isRefreshing={quizzesRefreshing}
          label="Public quizzes"
          longWaitMessage="Still loading the public quizzes. This normally takes a moment."
          onRetry={() => void refetchQuizzes()}
        >
          {publicQuizList.length === 0 ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Play className="size-4 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No public quizzes yet</EmptyTitle>
                <EmptyDescription>
                  When a student shares a quiz, it shows up here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {publicQuizList.map((quiz) => (
                <Card key={quiz.id}>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {quiz.noteTitle} • by {quiz.user?.name || "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {quiz.questionCount} questions • {quiz.attemptCount || 0}{" "}
                      attempts
                    </p>
                    {!isGuest && (
                      <Button size="sm" asChild>
                        <Link href={`/quizzes/${quiz.id}`}>
                          <Play className="mr-2 h-4 w-4" />
                          Attempt Quiz
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PendingRegion>
      </div>

      {!isGuest && (
        <Card>
          <CardHeader>
            <CardTitle>Create Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                placeholder="Share your thoughts, ask questions, or help others..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end items-center">
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Posts ({total})</h2>

        <PendingRegion
          fallback={<CommunityPostListSkeleton />}
          isError={postsError}
          isOffline={postsOffline}
          isPending={isPending}
          isRefreshing={isRefreshing}
          label="Community posts"
          longWaitMessage="Still loading the posts. This normally takes a moment."
          onRetry={() => void refetchPosts()}
        >
          {communityPosts.length === 0 ? (
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageSquare className="size-4 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No posts yet</EmptyTitle>
                <EmptyDescription>
                  Be the first to share something!
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            communityPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {post.user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {post.user?.name || "Anonymous"}
                        </span>
                        {post.isAnnouncement && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Announcement
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {post.subject && (
                        <span className="text-xs text-muted-foreground">
                          {post.subject}
                        </span>
                      )}
                      <p className="mt-2">{post.content}</p>
                      <div className="flex gap-4 mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            isGuest
                              ? router.push("/sign-in")
                              : handleLike(post.id)
                          }
                        >
                          <Heart
                            className={`h-4 w-4 mr-1 ${
                              post.isLiked ? "fill-red-500 text-red-500" : ""
                            }`}
                          />
                          {post.likeCount || 0}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {post.commentCount || 0}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </PendingRegion>
      </div>
    </div>
  );
}
