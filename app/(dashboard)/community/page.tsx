"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Heart,
  MessageCircle,
  Loader2,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunityPosts, useCreatePost, useLikePost } from "@/hooks";

const subjects = [
  "All",
  "Computer Science",
  "ICT",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
];

export default function CommunityPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [newPostContent, setNewPostContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const subjectFilter = selectedSubject === "All" ? undefined : selectedSubject;
  const { posts, isLoading, total } = useCommunityPosts(subjectFilter);
  const createPost = useCreatePost();
  const likePost = useLikePost();

  if (sessionPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Connect with other learners and share knowledge
        </p>
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

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Posts ({total})</h2>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : posts.length === 0 ? (
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
          posts.map((post: any) => (
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
                        onClick={() => handleLike(post.id)}
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
