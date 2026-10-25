import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UIMessage } from "ai";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ActivityBlock,
  activityFromParts,
} from "@/components/chat/activity-block";

beforeAll(() => {
  globalThis.ResizeObserver = class {
    disconnect() {}
    observe() {}
    unobserve() {}
  } as typeof ResizeObserver;
});

const toolPart = (
  name: string,
  input: Record<string, unknown> = {},
  state = "output-available",
) =>
  ({
    type: `tool-${name}`,
    toolCallId: `call-${name}`,
    state,
    input,
    output: { ok: true },
  }) as unknown as UIMessage["parts"][number];

const sourcePart = (
  title: string,
  url: string,
): UIMessage["parts"][number] =>
  ({
    type: "source-url",
    sourceId: `source-${title}`,
    url,
    title,
  }) as unknown as UIMessage["parts"][number];

const failedPart = (name: string, errorText: string) =>
  ({
    type: `tool-${name}`,
    toolCallId: `call-${name}-failed`,
    state: "output-error",
    input: { query: "exam timetable" },
    errorText,
  }) as unknown as UIMessage["parts"][number];

describe("activityFromParts (covers: AC-1, AC-2, AC-4, AC-24)", () => {
  it("names a step in plain words, never the tool identifier", () => {
    const { steps } = activityFromParts([
      toolPart("webSearch", { query: "coordinate geometry 2023" }),
    ]);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.label).toBe(
      'Searching the web for "coordinate geometry 2023"',
    );
    expect(steps[0]?.label).not.toContain("webSearch");
  });

  it("keeps the suggestReplies tool out of the step list", () => {
    const { steps } = activityFromParts([
      toolPart("webSearch", { query: "photosynthesis" }),
      toolPart("suggestReplies", { questions: ["Explain light reactions"] }),
    ]);

    expect(steps.map((step) => step.name)).toEqual(["webSearch"]);
  });

  it("marks a failed step and keeps its technical text out of the label", () => {
    const { steps } = activityFromParts([
      {
        type: "tool-webSearch",
        toolCallId: "call-failed",
        state: "output-error",
        input: { query: "exam timetable" },
        errorText: "fetch failed",
      } as unknown as UIMessage["parts"][number],
    ]);

    expect(steps[0]?.failed).toBe(true);
    expect(steps[0]?.errorText).toBe("fetch failed");
    expect(steps[0]?.label).toBe('Searching the web for "exam timetable"');
  });

  it("counts sources from source parts only, never from a tool result", () => {
    const { sources } = activityFromParts([
      {
        type: "tool-webSearch",
        toolCallId: "call-1",
        state: "output-available",
        input: { query: "kinematics" },
        output: { results: [{ title: "Kinematics notes", url: "https://x" }] },
      } as unknown as UIMessage["parts"][number],
      {
        type: "source-url",
        sourceId: "source-1",
        url: "https://openstax.org/kinematics",
        title: "Kinematics",
      } as unknown as UIMessage["parts"][number],
    ]);

    expect(sources).toHaveLength(1);
    expect(sources[0]?.title).toBe("Kinematics");
    expect(sources[0]?.url).toBe("https://openstax.org/kinematics");
  });

  it("falls back to the plain label for a tool with no entry", () => {
    const { steps } = activityFromParts([toolPart("brandNewTool")]);

    expect(steps[0]?.label).toBe("Working");
  });
});

