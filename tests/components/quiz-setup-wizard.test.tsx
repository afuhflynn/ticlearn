import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizSetupWizard } from "@/components/chat/quiz-setup-wizard";

const getAllMock = vi.hoisted(() => vi.fn());
const wizardGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  api: {
    queries: { notes: { getAll: getAllMock } },
    mutations: { quizzes: { wizardGenerate: wizardGenerateMock } },
  },
}));

const notes = [
  { id: "note-1", title: "Photosynthesis" },
  { id: "note-2", title: "Mitosis" },
];

function props(overrides: Partial<Parameters<typeof QuizSetupWizard>[0]> = {}) {
  return {
    conversationId: "conv-wiz",
    noteId: "note-1",
    noteTitle: "Photosynthesis",
    onReady: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  getAllMock.mockResolvedValue({ notes });
  wizardGenerateMock.mockResolvedValue({
    quiz: { id: "quiz-wiz-1" },
    success: true,
    status: "READY",
  });
});

describe("QuizSetupWizard step 1 (spec 0033, covers: AC-1, AC-2)", () => {
  it("opens at step 1 with numbered topics plus Other plus Skip", async () => {
    render(<QuizSetupWizard {...props()} />);

    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Pick a topic")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Other topic")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /or reply directly/i }),
    ).toBeInTheDocument();
  });

  it("tapping a topic moves to step 2", async () => {
    const user = userEvent.setup();
    render(<QuizSetupWizard {...props()} />);

    await user.click(await screen.findByRole("button", { name: /mitosis/i }));

    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Pick a level and format")).toBeInTheDocument();
  });

  it("typing in the Other box moves the same step forward", async () => {
    const user = userEvent.setup();
    render(<QuizSetupWizard {...props()} />);

    await screen.findByRole("button", { name: /photosynthesis/i });
    await user.type(screen.getByLabelText("Other topic"), "Respiration");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("shows the empty state with an upload link when no notes exist", async () => {
    getAllMock.mockResolvedValue({ notes: [] });
    render(<QuizSetupWizard {...props({ noteId: null, noteTitle: null })} />);

    expect(await screen.findByText(/no notes yet/i)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /upload a note/i });
    expect(link).toHaveAttribute("href", "/upload");
  });
});

