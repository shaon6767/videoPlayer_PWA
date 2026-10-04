"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface Comment {
  _id: string;
  text: string;
  rating: number;
  user: { _id: string; name: string };
  createdAt: string;
}

export function CommentSection({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const commentsQuery = useQuery({
    queryKey: ["comments", videoId],
    queryFn: async () =>
      (await api.get<Comment[]>(`/comments/${videoId}`)).data,
  });
  const comments = commentsQuery.data ?? [];

  const postComment = useMutation({
    mutationFn: async () =>
      (await api.post<Comment>("/comments", { videoId, text, rating })).data,
    onSuccess: (comment) => {
      queryClient.setQueryData<Comment[]>(["comments", videoId], (current) => [
        comment,
        ...(current ?? []),
      ]);
      setText("");
      setError("");
    },
    onError: (cause: unknown) =>
      setError(apiErrorMessage(cause, "Could not post your comment.")),
  });

  const removeComment = useMutation({
    mutationFn: (commentId: string) => api.delete(`/comments/${commentId}`),
    onSuccess: (_response, commentId) => {
      queryClient.setQueryData<Comment[]>(["comments", videoId], (current) =>
        (current ?? []).filter((comment) => comment._id !== commentId),
      );
    },
    onError: (cause: unknown) =>
      setError(apiErrorMessage(cause, "Could not delete this comment.")),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || postComment.isPending) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setError("");
    postComment.mutate();
  }

  return (
    <section className="mt-6">
      <h2 className="mb-3 font-semibold">{comments.length} Comments</h2>
      {commentsQuery.isError && (
        <div role="alert" className="mb-4 flex items-center gap-3 text-sm text-red-600">
          Could not load comments.
          <Button variant="outline" size="sm" onClick={() => commentsQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {commentsQuery.isPending && (
        <p className="mb-4 text-sm text-muted-foreground">Loading comments...</p>
      )}

      <form onSubmit={submit} className="mb-6 flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={user ? "Add a comment" : "Sign in to add a comment"}
          className="rounded border bg-background p-2"
          rows={2}
          maxLength={1000}
          disabled={!user}
        />
        <div className="flex items-center gap-2">
          <label htmlFor="comment-rating" className="sr-only">
            Rating
          </label>
          <select
            id="comment-rating"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="rounded border bg-background p-1"
            disabled={!user}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!user || postComment.isPending}>
            {postComment.isPending ? "Posting..." : "Post"}
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {!commentsQuery.isPending && !commentsQuery.isError && comments.length === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          No comments yet. Be the first to leave a rating.
        </p>
      )}
      <ul className="space-y-4">
        {comments.map((comment) => (
          <li
            key={comment._id}
            className="flex items-start justify-between gap-2"
          >
            <div>
              <p className="text-sm font-medium">
                {comment.user.name} · {"★".repeat(comment.rating)}
              </p>
              <p className="text-sm text-muted-foreground">{comment.text}</p>
            </div>
            {user?.id === comment.user._id && (
              <button
                type="button"
                onClick={() => removeComment.mutate(comment._id)}
                className="shrink-0 text-muted-foreground hover:text-red-600"
                aria-label="Delete comment"
                disabled={removeComment.isPending}
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
