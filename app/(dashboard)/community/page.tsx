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
import { useEffect, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCommunityPosts,
  useCreatePost,
  useLikePost,
  useQuizzes,
} from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

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

type CommunityBlueprint = {
  id: string;
  name: string;
  description: string | null;
  totalMarks: number;
  durationMin: number;
  sections: Array<{
    name: string;
    questionCount: number;
    questionType: string;
  }>;
  component: { name: string; program: { name: string } };
};

const subjects = [
  "All",
  "Computer Science",
  "ICT",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Human Biology",
  "Additional Mathematics",
  "Pure Mathematics with Mechanics",
  "Pure Mathematics with Statistics",
  "Further Mathematics",
  "English Language",
  "Literature in English",
  "French",
  "History",
  "Geography",
  "Economics",
  "Accounting",
  "Commerce",
  "Religious Studies",
  "Philosophy",
  "Geology",
  "Food Science and Nutrition",
  "Food and Nutrition",
  "Agricultural Science",
  "Citizenship Education",
  "Logic",
];

export default function CommunityPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [newPostContent, setNewPostContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [featuredMocks, setFeaturedMocks] = useState<CommunityBlueprint[]>(
    [],
  );
  const [featuredMocksLoading, setFeaturedMocksLoading] = useState(true);
  const [startingMockId, setStartingMockId] = useState<string | null>(null);

  const subjectFilter = selectedSubject === "All" ? undefined : selectedSubject;
  const { posts, isLoading, total } = useCommunityPosts(subjectFilter);
  const { quizzes: publicQuizzes, isLoading: quizzesLoading } =
    useQuizzes("public");
  const createPost = useCreatePost();
  const likePost = useLikePost();
  const publicQuizList = publicQuizzes as PublicQuiz[];
  const communityPosts = posts as CommunityPost[];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/blueprints/community");
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        if (!cancelled) setFeaturedMocks(data.blueprints ?? []);
      } catch {
        if (!cancelled) setFeaturedMocks([]);
      } finally {
        if (!cancelled) setFeaturedMocksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startFeaturedMock = async (blueprintId: string) => {
    setStartingMockId(blueprintId);
    try {
      const res = await fetch("/api/mocks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      router.push(`/practice/mock/exam/${data.mock.attemptId}`);
    } catch {
      toast.error("Could not start mock. Check onboarding / active profile.");
    } finally {
      setStartingMockId(null);
    }
  };

  if (sessionPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isGuest = !session;

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsCreating(true);
    await createPost.mutateAsync({
      content: newPostContent,
      subject: selectedSubject === "All" ? undefined : selectedSubject,
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
          <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
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
        <h2 className="text-xl font-semibold">
          Featured GCE mock exams{" "}
          <span className="text-muted-foreground text-sm font-normal">
            Paper 1 &amp; 2 — curated blueprints
          </span>
        </h2>

        {featuredMocksLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : featuredMocks.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No community mocks published yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredMocks.map((bp) => (
              <Card key={bp.id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="line-clamp-2 text-lg">
                    {bp.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    {bp.component.program.name} · {bp.component.name}
                  </p>
                  {bp.description ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {bp.description}
                    </p>
                  ) : null}
                  <ul className="text-muted-foreground text-xs space-y-1">
                    {bp.sections.slice(0, 3).map((s, i) => (
                      <li key={`${bp.id}-${i}-${s.name}`}>
                        {s.name}: {s.questionCount} × {s.questionType}
                      </li>
                    ))}
                    {bp.sections.length > 3 ? (
                      <li>+ more sections…</li>
                    ) : null}
                  </ul>
                  {!isGuest && (
                    <Button
                      size="sm"
                      type="button"
                      disabled={startingMockId !== null}
                      onClick={() => startFeaturedMock(bp.id)}
                    >
                      {startingMockId === bp.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Start mock
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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

        {quizzesLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : publicQuizList.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No public quizzes yet.
            </CardContent>
          </Card>
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
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {subjects.map((subject) => (
          <Button
            key={subject}
            variant={selectedSubject === subject ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSubject(subject)}
          >
            {subject}
          </Button>
        ))}
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {selectedSubject !== "All"
                    ? `Posting in: ${selectedSubject}`
                    : "Public post"}
                </span>
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

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : communityPosts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">No posts yet</p>
                <p className="text-sm text-muted-foreground">
                  Be the first to share something!
                </p>
              </div>
            </CardContent>
          </Card>
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
                        onClick={() => isGuest ? router.push("/sign-in") : handleLike(post.id)}
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
      </div>
    </div>
  );
}