describe("the collapsed activity line (covers: AC-1, AC-3)", () => {
  it("names the current step while the answer is in flight", () => {
    render(
      <ActivityBlock
        parts={[toolPart("webSearch", { query: "coordinate geometry 2023" })]}
        status="streaming"
      />,
    );

    const line = screen.getByRole("button", {
      name: 'Searching the web for "coordinate geometry 2023"',
    });

    expect(line).toHaveAttribute("aria-expanded", "false");
    expect(line.textContent).not.toContain("webSearch");
  });

  it("shows the fallback label from the moment send is pressed", () => {
    render(<ActivityBlock parts={[]} status="submitted" />);

    expect(screen.getByRole("button", { name: "Working" })).toBeInTheDocument();
  });

  it("reads Thought for Ns and the source count once the answer finished", () => {
    render(
      <ActivityBlock
        parts={[
          toolPart("webSearch", { query: "kinematics" }),
          sourcePart("Kinematics", "https://openstax.org/kinematics"),
        ]}
        durationMs={3200}
        status="ready"
      />,
    );

    const line = screen.getByRole("button", { name: /Thought for 3s/ });

    expect(line).toHaveTextContent("Read 1 source");
    expect(line).toHaveAttribute("aria-expanded", "false");
  });

  it("pluralises the source count", () => {
    render(
      <ActivityBlock
        parts={[
          sourcePart("Kinematics", "https://openstax.org/kinematics"),
          sourcePart("Dynamics", "https://openstax.org/dynamics"),
        ]}
        durationMs={1000}
        status="ready"
      />,
    );

    expect(screen.getByRole("button", { name: /Thought/ })).toHaveTextContent(
      "Read 2 sources",
    );
  });

  it("shows no duration for a stored conversation", () => {
    render(
      <ActivityBlock
        parts={[toolPart("getUserNotes")]}
        status="ready"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Thought" }),
    ).toBeInTheDocument();
  });

  it("draws nothing once a plain answer finished with no steps", () => {
    const { container } = render(
      <ActivityBlock
        parts={[{ type: "text", text: "Here is the answer" }]}
        status="ready"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe("the expanded activity line (covers: AC-2, AC-4)", () => {
  it("lists the steps in order and the sources as links", async () => {
    const user = userEvent.setup();
    render(
      <ActivityBlock
        parts={[
          toolPart("webSearch", { query: "kinematics" }),
          toolPart("getUserNotes"),
          sourcePart("Kinematics", "https://openstax.org/kinematics"),
        ]}
        durationMs={2000}
        status="ready"
      />,
    );

    const line = screen.getByRole("button", { name: /Thought for 2s/ });
    await user.click(line);

    expect(line).toHaveAttribute("aria-expanded", "true");

    const steps = within(
      screen.getAllByRole("list")[0] as HTMLElement,
    ).getAllByRole("listitem");
    expect(steps[0]).toHaveTextContent('Searching the web for "kinematics"');
    expect(steps[1]).toHaveTextContent("Reading your notes");

    const link = screen.getByRole("link", { name: "Kinematics" });
    expect(link).toHaveAttribute("href", "https://openstax.org/kinematics");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("keeps a failed step in place with a plain sentence and its details", async () => {
    const user = userEvent.setup();
    render(
      <ActivityBlock
        parts={[failedPart("webSearch", "fetch failed: ECONNRESET")]}
        status="ready"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Thought" }));

    expect(
      screen.getByText("Couldn't reach the web. Answering without it."),
    ).toBeInTheDocument();
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    expect(screen.getByText("fetch failed: ECONNRESET")).toBeInTheDocument();
  });

  it("says there are no steps when only sources exist", async () => {
    const user = userEvent.setup();
    render(
      <ActivityBlock
        parts={[sourcePart("Kinematics", "https://openstax.org/kinematics")]}
        status="ready"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Thought/ }));

    expect(screen.getByText("No steps to show.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kinematics" }),
    ).toBeInTheDocument();
  });
});

describe("the activity line and assistive technology (covers: AC-18)", () => {
  it("carries one polite region holding only the current step", () => {
    render(
      <ActivityBlock parts={[toolPart("getUserNotes")]} status="streaming" />,
    );

    const regions = document.querySelectorAll('[aria-live="polite"]');

    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveTextContent("Reading your notes");
  });

  it("hides the ticking clock from assistive technology", () => {
    render(
      <ActivityBlock parts={[toolPart("getUserNotes")]} status="streaming" />,
    );

    expect(screen.getByText("0s")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps no live region once the answer finished", () => {
    render(<ActivityBlock parts={[toolPart("getUserNotes")]} status="ready" />);

    expect(document.querySelector('[aria-live="polite"]')).toBeNull();
  });
});