describe("QuizSetupWizard steps 2 and 3 (spec 0033, covers: AC-3, AC-4, AC-6)", () => {
  async function atStep2(user: ReturnType<typeof userEvent.setup>) {
    render(<QuizSetupWizard {...props()} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await screen.findByText("Step 2 of 3");
  }

  it("lists the four Cameroon levels and a tap moves to step 3", async () => {
    const user = userEvent.setup();
    await atStep2(user);

    for (const name of [
      /gce a level/i,
      /hnd plus university/i,
      /professional plus certification/i,
      /mixed.*blend/i,
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    await user.click(
      screen.getByRole("button", { name: /hnd plus university/i }),
    );

    expect(await screen.findByText("Step 3 of 3")).toBeInTheDocument();
  });

  it("lists the four count presets with the specced marks", async () => {
    const user = userEvent.setup();
    await atStep2(user);
    await user.click(screen.getByRole("button", { name: /mixed.*blend/i }));

    await screen.findByText("Step 3 of 3");
    expect(screen.getByText(/total around 20 marks/i)).toBeInTheDocument();
    for (const name of [
      /5 questions.*standard.*20 marks/i,
      /5 questions.*hard.*25 marks/i,
      /10 questions.*standard.*40 marks/i,
      /10 questions.*mixed.*45 marks/i,
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("typing a level name in Other moves forward like a tap", async () => {
    const user = userEvent.setup();
    await atStep2(user);

    await user.type(screen.getByLabelText("Other level"), "HND");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByText("Step 3 of 3")).toBeInTheDocument();
  });
});

describe("QuizSetupWizard navigation (spec 0033, covers: AC-5)", () => {
  it("Back returns with the topic kept, Next moves forward again", async () => {
    const user = userEvent.setup();
    render(<QuizSetupWizard {...props()} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await screen.findByText("Step 2 of 3");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Step 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("Skip on step 1 uses the conversation note and Skip on step 2 uses Mixed", async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    render(<QuizSetupWizard {...props({ onReady })} />);
    await screen.findByRole("button", { name: /photosynthesis/i });

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(await screen.findByText("Step 3 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(wizardGenerateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topicText: "Photosynthesis",
        noteId: "note-1",
        levelChoice: "MIXED",
        count: 5,
        difficulty: "STANDARD",
      }),
    );
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith("quiz-wiz-1"));
  });

  it("Next with no topic shows the fixed notice and stays on step 1", async () => {
    const user = userEvent.setup();
    render(<QuizSetupWizard {...props({ noteId: null, noteTitle: null })} />);
    await screen.findByRole("button", { name: /photosynthesis/i });

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      await screen.findByText(/pick or type to continue/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });
});

describe("QuizSetupWizard collapse (spec 0033, covers: AC-7)", () => {
  it("Close collapses to a paused line and Resume restores the step", async () => {
    const user = userEvent.setup();
    render(<QuizSetupWizard {...props()} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await screen.findByText("Step 2 of 3");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(await screen.findByText(/quiz setup paused/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(await screen.findByText("Step 2 of 3")).toBeInTheDocument();
  });

  it("a wizard text event resumes and advances the step", async () => {
    const user = userEvent.setup();
    render(<QuizSetupWizard {...props()} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await screen.findByText("Step 2 of 3");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await screen.findByText(/quiz setup paused/i);

    window.dispatchEvent(
      new CustomEvent("ticlearn:wizard-text", { detail: { text: "HND" } }),
    );

    expect(await screen.findByText("Step 3 of 3")).toBeInTheDocument();
  });
});

describe("QuizSetupWizard submit (spec 0033, covers: AC-8, AC-9)", () => {
  async function atStep3(user: ReturnType<typeof userEvent.setup>) {
    render(<QuizSetupWizard {...props()} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /hnd plus university/i }),
    );
    await screen.findByText("Step 3 of 3");
  }

  it("submits topic plus note plus level plus count and hands the quiz id on", async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    render(<QuizSetupWizard {...props({ onReady })} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /hnd plus university/i }),
    );
    await screen.findByText("Step 3 of 3");

    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(wizardGenerateMock).toHaveBeenCalledWith({
      topicText: "Photosynthesis",
      noteId: "note-1",
      levelChoice: "HND",
      formatChoice: "MCQ plus open",
      count: 5,
      difficulty: "STANDARD",
    });
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith("quiz-wiz-1"));
  });

  it("retries once with 5 when 10 hits a length cutoff", async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    wizardGenerateMock.mockRejectedValueOnce(new Error("length cutoff"));
    wizardGenerateMock.mockResolvedValueOnce({
      quiz: { id: "quiz-retry" },
      success: true,
      status: "READY",
    });
    render(<QuizSetupWizard {...props({ onReady })} />);
    await user.click(
      await screen.findByRole("button", { name: /photosynthesis/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /hnd plus university/i }),
    );
    await screen.findByText("Step 3 of 3");
    await user.type(screen.getByLabelText("Other count"), "10");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    await vi.waitFor(() => expect(onReady).toHaveBeenCalledWith("quiz-retry"));
    expect(wizardGenerateMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ count: 5 }),
    );
  });

  it("shows the cap message verbatim with a retry", async () => {
    const user = userEvent.setup();
    await atStep3(user);
    wizardGenerateMock.mockRejectedValue(
      new Error(
        "Quiz generation limit reached (4). Upgrade to generate more quizzes.",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(
      await screen.findByText(/quiz generation limit reached/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("shows the handoff copy and a full quiz page link on an unknown failure", async () => {
    const user = userEvent.setup();
    await atStep3(user);
    wizardGenerateMock.mockRejectedValue(new Error("socket hang up"));

    await user.click(screen.getByRole("button", { name: "Start quiz" }));

    expect(
      await screen.findByText(/full paper lives on the quiz page/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open full quiz page" }),
    ).toHaveAttribute("href", "/quizzes");
  });
});
