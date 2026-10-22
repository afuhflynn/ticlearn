import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ProcessProgress,
  ProgressLine,
} from "@/components/ui/process-progress";
import { NOTE_STAGES } from "@/lib/note-stages";

vi.mock("motion/react", async () => {
  const actual =
    await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

describe("ProcessProgress", () => {
  it("names the stage that is running and counts the step", () => {
    render(<ProcessProgress stage="SUMMARIZING" steps={NOTE_STAGES} />);

    expect(screen.getAllByText("Writing the summary").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("shows every stage in order", () => {
    render(<ProcessProgress stage="EXTRACTING" steps={NOTE_STAGES} />);

    const stages = screen
      .getAllByRole("listitem")
      .map((item) => item.getAttribute("data-state"));
    expect(stages).toEqual(["running", "waiting", "waiting"]);
  });

  it("keeps the stage it failed in on screen", () => {
    render(<ProcessProgress stage="INDEXING" steps={NOTE_STAGES} failed />);

    expect(screen.getByText("Stopped partway")).toBeInTheDocument();
    const stages = screen
      .getAllByRole("listitem")
      .map((item) => item.getAttribute("data-state"));
    expect(stages).toEqual(["done", "done", "failed"]);
  });

  it("shows zero of the total before the stage is known", () => {
    render(<ProcessProgress stage={null} steps={NOTE_STAGES} />);

    expect(screen.getByText("Getting ready")).toBeInTheDocument();
    expect(screen.getByText("0 of 3")).toBeInTheDocument();
  });

  it("does not report progress for a stage outside the ordered pipeline", () => {
    render(<ProcessProgress stage="UNKNOWN" steps={NOTE_STAGES} />);

    expect(screen.getByText("Getting ready")).toBeInTheDocument();
    expect(screen.getByText("0 of 3")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen
        .getAllByRole("listitem")
        .every((item) => item.getAttribute("data-state") === "waiting"),
    ).toBe(true);
  });

  it("never shows a skeleton for a process", () => {
    const { container } = render(
      <ProcessProgress stage="EXTRACTING" steps={NOTE_STAGES} />,
    );

    expect(container.querySelector("[data-slot='skeleton']")).toBeNull();
  });

  it("reports a real percentage for a known stage", () => {
    const { container } = render(
      <ProcessProgress stage="SUMMARIZING" steps={NOTE_STAGES} />,
    );

    expect(
      container.querySelector("[data-slot='progress-indicator']"),
    ).toHaveStyle("transform: translateX(-33%)");
  });

  it("does not spin the current stage when reduced motion is enabled", () => {
    const { container } = render(
      <ProcessProgress stage="EXTRACTING" steps={NOTE_STAGES} />,
    );

    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});

describe("ProgressLine", () => {
  it("says what is happening and roughly how long it will take", () => {
    render(
      <ProgressLine
        message="Your quiz is still being written."
        estimate="It usually takes about a minute."
      />,
    );

    expect(
      screen.getByText(/Your quiz is still being written\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It usually takes about a minute\./),
    ).toBeInTheDocument();
  });
});
