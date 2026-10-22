import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CommunityPostListSkeleton,
  PublicQuizGridSkeleton,
} from "@/app/(dashboard)/community/community-skeleton";
import { LeaderboardListSkeleton } from "@/app/(dashboard)/leaderboard/leaderboard-skeleton";
import { QuizListSkeleton } from "@/app/(dashboard)/quizzes/quizzes-skeleton";
import { NoteListSkeleton } from "@/app/(dashboard)/upload/upload-skeleton";

describe("list loading shapes", () => {
  it("renders the requested number of note cards", () => {
    const { container } = render(<NoteListSkeleton count={4} />);

    expect(
      container.querySelectorAll("[data-slot='note-card-skeleton']"),
    ).toHaveLength(4);
  });

  it("renders the requested number of quiz cards", () => {
    const { container } = render(<QuizListSkeleton count={2} />);

    expect(
      container.querySelectorAll("[data-slot='quiz-card-skeleton']"),
    ).toHaveLength(2);
  });

  it("keeps student and public community shapes separate", () => {
    const { container } = render(
      <>
        <CommunityPostListSkeleton count={3} />
        <PublicQuizGridSkeleton count={2} />
      </>,
    );

    expect(
      container.querySelectorAll("[data-slot='community-post-skeleton']"),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll("[data-slot='public-quiz-card-skeleton']"),
    ).toHaveLength(2);
  });

  it("renders the default leaderboard row count", () => {
    const { container } = render(<LeaderboardListSkeleton />);

    expect(
      container.querySelectorAll("[data-slot='leaderboard-row-skeleton']"),
    ).toHaveLength(5);
  });
});
